"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveSignupNames(firstName: string, lastName: string) {
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();

  if (!trimmedFirstName || !trimmedLastName) {
    throw new Error("First and last name are required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("Not authenticated.");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("User profile not found.");
}
