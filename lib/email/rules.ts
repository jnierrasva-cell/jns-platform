import { createAdminClient } from "@/lib/supabase/admin";

export type EmailRule = {
  id: string;
  organization_id: string;
  name: string;
  is_enabled: boolean;
  priority: number;
  from_email: string | null;
  from_domain: string | null;
  subject_contains: string | null;
  only_new_contact: boolean;
  action: "auto_ack" | "skip" | "tag_only";
  tag: string | null;
  template_key: string | null;
};

export type RuleMatchInput = {
  organizationId: string;
  fromEmail: string;
  subject: string;
  isNewContact: boolean;
};

function domainOf(email: string) {
  const parts = email.toLowerCase().split("@");
  return parts[1] ?? "";
}

function ruleMatches(rule: EmailRule, input: RuleMatchInput) {
  if (!rule.is_enabled) return false;

  if (rule.from_email) {
    if (input.fromEmail.toLowerCase() !== rule.from_email.toLowerCase()) {
      return false;
    }
  }

  if (rule.from_domain) {
    const domain = domainOf(input.fromEmail);
    if (domain !== rule.from_domain.toLowerCase().replace(/^@/, "")) {
      return false;
    }
  }

  if (rule.subject_contains) {
    if (
      !input.subject
        .toLowerCase()
        .includes(rule.subject_contains.toLowerCase())
    ) {
      return false;
    }
  }

  if (rule.only_new_contact && !input.isNewContact) {
    return false;
  }

  return true;
}

/**
 * Loads enabled rules for org (priority asc) and returns the first match.
 * If nothing matches, returns null → caller can use default auto-ack behavior.
 */
export async function findMatchingRule(
  input: RuleMatchInput,
): Promise<EmailRule | null> {
  const supabase = createAdminClient();

  const { data: rules, error } = await supabase
    .from("email_rules")
    .select(
      "id, organization_id, name, is_enabled, priority, from_email, from_domain, subject_contains, only_new_contact, action, tag, template_key",
    )
    .eq("organization_id", input.organizationId)
    .eq("is_enabled", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[email-rules] load failed", error);
    return null;
  }

  for (const rule of (rules ?? []) as EmailRule[]) {
    if (ruleMatches(rule, input)) {
      return rule;
    }
  }

  return null;
}

export async function applyTagToContact(contactId: string, tag: string) {
  const supabase = createAdminClient();
  const cleaned = tag.trim().toLowerCase();
  if (!cleaned) return;

  const { data: contact } = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", contactId)
    .maybeSingle();

  const existing: string[] = contact?.tags ?? [];
  if (existing.includes(cleaned)) return;

  await supabase
    .from("contacts")
    .update({
      tags: [...existing, cleaned],
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);
}