import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumeRunFromJob } from "@/lib/workflows/runner";

/**
 * Claim and process due workflow_jobs (delays / waits).
 * Auth: Bearer CRON_SECRET
 * Schedule: every 5 minutes (Hobby may coerce; still safe).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const workerId = `cron-${Date.now()}`;
  const now = new Date().toISOString();

  const { data: due } = await admin
    .from("workflow_jobs")
    .select("id, organization_id, run_id, node_id, payload, attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(25);

  let processed = 0;
  let failed = 0;

  for (const job of due ?? []) {
    const { data: locked, error: lockErr } = await admin
      .from("workflow_jobs")
      .update({
        status: "locked",
        locked_at: now,
        locked_by: workerId,
        attempts: (job.attempts as number) + 1,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (lockErr || !locked) continue;

    try {
      await resumeRunFromJob({
        id: job.id as string,
        run_id: job.run_id as string,
        organization_id: job.organization_id as string,
        node_id: job.node_id as string,
        payload: (job.payload as Record<string, unknown>) ?? {},
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : "Job failed";
      await admin
        .from("workflow_jobs")
        .update({ status: "failed", error: msg })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({
    claimed: due?.length ?? 0,
    processed,
    failed,
  });
}
