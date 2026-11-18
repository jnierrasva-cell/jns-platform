import { sendResendEmail } from "@/lib/email/resend";
import { STATUS_LABELS, PRIORITY_LABELS, type TaskPriority, type TaskStatus } from "@/lib/tasks/types";
import { getApplicationOrigin } from "@/lib/seo";

export async function notifyTaskAssigned(input: {
  toEmails: string[];
  taskId: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  contactLabel?: string | null;
  projectName?: string | null;
  assignerName?: string | null;
  orgName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const origin = getApplicationOrigin();
  const taskUrl = `${origin}/dashboard/tasks?task=${input.taskId}`;
  const lines = [
    input.assignerName
      ? `${input.assignerName} assigned you a task in ${input.orgName || "JNS System"}.`
      : `You have been assigned a task in ${input.orgName || "JNS System"}.`,
    "",
    `Title: ${input.title}`,
    input.description?.trim() ? `Description: ${input.description.trim()}` : null,
    `Priority: ${PRIORITY_LABELS[input.priority]}`,
    `Status: ${STATUS_LABELS[input.status]}`,
    input.dueDate ? `Due: ${input.dueDate}` : null,
    input.contactLabel ? `Related client: ${input.contactLabel}` : null,
    input.projectName ? `Project: ${input.projectName}` : null,
    "",
    `Open task: ${taskUrl}`,
    "",
    "— JNS System",
  ].filter((l) => l !== null);

  const result = await sendResendEmail({
    to: input.toEmails,
    subject: `Task assigned: ${input.title}`,
    text: lines.join("\n"),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function notifyTaskReminder(input: {
  toEmails: string[];
  taskId: string;
  title: string;
  dueDate?: string | null;
  priority: TaskPriority;
  kind: "approaching" | "overdue" | "follow_up";
  orgName?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const origin = getApplicationOrigin();
  const taskUrl = `${origin}/dashboard/tasks?task=${input.taskId}`;

  const subject =
    input.kind === "overdue"
      ? `Overdue task: ${input.title}`
      : input.kind === "follow_up"
        ? `Follow-up: ${input.title}`
        : `Reminder: ${input.title}`;

  const intro =
    input.kind === "overdue"
      ? `This task is overdue${input.dueDate ? ` (due ${input.dueDate})` : ""}.`
      : input.kind === "follow_up"
        ? "You received a follow-up on this task."
        : `This task is due soon${input.dueDate ? ` (${input.dueDate})` : ""}.`;

  const lines = [
    intro,
    "",
    `Title: ${input.title}`,
    `Priority: ${PRIORITY_LABELS[input.priority]}`,
    input.dueDate ? `Due: ${input.dueDate}` : null,
    input.orgName ? `Workspace: ${input.orgName}` : null,
    "",
    `Open task: ${taskUrl}`,
    "",
    "— JNS System",
  ].filter((l) => l !== null);

  const result = await sendResendEmail({
    to: input.toEmails,
    subject,
    text: lines.join("\n"),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
