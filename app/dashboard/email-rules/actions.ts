"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireOrgMembership(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return supabase;
}

export async function createEmailRule(input: {
  organizationId: string;
  name: string;
  priority: number;
  fromEmail?: string;
  fromDomain?: string;
  subjectContains?: string;
  onlyNewContact?: boolean;
  action: "auto_ack" | "skip" | "tag_only";
  tag?: string;
}) {
  const supabase = await requireOrgMembership(input.organizationId);

  if (!input.name.trim()) throw new Error("Rule name is required");

  const { error } = await supabase.from("email_rules").insert({
    organization_id: input.organizationId,
    name: input.name.trim(),
    priority: input.priority ?? 100,
    from_email: input.fromEmail?.trim() || null,
    from_domain: input.fromDomain?.trim() || null,
    subject_contains: input.subjectContains?.trim() || null,
    only_new_contact: Boolean(input.onlyNewContact),
    action: input.action,
    tag: input.tag?.trim() || null,
    is_enabled: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/email-rules");
}

export async function setEmailRuleEnabled(ruleId: string, isEnabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: rule } = await supabase
    .from("email_rules")
    .select("organization_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (!rule) throw new Error("Rule not found");
  await requireOrgMembership(rule.organization_id);

  const { error } = await supabase
    .from("email_rules")
    .update({
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/email-rules");
}

export async function deleteEmailRule(ruleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: rule } = await supabase
    .from("email_rules")
    .select("organization_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (!rule) throw new Error("Rule not found");
  await requireOrgMembership(rule.organization_id);

  const { error } = await supabase
    .from("email_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/email-rules");
}