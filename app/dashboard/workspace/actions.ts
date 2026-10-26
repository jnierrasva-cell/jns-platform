"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";

async function requireWorkspaceManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const active = await getActiveOrg();
  if (!active) return { error: "No active workspace" as const };
  if (!isOrgManagerRole(active.role)) {
    return { error: "Only workspace admins can change branding" as const };
  }

  return { user, active };
}

export async function updateWorkspaceName(name: string) {
  const gate = await requireWorkspaceManager();
  if ("error" in gate) throw new Error(gate.error);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Workspace name is required");

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ name: trimmed })
    .eq("id", gate.active.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
}

export async function prepareOrgLogoUpload(fileName: string) {
  const gate = await requireWorkspaceManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${gate.active.organizationId}/${crypto.randomUUID()}-${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("org-logos")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message || "Could not prepare upload",
    };
  }

  return { ok: true as const, path, token: data.token };
}

export async function saveOrgLogoUrl(filePath: string) {
  const gate = await requireWorkspaceManager();
  if ("error" in gate) throw new Error(gate.error);

  const admin = createAdminClient();
  const { data } = admin.storage.from("org-logos").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error } = await admin
    .from("organizations")
    .update({ logo_url: publicUrl })
    .eq("id", gate.active.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");

  return { logoUrl: publicUrl };
}

export async function removeOrgLogo() {
  const gate = await requireWorkspaceManager();
  if ("error" in gate) throw new Error(gate.error);

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ logo_url: null })
    .eq("id", gate.active.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspace");
}