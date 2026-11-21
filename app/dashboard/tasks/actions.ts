"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgMember, requireOrgManager } from "@/lib/org/auth";
import { isOrgManagerRole } from "@/lib/org/roles";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/tasks/types";
import { notifyTaskAssigned, notifyTaskReminder } from "@/lib/tasks/notify";
import { emitDomainEvent } from "@/lib/workflows/events";

function revalidateTasks() {
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

async function logActivity(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    taskId: string;
    organizationId: string;
    actorId: string;
    action: string;
    meta?: Record<string, unknown>;
  },
) {
  await admin.from("task_activity").insert({
    task_id: input.taskId,
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: input.action,
    meta: input.meta ?? {},
  });
}

function parseStatus(value: string): TaskStatus {
  if (TASK_STATUSES.includes(value as TaskStatus)) return value as TaskStatus;
  return "not_started";
}

function parsePriority(value: string): TaskPriority {
  if (TASK_PRIORITIES.includes(value as TaskPriority)) return value as TaskPriority;
  return "medium";
}

export async function createTask(input: {
  organizationId: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  contactId?: string;
  externalUrl?: string;
  projectName?: string;
  assigneeIds?: string[];
}): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const { user, role } = await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Title is required" };
  if (title.length > 200) return { ok: false, error: "Title is too long" };

  const status = parseStatus(input.status ?? "not_started");
  const priority = parsePriority(input.priority ?? "medium");
  const description = input.description?.trim() || null;
  const externalUrl = input.externalUrl?.trim() || null;
  const projectName = input.projectName?.trim() || null;
  const startDate = input.startDate?.trim() || null;
  const dueDate = input.dueDate?.trim() || null;
  const contactId = input.contactId?.trim() || null;

  if (contactId) {
    const { data: contact } = await admin
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();
    if (!contact) return { ok: false, error: "Related client not found" };
  }

  const { data: task, error } = await admin
    .from("tasks")
    .insert({
      organization_id: input.organizationId,
      title,
      description,
      status,
      priority,
      start_date: startDate,
      due_date: dueDate,
      contact_id: contactId,
      external_url: externalUrl,
      project_name: projectName,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) {
    console.error("[createTask]", error);
    return { ok: false, error: "Could not create task" };
  }

  await logActivity(admin, {
    taskId: task.id,
    organizationId: input.organizationId,
    actorId: user.id,
    action: "created",
    meta: { title, status, priority },
  });

  const assigneeIds = Array.from(
    new Set((input.assigneeIds ?? []).filter(Boolean)),
  );

  if (assigneeIds.length > 0) {
    const canAssignOthers = isOrgManagerRole(role);
    let finalIds = assigneeIds;
    if (!canAssignOthers) {
      finalIds = assigneeIds.filter((id) => id === user.id);
    }

    if (finalIds.length > 0) {
      const { data: members } = await admin
        .from("org_members")
        .select("user_id")
        .eq("organization_id", input.organizationId)
        .in("user_id", finalIds);

      const validIds = (members ?? []).map((m) => m.user_id as string);
      if (validIds.length > 0) {
        await admin.from("task_assignees").insert(
          validIds.map((uid) => ({
            task_id: task.id,
            user_id: uid,
            organization_id: input.organizationId,
            assigned_by: user.id,
          })),
        );

        await logActivity(admin, {
          taskId: task.id,
          organizationId: input.organizationId,
          actorId: user.id,
          action: "assigned",
          meta: { user_ids: validIds },
        });

        const notifyIds = validIds.filter((id) => id !== user.id);
        if (notifyIds.length > 0) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("id, email, first_name, last_name")
            .in("id", notifyIds);

          const emails = (profiles ?? [])
            .map((p) => p.email)
            .filter((e): e is string => Boolean(e?.includes("@")));

          if (emails.length > 0) {
            const { data: actor } = await admin
              .from("profiles")
              .select("first_name, last_name, email")
              .eq("id", user.id)
              .maybeSingle();
            const assignerName =
              [actor?.first_name, actor?.last_name].filter(Boolean).join(" ") ||
              actor?.email ||
              null;

            const { data: org } = await admin
              .from("organizations")
              .select("name")
              .eq("id", input.organizationId)
              .maybeSingle();

            let contactLabel: string | null = null;
            if (contactId) {
              const { data: c } = await admin
                .from("contacts")
                .select("first_name, last_name, email")
                .eq("id", contactId)
                .maybeSingle();
              if (c) {
                contactLabel =
                  [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                  c.email ||
                  null;
              }
            }

            await notifyTaskAssigned({
              toEmails: emails,
              taskId: task.id,
              title,
              description,
              priority,
              status,
              dueDate,
              contactLabel,
              projectName,
              assignerName,
              orgName: org?.name ?? null,
            });
          }
        }
      }
    }
  }

  try {
    await emitDomainEvent({
      organizationId: input.organizationId,
      type: "task.created",
      entityType: "task",
      entityId: task.id as string,
      payload: {
        task_id: task.id,
        title,
        description,
        priority,
        status,
        contact_id: contactId,
        due_date: dueDate,
      },
      idempotencyKey: `task.created:${task.id}`,
    });
  } catch (err) {
    console.error("[createTask] workflow emit", err);
  }

  revalidateTasks();
  return { ok: true, taskId: task.id };
}

