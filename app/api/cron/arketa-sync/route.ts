import { NextRequest, NextResponse } from "next/server";
import { syncAllArketaLocations } from "@/lib/arketa/sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllArketaLocations();

  return NextResponse.json({
    ok: true,
    count: results.length,
    results,
  });
}