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
      custom_data?: {
        organization_id?: string;
        plan?: string;
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

  const plan =
    (custom.plan &&
    ["starter", "pro", "business"].includes(custom.plan)
      ? custom.plan
      : null) || variantToPlan(attrs.variant_id);

  const billingStatus = mapLsStatus(attrs.status);
  const admin = createAdminClient();

  let periodEnd: string | null =
    attrs.ends_at || attrs.renews_at || attrs.trial_ends_at || null;

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
    ls_subscription_id: payload.data?.id ? String(payload.data.id) : null,
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

  const { error } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", organizationId);

  if (error) {
    console.error("[ls-webhook] db", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}