export async function updateTask(input: {
  organizationId: string;
  taskId: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  startDate?: string | null;
  dueDate?: string | null;
  contactId?: string | null;
  externalUrl?: string | null;
  projectName?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, role } = await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("tasks")
    .select("id, title, status, priority, created_by, contact_id, description, due_date")
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Task not found" };

  const isManager = isOrgManagerRole(role);
  if (!isManager) {
    const { data: assignment } = await admin
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", input.taskId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!assignment && existing.created_by !== user.id) {
      return { ok: false, error: "Not authorized to edit this task" };
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Title is required" };
    updates.title = title;
  }
  if (input.description !== undefined) {
    updates.description = input.description.trim() || null;
  }
  if (input.priority !== undefined) {
    updates.priority = parsePriority(input.priority);
  }
  if (input.status !== undefined) {
    updates.status = parseStatus(input.status);
  }
  if (input.startDate !== undefined) {
    updates.start_date = input.startDate?.trim() || null;
  }
  if (input.dueDate !== undefined) {
    updates.due_date = input.dueDate?.trim() || null;
  }
  if (input.contactId !== undefined) {
    const cid = input.contactId?.trim() || null;
    if (cid) {
      const { data: contact } = await admin
        .from("contacts")
        .select("id")
        .eq("id", cid)
        .eq("organization_id", input.organizationId)
        .maybeSingle();
      if (!contact) return { ok: false, error: "Related client not found" };
    }
    updates.contact_id = cid;
  }
  if (input.externalUrl !== undefined) {
    updates.external_url = input.externalUrl?.trim() || null;
  }
  if (input.projectName !== undefined) {
    updates.project_name = input.projectName?.trim() || null;
  }

  if (!isManager) {
    const allowed: Record<string, unknown> = {
      updated_at: updates.updated_at,
    };
    if (updates.status !== undefined) allowed.status = updates.status;
    Object.keys(updates).forEach((k) => {
      if (!(k in allowed) && k !== "updated_at") delete updates[k];
    });
    if (updates.status === undefined) {
      return { ok: false, error: "You can only update status on assigned tasks" };
    }
  }

  const { error } = await admin
    .from("tasks")
    .update(updates)
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId);

  if (error) {
    console.error("[updateTask]", error);
    return { ok: false, error: "Could not update task" };
  }

  if (updates.status && updates.status !== existing.status) {
    await logActivity(admin, {
      taskId: input.taskId,
      organizationId: input.organizationId,
      actorId: user.id,
      action: "status_changed",
      meta: { from: existing.status, to: updates.status },
    });

    try {
      const eventType =
        updates.status === "completed" ? "task.completed" : "task.updated";
      await emitDomainEvent({
        organizationId: input.organizationId,
        type: eventType,
        entityType: "task",
        entityId: input.taskId,
        payload: {
          task_id: input.taskId,
          title: (updates.title as string) || existing.title,
          status: updates.status,
          previous_status: existing.status,
          contact_id: existing.contact_id,
          description: existing.description,
          due_date: existing.due_date,
          priority: (updates.priority as string) || existing.priority,
        },
        idempotencyKey: `task.status:${input.taskId}:${updates.status}:${Date.now()}`,
      });
    } catch (err) {
      console.error("[updateTask] workflow emit", err);
    }
  } else if (updates.priority && updates.priority !== existing.priority) {
    await logActivity(admin, {
      taskId: input.taskId,
      organizationId: input.organizationId,
      actorId: user.id,
      action: "priority_changed",
      meta: { from: existing.priority, to: updates.priority },
    });
  } else {
    await logActivity(admin, {
      taskId: input.taskId,
      organizationId: input.organizationId,
      actorId: user.id,
      action: "updated",
      meta: { fields: Object.keys(updates).filter((k) => k !== "updated_at") },
    });
  }

  revalidateTasks();
  return { ok: true };
}

