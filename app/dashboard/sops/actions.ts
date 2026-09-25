"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";

export async function createSop(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const active = await getActiveOrg();
  if (!active) throw new Error("No workspace selected");
  if (active.role !== "ceo" && active.role !== "admin") {
    throw new Error("Only owners and admins can upload SOPs");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!title) throw new Error("Title is required");
  if (!file || file.size === 0) throw new Error("Choose a file to upload");
  if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20MB");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${active.organizationId}/${crypto.randomUUID()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("org-sops")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("org_sops").insert({
    organization_id: active.organizationId,
    title,
    description: description || null,
    file_path: path,
    file_name: file.name,
    file_type: file.type || null,
    file_size: file.size,
    uploaded_by: user.id,
  });

  if (insertError) {
    await supabase.storage.from("org-sops").remove([path]);
    throw new Error(insertError.message);
  }

  revalidatePath("/dashboard/sops");
}

export async function deleteSop(sopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const active = await getActiveOrg();
  if (!active) throw new Error("No workspace selected");
  if (active.role !== "ceo" && active.role !== "admin") {
    throw new Error("Only owners and admins can delete SOPs");
  }

  const { data: sop, error } = await supabase
    .from("org_sops")
    .select("id, file_path")
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) throw new Error("SOP not found");

  await supabase.storage.from("org-sops").remove([sop.file_path]);
  await supabase.from("org_sops").delete().eq("id", sop.id);

  revalidatePath("/dashboard/sops");
}

export async function getSopDownloadUrl(sopId: string) {
  const supabase = await createClient();
  const active = await getActiveOrg();
  if (!active) throw new Error("No workspace selected");

  const { data: sop, error } = await supabase
    .from("org_sops")
    .select("file_path, file_name")
    .eq("id", sopId)
    .eq("organization_id", active.organizationId)
    .maybeSingle();

  if (error || !sop) throw new Error("SOP not found");

  const { data, error: signError } = await supabase.storage
    .from("org-sops")
    .createSignedUrl(sop.file_path, 60 * 10); // 10 minutes

  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message || "Could not create download link");
  }

  return { url: data.signedUrl, fileName: sop.file_name };
}