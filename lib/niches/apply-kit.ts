import { createAdminClient } from "@/lib/supabase/admin";
import {
  isNicheKey,
  labelMapForKit,
  NICHE_KITS,
  type NicheKey,
} from "@/lib/niches/kits";
import { ensureDefaultAutoAckTemplate } from "@/lib/email/ensure-default-template";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/**
 * Apply a niche starter kit to a new (or empty) workspace.
 * - Sets organizations.niche + label_map
 * - Replaces pipeline stages when org has none (or forceReplaceStages)
 * - Creates kit forms when org has no forms yet
 * - Seeds gmail_auto_ack from kit reply template (inbox loop)
 * - Enables booking-email-reminders automation (zero setup)
 */
export async function applyNicheKit(
  organizationId: string,
  niche: NicheKey | string,
  options?: { forceReplaceStages?: boolean },
): Promise<{ ok: true; niche: NicheKey } | { ok: false; error: string }> {
  const key: NicheKey = isNicheKey(niche) ? niche : "general";
  const kit = NICHE_KITS[key];
  const admin = createAdminClient();

  const labelMap = labelMapForKit(kit);

  const { error: orgError } = await admin
    .from("organizations")
    .update({
      niche: key,
      label_map: labelMap,
    })
    .eq("id", organizationId);

  if (orgError) {
    console.error("[applyNicheKit] org update failed:", orgError.message);
  }

  // Pipeline stages
  const { count: stageCount } = await admin
    .from("pipeline_stages")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if ((stageCount ?? 0) === 0 || options?.forceReplaceStages) {
    if (options?.forceReplaceStages && (stageCount ?? 0) > 0) {
      await admin
        .from("pipeline_stages")
        .delete()
        .eq("organization_id", organizationId);
    }

    const rows = kit.pipeline.map((s) => ({
      organization_id: organizationId,
      name: s.name,
      slug: s.slug,
      position: s.position,
      is_won: s.is_won,
      is_lost: s.is_lost,
    }));

    const { error: stageError } = await admin
      .from("pipeline_stages")
      .insert(rows);

    if (stageError) {
      console.error("[applyNicheKit] stages failed:", stageError.message);
      return { ok: false, error: stageError.message };
    }
  }

  // Forms — only if none exist yet
  const { count: formCount } = await admin
    .from("intake_forms")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if ((formCount ?? 0) === 0) {
    for (const form of kit.forms) {
      let slug = slugify(form.name) || "form";
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const { error: formError } = await admin.from("intake_forms").insert({
        organization_id: organizationId,
        name: form.name,
        slug,
        is_published: true,
        success_message:
          form.success_message ||
          "Thanks — we received your submission and will be in touch.",
        headline: form.headline ?? null,
        description: form.description ?? null,
        fields: form.fields,
      });

      if (formError) {
        console.error("[applyNicheKit] form insert failed:", formError.message);
      }
    }
  }

  // Default auto-ack template (inbox loop) — do not overwrite if present
  const reply = kit.replyTemplates?.[0];
  try {
    await ensureDefaultAutoAckTemplate(organizationId, {
      subject: reply?.subject,
      body: reply?.body,
    });
  } catch (err) {
    console.error("[applyNicheKit] template seed failed:", err);
  }

  // Zero-setup booking email reminders ON by default
  await admin.from("org_automations").upsert(
    {
      organization_id: organizationId,
      service_key: "booking-email-reminders",
      is_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,service_key" },
  );

  await admin.from("org_automation_settings").upsert(
    {
      organization_id: organizationId,
      service_key: "booking-email-reminders",
      settings: {
        hours_before: 24,
        send_confirmation: true,
        send_reminder: true,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,service_key" },
  );

  return { ok: true, niche: key };
}
