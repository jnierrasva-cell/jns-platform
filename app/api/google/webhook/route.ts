import { NextRequest, NextResponse } from "next/server";
import { processGmailNotification } from "@/lib/google/process-notification";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Pub/Sub push wraps the message
    const data = body?.message?.data;
    if (!data || typeof data !== "string") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await processGmailNotification(data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gmail webhook error:", err);
    // Return 200 so Pub/Sub does not retry forever on logic bugs.
    // Change to 500 later if you want retries.
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown_error",
      },
      { status: 200 },
    );
  }
}