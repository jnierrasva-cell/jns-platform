"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { possessiveWorkspaceName } from "@/lib/names";

export async function completeProfileNames(firstName: string, lastName: string) {
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();

  if (!trimmedFirstName || !trimmedLastName) {
    return { ok: false as const, error: "Enter your first and last name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return { ok: false as const, error: userError.message };
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: profile, error: profileReadError } = await admin
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return { ok: false as const, error: profileReadError.message };
  }

  if (!profile) {
    return { ok: false as const, error: "User profile not found." };
  }

  if (profile.active_organization_id) {
    const { error: orgError } = await admin
      .from("organizations")
      .update({
        name: possessiveWorkspaceName(`${trimmedFirstName} ${trimmedLastName}`),
      })
      .eq("id", profile.active_organization_id)
      .eq("kind", "personal")
      .eq("name", "My workspace");

    if (orgError) return { ok: false as const, error: orgError.message };
  }

  const { data: updatedProfile, error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
    })
    .eq("id", user.id)
    .select("id, first_name, last_name")
    .maybeSingle();

  if (profileError) return { ok: false as const, error: profileError.message };
  if (!updatedProfile) {
    return { ok: false as const, error: "User profile not found." };
  }
  if (
    updatedProfile.first_name?.trim() !== trimmedFirstName ||
    updatedProfile.last_name?.trim() !== trimmedLastName
  ) {
    return {
      ok: false as const,
      error: "Your name could not be saved to your profile. Please try again.",
    };
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
      },
    },
  );
  if (metadataError) {
    return { ok: false as const, error: metadataError.message };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}
