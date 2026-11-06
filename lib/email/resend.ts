import { log } from "@/lib/log";

/** Low-level Resend send. Returns ok false on missing config or provider error. */
export async function sendResendEmail(input: {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return { ok: false, error: "Resend is not configured" };
  }

  const recipients = input.to
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (recipients.length === 0) {
    return { ok: false, error: "No valid recipients" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        subject: input.subject,
        text: input.text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error("resend", "send failed", {
        status: response.status,
        body: body.slice(0, 200),
      });
      return { ok: false, error: `Resend ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    log.error("resend", "network error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network error",
    };
  }
}
