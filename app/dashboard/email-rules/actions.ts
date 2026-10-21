"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgManager } from "@/lib/org/auth";
import { assertEmailRules } from "@/lib/billing/org-plan";

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
  templateKey?: string;
}) {
  await requireOrgManager(input.organizationId);
  await assertEmailRules(input.organizationId);

  if (!input.name.trim()) throw new Error("Rule name is required");

  const admin = createAdminClient();

  const { error } = await admin.from("email_rules").insert({
    organization_id: input.organizationId,
    name: input.name.trim(),
    priority: Number.isFinite(input.priority) ? input.priority : 100,
    from_email: input.fromEmail?.trim() || null,
    from_domain: input.fromDomain?.trim().toLowerCase() || null,
    subject_contains: input.subjectContains?.trim() || null,
    only_new_contact: Boolean(input.onlyNewContact),
    action: input.action,
    tag: input.tag?.trim() || null,
    template_key:
      input.action === "auto_ack"
        ? input.templateKey?.trim() || "gmail_auto_ack"
        : null,
    is_enabled: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/email-rules");
}

export async function setEmailRuleEnabled(ruleId: string, isEnabled: boolean) {
  const admin = createAdminClient();

  const { data: rule } = await admin
    .from("email_rules")
    .select("organization_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (!rule) throw new Error("Rule not found");
  await requireOrgManager(rule.organization_id);
  if (isEnabled) await assertEmailRules(rule.organization_id);

  const { error } = await admin
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
  const admin = createAdminClient();

  const { data: rule } = await admin
    .from("email_rules")
    .select("organization_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (!rule) throw new Error("Rule not found");
  await requireOrgManager(rule.organization_id);

  const { error } = await admin.from("email_rules").delete().eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/email-rules");
}