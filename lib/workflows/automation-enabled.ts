import { createAdminClient } from "@/lib/supabase/admin";

export const LEGACY_AUTOMATION_KEYS = [
  "email-auto-ack",
  "booking-email-reminders",
  "sms-reminders",
] as const;

export type LegacyAutomationKey = (typeof LEGACY_AUTOMATION_KEYS)[number];

export function isLegacyAutomationKey(key: string): key is LegacyAutomationKey {
  return (LEGACY_AUTOMATION_KEYS as readonly string[]).includes(key);
}

export async function isAutomationEnabled(
  organizationId: string,
  serviceKey: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", organizationId)
    .eq("service_key", serviceKey)
    .maybeSingle();

  if (row?.is_enabled === true) return true;

  const { data: wf } = await admin
    .from("workflows")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("key", serviceKey)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(wf);
}

export async function listOrgIdsWithAutomationEnabled(
  serviceKey: string,
): Promise<string[]> {
  const admin = createAdminClient();

  const [{ data: rows }, { data: wfs }] = await Promise.all([
    admin
      .from("org_automations")
      .select("organization_id")
      .eq("service_key", serviceKey)
      .eq("is_enabled", true),
    admin
      .from("workflows")
      .select("organization_id")
      .eq("key", serviceKey)
      .eq("status", "active")
      .not("organization_id", "is", null),
  ]);

  return [
    ...new Set([
      ...(rows ?? []).map((r) => r.organization_id as string),
      ...(wfs ?? []).map((r) => r.organization_id as string),
    ]),
  ].filter(Boolean);
}

const LEGACY_META: Record<
  LegacyAutomationKey,
  { name: string; description: string; category: string; triggerType: string }
> = {
  "email-auto-ack": {
    name: "Inquiry auto-reply",
    description:
      "When a matching email rule fires, reply from connected Google using a template.",
    category: "Email",
    triggerType: "email.inbound_matched",
  },
  "booking-email-reminders": {
    name: "Booking email confirmations & reminders",
    description:
      "Confirmation on booking create and reminder before start via JNS mail.",
    category: "Email",
    triggerType: "booking.created",
  },
  "sms-reminders": {
    name: "Booking SMS reminders",
    description: "Text clients before a scheduled booking via Twilio.",
    category: "SMS",
    triggerType: "schedule.booking_reminder",
  },
};

export async function syncLegacyWorkflowMirror(input: {
  organizationId: string;
  serviceKey: string;
  enabled: boolean;
}): Promise<void> {
  if (!isLegacyAutomationKey(input.serviceKey)) return;

  const admin = createAdminClient();
  const meta = LEGACY_META[input.serviceKey];

  const { data: existing } = await admin
    .from("workflows")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("key", input.serviceKey)
    .maybeSingle();

  const status = input.enabled ? "active" : "paused";
  const graph = {
    nodes: [
      {
        id: "t1",
        type: "trigger",
        config: { event: meta.triggerType, legacy: true },
      },
      {
        id: "a1",
        type: "action",
        config: {
          action: "legacy.execute",
          params: { service_key: input.serviceKey },
        },
      },
    ],
    edges: [{ from: "t1", to: "a1" }],
  };

  if (existing?.id) {
    await admin
      .from("workflows")
      .update({
        status,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        trigger_type: meta.triggerType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    const { data: latest } = await admin
      .from("workflow_versions")
      .select("version")
      .eq("workflow_id", existing.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    await admin.from("workflow_versions").insert({
      workflow_id: existing.id,
      version: ((latest?.version as number) ?? 0) + 1,
      graph,
    });
    return;
  }

  if (!input.enabled) return;

  const { data: created } = await admin
    .from("workflows")
    .insert({
      organization_id: input.organizationId,
      key: input.serviceKey,
      name: meta.name,
      description: meta.description,
      category: meta.category,
      status: "active",
      trigger_type: meta.triggerType,
      trigger_config: { event: meta.triggerType, legacy: true },
      is_system: true,
      settings: {},
    })
    .select("id")
    .single();

  if (created?.id) {
    await admin.from("workflow_versions").insert({
      workflow_id: created.id,
      version: 1,
      graph,
    });
  }
}
