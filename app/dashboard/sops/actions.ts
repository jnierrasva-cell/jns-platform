"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";

async function requireSopManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const active = await getActiveOrg();
  if (!active) return { error: "No workspace selected" as const };
  if (active.role !== "ceo" && active.role !== "admin") {
    return { error: "Only owners and admins can manage SOPs" as const };
  }

  return { user, active };
}

/** Browser uploads to this URL (bypasses storage RLS pain). */
export async function prepareSopUpload(fileName: string) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${gate.active.organizationId}/${crypto.randomUUID()}-${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("org-sops")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message || "Could not prepare upload",
    };
  }

  return {
    ok: true as const,
    path,
    token: data.token,
  };
}

export async function saveSopRecord(input: {
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
}) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required" };
  if (!input.filePath.startsWith(`${gate.active.organizationId}/`)) {
    return { ok: false as const, error: "Invalid file path" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("org_sops").insert({
    organization_id: gate.active.organizationId,
    title,
    description: input.description?.trim() || null,
    file_path: input.filePath,
    file_name: input.fileName,
    file_type: input.fileType,
    file_size: input.fileSize,
    uploaded_by: gate.user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteSop(sopId: string) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const admin = createAdminClient();

  const { data: sop, error } = await admin
    .from("org_sops")
    .select("id, file_path")
    .eq("id", sopId)
    .eq("organization_id", gate.active.organizationId)
    .maybeSingle();

  if (error || !sop) return { ok: false as const, error: "SOP not found" };

  await admin.storage.from("org-sops").remove([sop.file_path]);
  const { error: delError } = await admin
    .from("org_sops")
    .delete()
    .eq("id", sop.id);

  if (delError) return { ok: false as const, error: delError.message };
  return { ok: true as const };
}

export async function getSopDownloadUrl(sopId: string) {
  const supabase = await createClient();
  const active = await getActiveOrg();
  if (!active) return { ok: false as const, error: "No workspace selected" };

  const admin = createAdminClient();
  const { data: sop, error } = await admin
    .from("org_sops")
    .select("file_path, file_name")
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) return { ok: false as const, error: "SOP not found" };

  // Member must belong to org (active already implies that)
  const { data, error: signError } = await admin.storage
    .from("org-sops")
    .createSignedUrl(sop.file_path, 60 * 10);

  if (signError || !data?.signedUrl) {
    return {
      ok: false as const,
      error: signError?.message || "Could not create download link",
    };
  }

  return {
    ok: true as const,
    url: data.signedUrl,
    fileName: sop.file_name,
  };
}