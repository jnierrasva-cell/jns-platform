import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { addOneMonth } from "@/lib/billing/plans";

function variantToPlan(variantId: string | number | undefined): string | null {
  const id = String(variantId ?? "");
  if (id && id === process.env.LEMONSQUEEZY_VARIANT_STARTER) return "starter";
  if (id && id === process.env.LEMONSQUEEZY_VARIANT_PRO) return "pro";
  if (id && id === process.env.LEMONSQUEEZY_VARIANT_BUSINESS) return "business";
  return null;
}

function mapLsStatus(status: string | undefined): string {
  switch (status) {
    case "active":
      return "active";
    case "on_trial":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return status || "none";
  }
}

function stableEventId(payload: {
  meta?: { event_name?: string; event_id?: string; webhook_id?: string };
  data?: { id?: string; attributes?: Record<string, unknown> };
}): string {
  // Prefer provider event id when present; otherwise hash event+sub+status+period.
  const explicit =
    payload.meta?.event_id ||
    payload.meta?.webhook_id ||
    (payload as { meta?: { custom_data?: { event_id?: string } } }).meta
      ?.custom_data?.event_id;
  if (explicit) return String(explicit);

  const attrs = payload.data?.attributes || {};
  const material = [
    payload.meta?.event_name || "",
    payload.data?.id || "",
    String(attrs.status ?? ""),
    String(attrs.renews_at ?? ""),
    String(attrs.ends_at ?? ""),
    String(attrs.updated_at ?? ""),
  ].join("|");

  return crypto.createHash("sha256").update(material).digest("hex").slice(0, 40);
}

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-signature") || "";

  const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (digest !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    meta?: {
      event_name?: string;
      event_id?: string;
      webhook_id?: string;
      custom_data?: {
        organization_id?: string;
        plan?: string;
        event_id?: string;
      };
    };
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        variant_id?: number | string;
        customer_id?: number | string;
        renews_at?: string | null;
        ends_at?: string | null;
        trial_ends_at?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      };
    };
  };

  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.meta?.event_name || "";
  const attrs = payload.data?.attributes || {};
  const custom = payload.meta?.custom_data || {};
  const organizationId = custom.organization_id;
  const subscriptionId = payload.data?.id ? String(payload.data.id) : null;
  const eventId = stableEventId(payload);

  const relevant = [
    "subscription_created",
    "subscription_updated",
    "subscription_cancelled",
    "subscription_expired",
    "subscription_resumed",
  ];
  if (!relevant.includes(event)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  if (!organizationId) {
    console.error("[ls-webhook] missing organization_id", event);
    return NextResponse.json({ ok: true, skipped: "no org" });
  }

  const admin = createAdminClient();

  // Dedupe: if we already processed this event, ack without rewriting billing.
  const { data: existingEvent } = await admin
    .from("billing_webhook_events")
    .select("id")
    .eq("provider", "lemon_squeezy")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Verify workspace exists
  const { data: org } = await admin
    .from("organizations")
    .select("id, plan_updated_at, ls_subscription_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) {
    console.error("[ls-webhook] unknown organization", organizationId);
    return NextResponse.json({ ok: true, skipped: "unknown org" });
  }

  // Reject clearly stale subscription updates when provider updated_at is older
  // than the last plan_updated_at we applied for the same subscription.
  const providerUpdatedRaw =
    attrs.updated_at || attrs.renews_at || attrs.ends_at || null;
  const providerUpdatedMs = providerUpdatedRaw
    ? new Date(providerUpdatedRaw).getTime()
    : NaN;
  const lastAppliedMs = org.plan_updated_at
    ? new Date(org.plan_updated_at).getTime()
    : 0;

  if (
    subscriptionId &&
    org.ls_subscription_id &&
    subscriptionId === org.ls_subscription_id &&
    !Number.isNaN(providerUpdatedMs) &&
    lastAppliedMs > 0 &&
    providerUpdatedMs + 1000 < lastAppliedMs
  ) {
    console.warn("[ls-webhook] rejecting stale event", {
      event,
      eventId,
      organizationId,
      providerUpdatedRaw,
      plan_updated_at: org.plan_updated_at,
    });
    // Still record the event so retries don't re-apply
    await admin.from("billing_webhook_events").insert({
      provider: "lemon_squeezy",
      event_name: event,
      event_id: eventId,
      organization_id: organizationId,
      subscription_id: subscriptionId,
      payload: { stale: true, event },
      provider_updated_at: providerUpdatedRaw,
    });
    return NextResponse.json({ ok: true, stale: true });
  }

  const plan =
    (custom.plan &&
    ["starter", "pro", "business"].includes(custom.plan)
      ? custom.plan
      : null) || variantToPlan(attrs.variant_id);

  const billingStatus = mapLsStatus(attrs.status);

  let periodEnd: string | null =
    attrs.ends_at || attrs.renews_at || attrs.trial_ends_at || null;

  if (periodEnd && Number.isNaN(new Date(periodEnd).getTime())) {
    console.error("[ls-webhook] invalid period end from provider", periodEnd);
    periodEnd = null;
  }

  if (
    !periodEnd &&
    plan &&
    (billingStatus === "active" || billingStatus === "trialing")
  ) {
    periodEnd = addOneMonth().toISOString();
  }

  const updates: Record<string, unknown> = {
    billing_provider: "lemon_squeezy",
    billing_status: billingStatus,
    ls_subscription_id: subscriptionId,
    ls_customer_id:
      attrs.customer_id != null ? String(attrs.customer_id) : null,
    ls_variant_id:
      attrs.variant_id != null ? String(attrs.variant_id) : null,
    plan_period_end: periodEnd,
    plan_updated_at: new Date().toISOString(),
  };

  if (plan && (billingStatus === "active" || billingStatus === "trialing")) {
    updates.plan = plan;
  }

  // If subscription is cancelled/expired, keep plan label for history but status drives access.
  if (billingStatus === "expired") {
    updates.billing_status = "expired";
  }

  const { error } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", organizationId);

  if (error) {
    console.error("[ls-webhook] db", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record processed event (unique on provider+event_id)
  const { error: eventErr } = await admin.from("billing_webhook_events").insert({
    provider: "lemon_squeezy",
    event_name: event,
    event_id: eventId,
    organization_id: organizationId,
    subscription_id: subscriptionId,
    payload: {
      event,
      status: attrs.status,
      variant_id: attrs.variant_id,
      plan,
    },
    provider_updated_at: providerUpdatedRaw,
  });

  if (eventErr) {
    // Unique violation = concurrent duplicate — org already updated; treat as success
    if (!String(eventErr.message || "").toLowerCase().includes("duplicate")) {
      console.error("[ls-webhook] event store", eventErr);
    }
  }

  return NextResponse.json({ ok: true });
}
