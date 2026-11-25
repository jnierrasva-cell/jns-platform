import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmitDomainEventInput } from "@/lib/workflows/types";
import { routeEventToWorkflows } from "@/lib/workflows/router";

/**
 * Append a domain event and (unless recordOnly) match active workflows.
 * Safe to call from server actions, webhooks, and cron.
 * Uses service role — never import from client components.
 *
 * Performance: the event row is written synchronously so callers get a
 * durable id. Workflow matching + run start is deferred with after()
 * so user-facing mutations (save contact, stage change, etc.) return
 * near-instantly instead of waiting on email/SMS/automation graphs.
 */
export async function emitDomainEvent(input: EmitDomainEventInput): Promise<{
  eventId: string | null;
  runsStarted: number;
  skippedDuplicate?: boolean;
}> {
  const admin = createAdminClient();
  const payload = input.payload ?? {};

  const row = {
    organization_id: input.organizationId,
    type: input.type,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    payload,
    idempotency_key: input.idempotencyKey ?? null,
  };

  const { data: event, error } = await admin
    .from("domain_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505" && input.idempotencyKey) {
      return { eventId: null, runsStarted: 0, skippedDuplicate: true };
    }
    throw new Error(error.message);
  }

  const eventId = (event?.id as string) ?? null;

  if (input.recordOnly) {
    if (eventId) {
      await admin
        .from("domain_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", eventId);
    }
    return { eventId, runsStarted: 0 };
  }

  // Defer routing + run start so the HTTP/server-action response is not
  // blocked by workflow graphs (emails, SMS, multi-step actions).
  after(async () => {
    try {
      await routeEventToWorkflows({
        organizationId: input.organizationId,
        eventType: input.type,
        eventId,
        payload,
      });
      if (eventId) {
        await admin
          .from("domain_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", eventId);
      }
    } catch (err) {
      console.error("[emitDomainEvent] background route failed", err);
    }
  });

  // runsStarted is unknown until background work finishes; callers that
  // only care about durability should treat 0 as "queued".
  return { eventId, runsStarted: 0 };
}