export async function setTaskAssignees(input: {
  organizationId: string;
  taskId: string;
  assigneeIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireOrgManager(input.organizationId);
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("id, title, description, priority, status, due_date, contact_id, project_name")
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!task) return { ok: false, error: "Task not found" };

  const nextIds = Array.from(new Set(input.assigneeIds.filter(Boolean)));

  const { data: members } = await admin
    .from("org_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .in("user_id", nextIds.length ? nextIds : ["00000000-0000-0000-0000-000000000000"]);

  const validIds = new Set((members ?? []).map((m) => m.user_id as string));
  const finalIds = nextIds.filter((id) => validIds.has(id));

  const { data: current } = await admin
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", input.taskId);

  const currentIds = new Set((current ?? []).map((r) => r.user_id as string));
  const toAdd = finalIds.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !finalIds.includes(id));

  if (toRemove.length > 0) {
    await admin
      .from("task_assignees")
      .delete()
      .eq("task_id", input.taskId)
      .in("user_id", toRemove);
  }

  if (toAdd.length > 0) {
    await admin.from("task_assignees").insert(
      toAdd.map((uid) => ({
        task_id: input.taskId,
        user_id: uid,
        organization_id: input.organizationId,
        assigned_by: user.id,
      })),
    );

    await logActivity(admin, {
      taskId: input.taskId,
      organizationId: input.organizationId,
      actorId: user.id,
      action: "assigned",
      meta: { user_ids: toAdd },
    });

    const notifyIds = toAdd.filter((id) => id !== user.id);
    if (notifyIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email")
        .in("id", notifyIds);
      const emails = (profiles ?? [])
        .map((p) => p.email)
        .filter((e): e is string => Boolean(e?.includes("@")));

      if (emails.length > 0) {
        const { data: actor } = await admin
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", user.id)
          .maybeSingle();
        const assignerName =
          [actor?.first_name, actor?.last_name].filter(Boolean).join(" ") ||
          actor?.email ||
          null;
        const { data: org } = await admin
          .from("organizations")
          .select("name")
          .eq("id", input.organizationId)
          .maybeSingle();

        await notifyTaskAssigned({
          toEmails: emails,
          taskId: input.taskId,
          title: task.title,
          description: task.description,
          priority: parsePriority(task.priority),
          status: parseStatus(task.status),
          dueDate: task.due_date,
          projectName: task.project_name,
          assignerName,
          orgName: org?.name ?? null,
        });
      }
    }
  }

  if (toRemove.length > 0) {
    await logActivity(admin, {
      taskId: input.taskId,
      organizationId: input.organizationId,
      actorId: user.id,
      action: "unassigned",
      meta: { user_ids: toRemove },
    });
  }

  revalidateTasks();
  return { ok: true };
}

export async function deleteTask(input: {
  organizationId: string;
  taskId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireOrgManager(input.organizationId);
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("id, title")
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!task) return { ok: false, error: "Task not found" };

  await logActivity(admin, {
    taskId: input.taskId,
    organizationId: input.organizationId,
    actorId: user.id,
    action: "deleted",
    meta: { title: task.title },
  });

  const { error } = await admin
    .from("tasks")
    .delete()
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId);

  if (error) {
    console.error("[deleteTask]", error);
    return { ok: false, error: "Could not delete task" };
  }

  revalidateTasks();
  return { ok: true };
}

export async function addTaskComment(input: {
  organizationId: string;
  taskId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Comment cannot be empty" };
  if (body.length > 5000) return { ok: false, error: "Comment is too long" };

  const { data: task } = await admin
    .from("tasks")
    .select("id")
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!task) return { ok: false, error: "Task not found" };

  const { error } = await admin.from("task_comments").insert({
    task_id: input.taskId,
    organization_id: input.organizationId,
    body,
    created_by: user.id,
  });

  if (error) {
    console.error("[addTaskComment]", error);
    return { ok: false, error: "Could not add comment" };
  }

  await logActivity(admin, {
    taskId: input.taskId,
    organizationId: input.organizationId,
    actorId: user.id,
    action: "comment",
    meta: { preview: body.slice(0, 120) },
  });

  revalidateTasks();
  return { ok: true };
}

export async function sendTaskFollowUp(input: {
  organizationId: string;
  taskId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireOrgManager(input.organizationId);
  const admin = createAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("id, title, priority, due_date, status, last_follow_up_at")
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!task) return { ok: false, error: "Task not found" };
  if (task.status === "completed" || task.status === "cancelled") {
    return { ok: false, error: "Cannot follow up on a closed task" };
  }

  if (task.last_follow_up_at) {
    const last = new Date(task.last_follow_up_at).getTime();
    if (Date.now() - last < 2 * 60 * 1000) {
      return { ok: false, error: "Follow-up was just sent. Wait a moment." };
    }
  }

  const { data: assignees } = await admin
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", input.taskId);

  const userIds = (assignees ?? []).map((a) => a.user_id as string);
  if (userIds.length === 0) {
    return { ok: false, error: "No assignees to notify" };
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emails = (profiles ?? [])
    .map((p) => p.email)
    .filter((e): e is string => Boolean(e?.includes("@")));

  if (emails.length === 0) {
    return { ok: false, error: "Assignees have no email addresses" };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const result = await notifyTaskReminder({
    toEmails: emails,
    taskId: input.taskId,
    title: task.title,
    dueDate: task.due_date,
    priority: parsePriority(task.priority),
    kind: "follow_up",
    orgName: org?.name ?? null,
  });

  if (!result.ok) {
    return { ok: false, error: result.error || "Could not send follow-up" };
  }

  await admin
    .from("tasks")
    .update({
      last_follow_up_at: new Date().toISOString(),
      last_follow_up_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.taskId)
    .eq("organization_id", input.organizationId);

  await logActivity(admin, {
    taskId: input.taskId,
    organizationId: input.organizationId,
    actorId: user.id,
    action: "follow_up",
    meta: {},
  });

  revalidateTasks();
  return { ok: true };
}
