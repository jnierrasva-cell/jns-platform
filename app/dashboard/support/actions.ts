"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";

const SUPPORT_EMAIL = "support@jnsystem.app";

export async function sendSupportFeedback(
  subject: string,
  message: string,
  pagePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    typeof subject !== "string" ||
    typeof message !== "string" ||
    typeof pagePath !== "string"
  ) {
    return { ok: false, error: "Invalid feedback." };
  }

  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (!cleanSubject || cleanSubject.length > 160) {
    return {
      ok: false,
      error: "Enter a subject that is no more than 160 characters.",
    };
  }
  if (!cleanMessage || cleanMessage.length > 10_000) {
    return {
      ok: false,
      error: "Enter a message that is no more than 10,000 characters.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Please sign in again before sending feedback." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error("Support feedback email is missing Resend configuration.");
    return {
      ok: false,
      error: "Feedback sending is not available right now. Please try again later.",
    };
  }

  const activeOrg = await getActiveOrg();
  if (!activeOrg) {
    return {
      ok: false,
      error: "Could not identify your workspace. Refresh the page and try again.",
    };
  }

  const safePagePath =
    pagePath.startsWith("/") && !pagePath.startsWith("//")
      ? pagePath.slice(0, 500)
      : "Unknown";
  const text = [
    cleanMessage,
    "",
    "—",
    `Account email: ${user.email ?? "(not available)"}`,
    `Workspace: ${activeOrg.orgName}`,
    `Page: ${safePagePath}`,
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [SUPPORT_EMAIL],
        ...(user.email ? { reply_to: user.email } : {}),
        subject: `[JNS Feedback] ${cleanSubject}`,
        text,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Could not reach Resend to send support feedback.", error);
    return {
      ok: false,
      error: "Could not send feedback right now. Please try again later.",
    };
  }

  if (!response.ok) {
    const responseBody = await response.text();
    let providerError = responseBody.slice(0, 500);
    try {
      const parsed = JSON.parse(responseBody) as {
        message?: unknown;
        name?: unknown;
      };
      providerError = [parsed.name, parsed.message]
        .filter((value): value is string => typeof value === "string")
        .join(": ")
        .slice(0, 500);
    } catch {
      // Keep a bounded response excerpt when the provider does not return JSON.
    }

    console.error("Resend rejected support feedback.", {
      status: response.status,
      error: providerError || "No error details returned",
    });
    return {
      ok: false,
      error: "Could not send feedback right now. Please try again later.",
    };
  }

  return { ok: true };
}
