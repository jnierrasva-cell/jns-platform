import { createAdminClient } from "@/lib/supabase/admin";
import type { EmitDomainEventInput } from "@/lib/workflows/types";
import { routeEventToWorkflows } from "@/lib/workflows/router";

/**
 * Append a domain event and (unless recordOnly) match active workflows.
 * Safe to call from server actions, webhooks, and cron.
 * Uses service role — never import from client components.
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

  const runsStarted = await routeEventToWorkflows({
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

  return { eventId, runsStarted };
}
