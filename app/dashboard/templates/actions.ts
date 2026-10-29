"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";
import { sendAutoAck } from "@/lib/google/send-auto-ack";

export async function saveEmailTemplate(input: {
  organizationId: string;
  templateKey: string;
  subject: string;
  body: string;
}) {
  const { supabase, user } = await requireOrgManager(input.organizationId);

  const key = input.templateKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new Error("Template key is required");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (!input.body.trim()) throw new Error("Message body is required");

  const { error } = await supabase.from("email_templates").upsert(
    {
      organization_id: input.organizationId,
      template_key: key,
      subject: input.subject.trim(),
      body: input.body.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,template_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}

export async function deleteEmailTemplate(
  organizationId: string,
  templateKey: string,
) {
  const { supabase } = await requireOrgManager(organizationId);

  if (templateKey === "gmail_auto_ack") {
    throw new Error("Default auto-ack template cannot be deleted");
  }

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("organization_id", organizationId)
    .eq("template_key", templateKey);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}

export async function sendTestAutoAck(
  organizationId: string,
  toEmail: string,
  templateKey = "gmail_auto_ack",
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  try {
    await requireOrgManager(organizationId);

    const recipient = toEmail.trim();
    if (!recipient || !recipient.includes("@")) {
      return { ok: false, error: "Enter a valid test email address." };
    }

    const result = await sendAutoAck({
      organizationId,
      toEmail: recipient,
      firstName: "there",
      templateKey,
      testMode: true,
    });

    if (result.skipped) {
      return { ok: false, error: `Test email skipped: ${result.reason}` };
    }
    if (!result.messageId) {
      return {
        ok: false,
        error: "Gmail accepted the test, but returned no message ID.",
      };
    }

    return { ok: true, messageId: result.messageId };
  } catch (err) {
    console.error("[sendTestAutoAck] failed:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Test email failed. Please try again.",
    };
  }
}
