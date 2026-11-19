import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTaskReminder } from "@/lib/tasks/notify";
import { isActiveStatus } from "@/lib/tasks/types";

/**
 * Daily task reminders:
 * - approaching: due within the next 24 hours (not yet completed)
 * - overdue: due date has passed
 *
 * Auth: Bearer CRON_SECRET (same pattern as booking email reminders).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  // Approaching: due today or tomorrow
  const { data: approaching } = await admin
    .from("tasks")
    .select("id, organization_id, title, priority, due_date, status")
    .in("status", ["not_started", "in_progress", "on_hold"])
    .gte("due_date", today)
    .lte("due_date", tomorrow)
    .limit(200);

  // Overdue: due before today
  const { data: overdue } = await admin
    .from("tasks")
    .select("id, organization_id, title, priority, due_date, status")
    .in("status", ["not_started", "in_progress", "on_hold"])
    .lt("due_date", today)
    .limit(200);

  let sent = 0;
  let skipped = 0;

  async function processBatch(
    rows: typeof approaching,
    kind: "approaching" | "overdue",
  ) {
    for (const task of rows ?? []) {
      if (!isActiveStatus(task.status as string)) {
        skipped += 1;
        continue;
      }

      const { data: assignees } = await admin
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", task.id);

      const userIds = (assignees ?? []).map((a) => a.user_id as string);
      if (userIds.length === 0) {
        skipped += 1;
        continue;
      }

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emails = (profiles ?? [])
        .map((p) => p.email)
        .filter((e): e is string => Boolean(e?.includes("@")));

      if (emails.length === 0) {
        skipped += 1;
        continue;
      }

      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", task.organization_id)
        .maybeSingle();

      const result = await notifyTaskReminder({
        toEmails: emails,
        taskId: task.id as string,
        title: task.title as string,
        dueDate: (task.due_date as string) ?? null,
        priority: (task.priority as "low" | "medium" | "high") ?? "medium",
        kind,
        orgName: org?.name ?? null,
      });

      if (result.ok) sent += 1;
      else skipped += 1;
    }
  }

  await processBatch(approaching, "approaching");
  await processBatch(overdue, "overdue");

  return NextResponse.json({ sent, skipped });
}
