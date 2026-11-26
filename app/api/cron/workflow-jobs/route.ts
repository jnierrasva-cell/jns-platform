import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resumeRunFromJob } from "@/lib/workflows/runner";

/**
 * Claim and process due workflow_jobs (delays / waits).
 * Auth: Bearer CRON_SECRET
 * Schedule: every 5 minutes (Hobby may coerce; still safe).
 *
 * Lease: locked jobs older than LOCK_TTL_MS are reclaimed as pending
 * (or failed if attempts exceed MAX_ATTEMPTS).
 */
const LOCK_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const workerId = `cron-${Date.now()}`;
  const now = new Date();
  const nowIso = now.toISOString();
  const lockCutoff = new Date(now.getTime() - LOCK_TTL_MS).toISOString();

  // Reclaim stale locks so a crashed worker cannot strand jobs forever.
  const { data: stale } = await admin
    .from("workflow_jobs")
    .select("id, attempts")
    .eq("status", "locked")
    .lt("locked_at", lockCutoff)
    .limit(50);

  let reclaimed = 0;
  let deadLettered = 0;

  for (const job of stale ?? []) {
    const attempts = Number(job.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      const { error } = await admin
        .from("workflow_jobs")
        .update({
          status: "failed",
          error: `Dead-lettered after ${attempts} attempts (stale lock)`,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", job.id)
        .eq("status", "locked");
      if (!error) deadLettered += 1;
    } else {
      const { error } = await admin
        .from("workflow_jobs")
        .update({
          status: "pending",
          locked_at: null,
          locked_by: null,
          error: "Reclaimed after lock timeout",
        })
        .eq("id", job.id)
        .eq("status", "locked");
      if (!error) reclaimed += 1;
    }
  }

  const { data: due } = await admin
    .from("workflow_jobs")
    .select("id, organization_id, run_id, node_id, payload, attempts")
    .eq("status", "pending")
    .lte("run_at", nowIso)
    .order("run_at", { ascending: true })
    .limit(25);

  let processed = 0;
  let failed = 0;

  for (const job of due ?? []) {
    const nextAttempts = (job.attempts as number) + 1;

    const { data: locked, error: lockErr } = await admin
      .from("workflow_jobs")
      .update({
        status: "locked",
        locked_at: nowIso,
        locked_by: workerId,
        attempts: nextAttempts,
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
      const terminal = nextAttempts >= MAX_ATTEMPTS;
      await admin
        .from("workflow_jobs")
        .update({
          status: terminal ? "failed" : "pending",
          error: terminal ? `${msg} (dead-letter after ${nextAttempts})` : msg,
          locked_at: null,
          locked_by: null,
          // Back off a few minutes on retry
          run_at: terminal
            ? nowIso
            : new Date(now.getTime() + Math.min(nextAttempts, 5) * 60 * 1000).toISOString(),
        })
        .eq("id", job.id);
    }
  }

  return NextResponse.json({
    claimed: due?.length ?? 0,
    processed,
    failed,
    reclaimed,
    deadLettered,
  });
}
