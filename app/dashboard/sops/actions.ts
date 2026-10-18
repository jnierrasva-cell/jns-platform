"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";

function extensionFromName(fileName: string) {
  const i = fileName.lastIndexOf(".");
  if (i <= 0) return "";
  return fileName.slice(i).toLowerCase();
}

/** Safe download filename from SOP title + original extension */
function titledFileName(title: string, originalFileName: string) {
  const ext = extensionFromName(originalFileName) || "";
  const base = title
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return `${base || "SOP"}${ext}`;
}

async function requireSopManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const active = await getActiveOrg();
  if (!active) return { error: "No workspace selected" as const };
  if (!isOrgManagerRole(active.role)) {
    return { error: "Only owners and admins can manage SOPs" as const };
  }

  return { user, active };
}

async function requireSopViewer(sopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const active = await getActiveOrg();
  if (!active) return { error: "No workspace selected" as const };

  const admin = createAdminClient();
  const { data: sop, error } = await admin
    .from("org_sops")
    .select(
      "id, title, file_path, file_name, file_type, visibility, organization_id, version, updated_at",
    )
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) return { error: "SOP not found" as const };

  const isManager = isOrgManagerRole(active.role);
  const visibility = (sop.visibility as string) || "all_members";

  if (visibility === "managers_only" && !isManager) {
    return { error: "You don’t have access to this document" as const };
  }

  return { user, active, sop, isManager };
}

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

  return { ok: true as const, path, token: data.token };
}

export async function saveSopRecord(input: {
  title: string;
  description?: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  visibility?: "all_members" | "managers_only";
  version?: string;
}) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title is required" };
  if (!input.filePath.startsWith(`${gate.active.organizationId}/`)) {
    return { ok: false as const, error: "Invalid file path" };
  }

  const visibility =
    input.visibility === "managers_only" ? "managers_only" : "all_members";
  const version = (input.version || "1.0").trim() || "1.0";
  const now = new Date().toISOString();

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
    visibility,
    version,
    updated_at: now,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function updateSopVisibility(
  sopId: string,
  visibility: "all_members" | "managers_only",
) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("org_sops")
    .update({
      visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sopId)
    .eq("organization_id", gate.active.organizationId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function updateSopVersion(sopId: string, version: string) {
  const gate = await requireSopManager();
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const v = version.trim() || "1.0";
  const admin = createAdminClient();
  const { error } = await admin
    .from("org_sops")
    .update({
      version: v,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sopId)
    .eq("organization_id", gate.active.organizationId);

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

/** View — open inline in the browser when possible (PDF). No download flag. */
export async function getSopViewUrl(sopId: string) {
  const gate = await requireSopViewer(sopId);
  if ("error" in gate) return { ok: false as const, error: gate.error };

  const displayName = titledFileName(
    gate.sop.title as string,
    gate.sop.file_name as string,
  );

  const admin = createAdminClient();
  // Do NOT pass `download` — that forces the browser to save the file.
  const { data, error: signError } = await admin.storage
    .from("org-sops")
    .createSignedUrl(gate.sop.file_path, 60 * 15);

  if (signError || !data?.signedUrl) {
    return {
      ok: false as const,
      error: signError?.message || "Could not open document",
    };
  }

  return {
    ok: true as const,
    url: data.signedUrl,
    title: gate.sop.title as string,
    fileName: displayName,
    fileType: (gate.sop.file_type as string) || null,
  };
}

/** Download — managers only; file saves as SOP title + extension. */
export async function getSopDownloadUrl(sopId: string) {
  const gate = await requireSopViewer(sopId);
  if ("error" in gate) return { ok: false as const, error: gate.error };
  if (!gate.isManager) {
    return {
      ok: false as const,
      error: "Only owners and admins can download. Use View instead.",
    };
  }

  const displayName = titledFileName(
    gate.sop.title as string,
    gate.sop.file_name as string,
  );

  const admin = createAdminClient();
  const { data, error: signError } = await admin.storage
    .from("org-sops")
    .createSignedUrl(gate.sop.file_path, 60 * 10, {
      download: displayName,
    });

  if (signError || !data?.signedUrl) {
    return {
      ok: false as const,
      error: signError?.message || "Could not create download link",
    };
  }

  return {
    ok: true as const,
    url: data.signedUrl,
    fileName: displayName,
  };
}