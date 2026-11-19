import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/workflows/events";

/**
 * Daily schedule.tick emitters for pipeline SLA + inactive contacts.
 * Auth: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const staleMs = 7 * 86400000;
  const inactiveMs = 30 * 86400000;
  let pipelineEmits = 0;
  let inactiveEmits = 0;

  const { data: scheduleWorkflows } = await admin
    .from("workflows")
    .select("organization_id, key")
    .eq("status", "active")
    .eq("trigger_type", "schedule.tick")
    .not("organization_id", "is", null);

  const orgIds = [
    ...new Set(
      (scheduleWorkflows ?? [])
        .map((w) => w.organization_id as string)
        .filter(Boolean),
    ),
  ];

  for (const orgId of orgIds) {
    const keys = (scheduleWorkflows ?? [])
      .filter((w) => w.organization_id === orgId)
      .map((w) => w.key as string);

    if (keys.includes("pipeline_sla_nudge")) {
      const { data: contacts } = await admin
        .from("contacts")
        .select("id, first_name, last_name, pipeline_stage_id, updated_at")
        .eq("organization_id", orgId)
        .not("pipeline_stage_id", "is", null)
        .limit(100);

      for (const c of contacts ?? []) {
        const updated = new Date(c.updated_at as string).getTime();
        if (Number.isNaN(updated) || now - updated < staleMs) continue;
        const days = Math.floor((now - updated) / 86400000);

        let stageName = "current stage";
        if (c.pipeline_stage_id) {
          const { data: stage } = await admin
            .from("pipeline_stages")
            .select("name")
            .eq("id", c.pipeline_stage_id)
            .maybeSingle();
          if (stage?.name) stageName = stage.name as string;
        }

        const name =
          [c.first_name, c.last_name].filter(Boolean).join(" ") || "Contact";

        await emitDomainEvent({
          organizationId: orgId,
          type: "schedule.tick",
          entityType: "contact",
          entityId: c.id as string,
          payload: {
            kind: "pipeline_stale",
            contact_id: c.id,
            contact_name: name,
            stage_name: stageName,
            days_stale: days,
          },
          idempotencyKey: `schedule.pipeline_stale:${c.id}:${new Date().toISOString().slice(0, 10)}`,
        });
        pipelineEmits += 1;
      }
    }

    if (keys.includes("win_back")) {
      const cutoff = new Date(now - inactiveMs).toISOString();
      const { data: contacts } = await admin
        .from("contacts")
        .select("id, first_name, last_name, last_contacted_at, updated_at")
        .eq("organization_id", orgId)
        .or(`last_contacted_at.lt.${cutoff},last_contacted_at.is.null`)
        .limit(50);

      for (const c of contacts ?? []) {
        const anchor = c.last_contacted_at || c.updated_at;
        const ts = new Date(anchor as string).getTime();
        if (!Number.isNaN(ts) && now - ts < inactiveMs) continue;
        const days = Number.isNaN(ts)
          ? 30
          : Math.floor((now - ts) / 86400000);
        const name =
          [c.first_name, c.last_name].filter(Boolean).join(" ") || "Contact";

        await emitDomainEvent({
          organizationId: orgId,
          type: "schedule.tick",
          entityType: "contact",
          entityId: c.id as string,
          payload: {
            kind: "contact_inactive",
            contact_id: c.id,
            contact_name: name,
            days_inactive: days,
          },
          idempotencyKey: `schedule.inactive:${c.id}:${new Date().toISOString().slice(0, 10)}`,
        });
        inactiveEmits += 1;
      }
    }
  }

  return NextResponse.json({
    orgs: orgIds.length,
    pipelineEmits,
    inactiveEmits,
  });
}
