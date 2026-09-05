import { createAdminClient } from "@/lib/supabase/admin";

type UpsertContactInput = {
  organizationId: string;
  email: string;
  firstName?: string;
  source?: string;
};

/**
 * Finds or creates a contact by email for the org.
 * Returns the contact id.
 */
export async function upsertContactByEmail(input: UpsertContactInput) {
  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required to upsert contact");
  }

  const { data: existing, error: findError } = await supabase
    .from("contacts")
    .select("id, first_name")
    .eq("organization_id", input.organizationId)
    .ilike("email", email)
    .maybeSingle();

  if (findError) {
    throw new Error(`Contact lookup failed: ${findError.message}`);
  }

  if (existing) {
    const updates: Record<string, string> = {
      updated_at: new Date().toISOString(),
      last_contacted_at: new Date().toISOString(),
    };

    // Fill first_name only if missing
    if (!existing.first_name && input.firstName) {
      updates.first_name = input.firstName;
    }

    await supabase.from("contacts").update(updates).eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error: createError } = await supabase
    .from("contacts")
    .insert({
      organization_id: input.organizationId,
      email,
      first_name: input.firstName ?? null,
      status: "lead",
      source: input.source ?? "email",
      last_contacted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(
      `Contact create failed: ${createError?.message ?? "unknown error"}`,
    );
  }

  return created.id as string;
}