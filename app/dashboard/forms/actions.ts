"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireOrgMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createIntakeForm(input: {
  organizationId: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgMember(input.organizationId);

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Form name is required" };

    let slug = slugify(name) || "form";
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const admin = createAdminClient();
    const { error } = await admin.from("intake_forms").insert({
      organization_id: input.organizationId,
      name,
      slug,
      is_published: true,
      success_message:
        "Thanks — we received your submission and will be in touch.",
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/forms");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create form",
    };
  }
}

export async function updateIntakeForm(input: {
  organizationId: string;
  formId: string;
  name?: string;
  successMessage?: string;
  isPublished?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgMember(input.organizationId);

    const updates: Record<string, string | boolean> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return { ok: false, error: "Form name is required" };
      updates.name = name;
    }

    if (input.successMessage !== undefined) {
      updates.success_message = input.successMessage.trim();
    }

    if (input.isPublished !== undefined) {
      updates.is_published = input.isPublished;
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("intake_forms")
      .update(updates)
      .eq("id", input.formId)
      .eq("organization_id", input.organizationId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/forms");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update form",
    };
  }
}

export async function exportFormSubmissionsCsv(input: {
  organizationId: string;
  formId: string;
}): Promise<
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
> {
  try {
    await requireOrgMember(input.organizationId);
    const admin = createAdminClient();

    const { data: form } = await admin
      .from("intake_forms")
      .select("id, name, slug")
      .eq("id", input.formId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (!form) return { ok: false, error: "Form not found" };

    const { data: rows, error } = await admin
      .from("intake_submissions")
      .select("id, name, email, phone, message, contact_id, created_at")
      .eq("organization_id", input.organizationId)
      .eq("form_id", input.formId)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const esc = (v: string) => {
      if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };

    const header = [
      "submitted_at",
      "name",
      "email",
      "phone",
      "message",
      "contact_id",
      "submission_id",
    ];
    const lines = [
      header.join(","),
      ...(rows ?? []).map((s) =>
        [
          esc(new Date(s.created_at).toISOString()),
          esc(s.name ?? ""),
          esc(s.email ?? ""),
          esc(s.phone ?? ""),
          esc(s.message ?? ""),
          esc(s.contact_id ?? ""),
          esc(s.id),
        ].join(","),
      ),
    ];

    const filename = `${form.slug || "form"}-submissions-all.csv`;
    return { ok: true, csv: lines.join("\n"), filename };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Export failed",
    };
  }
}

export async function getSubmissionContactPreview(input: {
  organizationId: string;
  contactId: string;
}): Promise<
  | {
      ok: true;
      contact: {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        status: string | null;
        source: string | null;
        tags: string[] | null;
        created_at: string;
      };
      notes: { id: string; body: string; created_at: string }[];
    }
  | { ok: false; error: string }
> {
  try {
    await requireOrgMember(input.organizationId);
    const admin = createAdminClient();

    const { data: contact, error } = await admin
      .from("contacts")
      .select(
        "id, email, first_name, last_name, phone, status, source, tags, created_at",
      )
      .eq("id", input.contactId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!contact) return { ok: false, error: "Contact not found" };

    const { data: notes } = await admin
      .from("contact_notes")
      .select("id, body, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      ok: true,
      contact: {
        ...contact,
        tags: Array.isArray(contact.tags) ? contact.tags : null,
      },
      notes: notes ?? [],
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not load contact",
    };
  }
}
