export const TASK_STATUSES = [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function isActiveStatus(status: string): boolean {
  return status !== "completed" && status !== "cancelled";
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || !isActiveStatus(status)) return false;
  const due = new Date(dueDate + "T23:59:59");
  return due.getTime() < Date.now();
}

export function overdueDays(dueDate: string): number {
  const due = new Date(dueDate + "T23:59:59");
  const ms = Date.now() - due.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
