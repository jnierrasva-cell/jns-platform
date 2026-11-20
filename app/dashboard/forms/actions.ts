"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgMember } from "@/lib/org/auth";
import {
  DEFAULT_FORM_FIELDS,
  normalizeFields,
  type FormField,
} from "@/lib/forms/fields";

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
}): Promise<
  | { ok: true; formId: string; slug: string }
  | { ok: false; error: string }
> {
  try {
    await requireOrgMember(input.organizationId);

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Form name is required" };

    let slug = slugify(name) || "form";
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("intake_forms")
      .insert({
        organization_id: input.organizationId,
        name,
        slug,
        is_published: true,
        success_message:
          "Thanks — we received your submission and will be in touch.",
        headline: null,
        description: null,
        fields: DEFAULT_FORM_FIELDS,
      })
      .select("id, slug")
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? "Create failed" };

    revalidatePath("/dashboard/forms");
    return { ok: true, formId: data.id as string, slug: data.slug as string };
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
  headline?: string | null;
  description?: string | null;
  fields?: FormField[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgMember(input.organizationId);

    const updates: Record<string, unknown> = {
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
    if (input.headline !== undefined) {
      updates.headline = input.headline?.trim() || null;
    }
    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null;
    }
    if (input.fields !== undefined) {
      updates.fields = normalizeFields(input.fields);
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("intake_forms")
      .update(updates)
      .eq("id", input.formId)
      .eq("organization_id", input.organizationId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/forms");
    revalidatePath("/forms", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update form",
    };
  }
}

export async function duplicateIntakeForm(input: {
  organizationId: string;
  formId: string;
}): Promise<
  | { ok: true; formId: string }
  | { ok: false; error: string }
> {
  try {
    await requireOrgMember(input.organizationId);
    const admin = createAdminClient();

    const { data: source, error } = await admin
      .from("intake_forms")
      .select(
        "name, success_message, headline, description, fields, is_published",
      )
      .eq("id", input.formId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (error || !source) {
      return { ok: false, error: "Form not found" };
    }

    const name = `${source.name} (copy)`;
    let slug = slugify(name) || "form";
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error: insertError } = await admin
      .from("intake_forms")
      .insert({
        organization_id: input.organizationId,
        name,
        slug,
        is_published: false,
        success_message:
          source.success_message ||
          "Thanks — we received your submission and will be in touch.",
        headline: source.headline,
        description: source.description,
        fields: normalizeFields(source.fields),
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { ok: false, error: insertError?.message ?? "Duplicate failed" };
    }

    revalidatePath("/dashboard/forms");
    return { ok: true, formId: created.id as string };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not duplicate form",
    };
  }
}

export async function exportFormSubmissionsCsv(input: {
  organizationId: string;
  formId: string;
}): Promise<
  { ok: true; csv: string; filename: string } | { ok: false; error: string }
> {
  try {
    await requireOrgMember(input.organizationId);
    const admin = createAdminClient();

    const { data: form } = await admin
      .from("intake_forms")
      .select("name, slug, fields")
      .eq("id", input.formId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (!form) return { ok: false, error: "Form not found" };

    const formFields = normalizeFields(form.fields);
    const questionFields = formFields.filter((f) => f.enabled !== false);

    const { data: rows, error } = await admin
      .from("intake_submissions")
      .select("name, email, phone, message, responses, created_at, payload")
      .eq("organization_id", input.organizationId)
      .eq("form_id", input.formId)
      .order("created_at", { ascending: false });

    if (error) return { ok: false, error: error.message };

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      "Submitted at",
      ...questionFields.map((f) => f.label || f.id),
    ];

    const lines = [
      headers.map(escape).join(","),
      ...(rows ?? []).map((r) => {
        const responses =
          (r.responses as Record<string, unknown> | null) ||
          (r.payload as Record<string, unknown> | null) ||
          {};

        const cells = [
          r.created_at,
          ...questionFields.map((f) => {
            if (
              responses[f.id] != null &&
              String(responses[f.id]).trim() !== ""
            ) {
              return String(responses[f.id]);
            }
            if (f.id === "name") return r.name ?? "";
            if (f.id === "email") return r.email ?? "";
            if (f.id === "phone") return r.phone ?? "";
            if (f.id === "message") return r.message ?? "";
            return "";
          }),
        ];

        return cells.map(escape).join(",");
      }),
    ];

    const filename = `${slugify(form.name || form.slug || "form")}-submissions.csv`;
    return { ok: true, csv: lines.join("\n"), filename };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Export failed",
    };
  }
}
