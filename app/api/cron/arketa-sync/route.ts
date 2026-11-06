import { NextRequest, NextResponse } from "next/server";
import { syncAllArketaLocations } from "@/lib/arketa/sync";

/** Allow longer runs for multi-location Arketa → Google sync (Pro plan). */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const results = await syncAllArketaLocations();
  const failed = results.filter((r) => r.error);

  return NextResponse.json({
    ok: failed.length === 0,
    count: results.length,
    failed: failed.length,
    durationMs: Date.now() - started,
    results,
  });
}
