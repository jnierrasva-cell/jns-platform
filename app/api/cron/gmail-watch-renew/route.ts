import { NextRequest, NextResponse } from "next/server";
import { renewExpiringGmailWatches } from "@/lib/google/watch";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await renewExpiringGmailWatches(48);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/gmail-watch-renew]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "renew_failed",
      },
      { status: 500 },
    );
  }
}
