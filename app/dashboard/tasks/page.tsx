import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";
import { TasksClient } from "@/components/tasks-client";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/account-type");

  const orgId = active.organizationId;
  const isManager = isOrgManagerRole(active.role);
  const admin = createAdminClient();
  const params = await searchParams;

  // Tasks for this org
  const { data: taskRows } = await admin
    .from("tasks")
    .select(
      `
      id, title, description, status, priority,
      start_date, due_date, contact_id, external_url, project_name,
      created_by, created_at, updated_at,
      last_follow_up_at, last_follow_up_by,
      contacts ( id, first_name, last_name, email )
    `,
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500);

  const taskIds = (taskRows ?? []).map((t) => t.id as string);

  // Assignees
  let assigneeRows: {
    task_id: string;
    user_id: string;
  }[] = [];
  if (taskIds.length > 0) {
    const { data } = await admin
      .from("task_assignees")
      .select("task_id, user_id")
      .in("task_id", taskIds);
    assigneeRows = (data ?? []) as typeof assigneeRows;
  }

  // Team members for assignee picker
  const { data: memberRows } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("organization_id", orgId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: profiles } =
    memberIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, first_name, last_name, business_name")
          .in("id", memberIds)
      : { data: [] as { id: string; email: string | null; first_name: string | null; last_name: string | null; business_name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const team = (memberRows ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    const name =
      [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
      p?.business_name ||
      p?.email ||
      "Team member";
    return {
      userId: m.user_id as string,
      role: m.role as string,
      name,
      email: p?.email ?? null,
    };
  });

  // Contacts for related client picker (recent / limited)
  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, email")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(200);

  // Comments for open task (if deep-linked)
  let comments: {
    id: string;
    task_id: string;
    body: string;
    created_by: string | null;
    created_at: string;
  }[] = [];
  let activity: {
    id: string;
    task_id: string;
    actor_id: string | null;
    action: string;
    meta: Record<string, unknown>;
    created_at: string;
  }[] = [];

  const focusTaskId = params.task?.trim() || null;
  if (focusTaskId && taskIds.includes(focusTaskId)) {
    const [commentsRes, activityRes] = await Promise.all([
      admin
        .from("task_comments")
        .select("id, task_id, body, created_by, created_at")
        .eq("task_id", focusTaskId)
        .order("created_at", { ascending: true })
        .limit(100),
      admin
        .from("task_activity")
        .select("id, task_id, actor_id, action, meta, created_at")
        .eq("task_id", focusTaskId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    comments = (commentsRes.data ?? []) as typeof comments;
    activity = (activityRes.data ?? []) as typeof activity;
  }

  const assigneesByTask = new Map<string, string[]>();
  for (const row of assigneeRows) {
    const list = assigneesByTask.get(row.task_id) ?? [];
    list.push(row.user_id);
    assigneesByTask.set(row.task_id, list);
  }

  const tasks = (taskRows ?? []).map((t) => {
    const contactRaw = t.contacts as
      | { id: string; first_name: string | null; last_name: string | null; email: string | null }
      | { id: string; first_name: string | null; last_name: string | null; email: string | null }[]
      | null;
    const contact = Array.isArray(contactRaw) ? contactRaw[0] ?? null : contactRaw;
    return {
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      status: t.status as string,
      priority: t.priority as string,
      startDate: (t.start_date as string | null) ?? null,
      dueDate: (t.due_date as string | null) ?? null,
      contactId: (t.contact_id as string | null) ?? null,
      contact: contact
        ? {
            id: contact.id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
          }
        : null,
      externalUrl: (t.external_url as string | null) ?? null,
      projectName: (t.project_name as string | null) ?? null,
      createdBy: (t.created_by as string | null) ?? null,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
      lastFollowUpAt: (t.last_follow_up_at as string | null) ?? null,
      assigneeIds: assigneesByTask.get(t.id as string) ?? [],
    };
  });

  // Non-managers default to "my" view unless they created unassigned tasks
  const defaultView =
    params.view === "all" || params.view === "my" || params.view === "calendar"
      ? params.view
      : isManager
        ? "all"
        : "my";

  return (
    <TasksClient
      organizationId={orgId}
      isManager={isManager}
      currentUserId={user.id}
      tasks={tasks}
      team={team}
      contacts={(contacts ?? []).map((c) => ({
        id: c.id as string,
        firstName: (c.first_name as string | null) ?? null,
        lastName: (c.last_name as string | null) ?? null,
        email: (c.email as string | null) ?? null,
      }))}
      comments={comments}
      activity={activity}
      focusTaskId={focusTaskId}
      defaultView={defaultView}
    />
  );
}
