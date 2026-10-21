import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";

const PLAN_TO_VARIANT: Record<string, string | undefined> = {
  starter: process.env.LEMONSQUEEZY_VARIANT_STARTER,
  pro: process.env.LEMONSQUEEZY_VARIANT_PRO,
  business: process.env.LEMONSQUEEZY_VARIANT_BUSINESS,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const plan = String(body.plan || "").toLowerCase();
    const variantId = PLAN_TO_VARIANT[plan];

    if (!variantId) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      return NextResponse.json(
        { error: "Billing is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const active = await getActiveOrg();
    if (!active) {
      return NextResponse.json(
        { error: "No workspace selected. Open a workspace first." },
        { status: 400 },
      );
    }
    if (!isOrgManagerRole(active.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can manage billing" },
        { status: 403 },
      );
    }

    const origin = new URL(req.url).origin;
    const redirectUrl = `${origin}/dashboard?billing=success`;

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: user.email ?? undefined,
              custom: {
                organization_id: active.organizationId,
                user_id: user.id,
                plan,
              },
            },
            product_options: {
              redirect_url: redirectUrl,
            },
            checkout_options: {
              embed: false,
            },
          },
          relationships: {
            store: {
              data: { type: "stores", id: String(storeId) },
            },
            variant: {
              data: { type: "variants", id: String(variantId) },
            },
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("[ls-checkout]", json);
      return NextResponse.json(
        { error: "Could not start checkout" },
        { status: 502 },
      );
    }

    const url = json?.data?.attributes?.url as string | undefined;
    if (!url) {
      return NextResponse.json(
        { error: "No checkout URL returned" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[ls-checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}