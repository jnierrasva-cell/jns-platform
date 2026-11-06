import { NextRequest, NextResponse } from "next/server";
import { syncAllArketaLocations } from "@/lib/arketa/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

/** Allow longer runs for multi-location Arketa → Google sync. */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const admin = createAdminClient();

  try {
    await admin.from("system_cron_runs").upsert(
      {
        job: "arketa-sync",
        last_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job" },
    );
  } catch {
    // table may not exist yet — non-fatal
  }

  log.info("cron-arketa", "started");

  const results = await syncAllArketaLocations();
  const failed = results.filter((r) => r.error);
  const durationMs = Date.now() - started;
  const summary = {
    ok: failed.length === 0,
    count: results.length,
    failed: failed.length,
    durationMs,
    results,
  };

  try {
    await admin.from("system_cron_runs").upsert(
      {
        job: "arketa-sync",
        last_finished_at: new Date().toISOString(),
        last_ok: failed.length === 0,
        last_summary: summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job" },
    );
  } catch {
    // non-fatal
  }

  log.info("cron-arketa", "finished", {
    count: results.length,
    failed: failed.length,
    durationMs,
  });

  return NextResponse.json(summary);
}
