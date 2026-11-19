import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Claim a side-effect idempotency key for an org.
 * Returns true if this is the first claim (proceed), false if already used.
 */
export async function claimIdempotencyKey(input: {
  organizationId: string;
  key: string;
  runId?: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("workflow_idempotency").insert({
    organization_id: input.organizationId,
    key: input.key,
    run_id: input.runId ?? null,
  });

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(error.message);
  }
  return true;
}
