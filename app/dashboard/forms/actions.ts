export async function exportFormSubmissionsCsv(input: {
  organizationId: string;
  formId: string;
}): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
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
