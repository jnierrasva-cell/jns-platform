"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";

export async function saveSopRecord(input: {
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const active = await getActiveOrg();
  if (!active) return { ok: false as const, error: "No workspace selected" };
  if (active.role !== "ceo" && active.role !== "admin") {
    return {
      ok: false as const,
      error: "Only owners and admins can upload SOPs",
    };
  }

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required" };
  if (!input.filePath.startsWith(`${active.organizationId}/`)) {
    return { ok: false as const, error: "Invalid file path" };
  }

  const { error } = await supabase.from("org_sops").insert({
    organization_id: active.organizationId,
    title,
    description: input.description?.trim() || null,
    file_path: input.filePath,
    file_name: input.fileName,
    file_type: input.fileType,
    file_size: input.fileSize,
    uploaded_by: user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteSop(sopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const active = await getActiveOrg();
  if (!active) return { ok: false as const, error: "No workspace selected" };
  if (active.role !== "ceo" && active.role !== "admin") {
    return {
      ok: false as const,
      error: "Only owners and admins can delete SOPs",
    };
  }

  const { data: sop, error } = await supabase
    .from("org_sops")
    .select("id, file_path")
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) return { ok: false as const, error: "SOP not found" };

  await supabase.storage.from("org-sops").remove([sop.file_path]);
  const { error: delError } = await supabase
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

  const { data: sop, error } = await supabase
    .from("org_sops")
    .select("file_path, file_name")
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) return { ok: false as const, error: "SOP not found" };

  const { data, error: signError } = await supabase.storage
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