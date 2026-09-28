"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAutoAck } from "@/lib/google/send-auto-ack";

async function requireMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user };
}

export async function saveEmailTemplate(input: {
  organizationId: string;
  templateKey: string;
  subject: string;
  body: string;
}) {
  const { supabase, user } = await requireMember(input.organizationId);

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
  const { supabase } = await requireMember(organizationId);

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
) {
  await requireMember(organizationId);

  const result = await sendAutoAck({
    organizationId,
    toEmail: toEmail.trim(),
    firstName: "there",
    templateKey,
  });

  if (result.skipped) {
    throw new Error(`Skipped: ${result.reason}`);
  }

  return { messageId: result.messageId };
}