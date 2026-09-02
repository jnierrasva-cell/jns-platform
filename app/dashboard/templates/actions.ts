"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveEmailTemplate(
  organizationId: string,
  subject: string,
  body: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!subject.trim()) throw new Error("Subject is required");
  if (!body.trim()) throw new Error("Message body is required");

  const { error } = await supabase.from("email_templates").upsert(
    {
      organization_id: organizationId,
      template_key: "gmail_auto_ack",
      subject: subject.trim(),
      body: body.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,template_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}