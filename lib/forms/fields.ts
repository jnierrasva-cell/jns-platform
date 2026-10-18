export type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea";
  required: boolean;
  enabled: boolean;
};

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: "name",
    label: "Full name",
    type: "text",
    required: true,
    enabled: true,
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    enabled: true,
  },
  {
    id: "phone",
    label: "Phone",
    type: "phone",
    required: false,
    enabled: true,
  },
  {
    id: "message",
    label: "Message",
    type: "textarea",
    required: false,
    enabled: true,
  },
];

export function normalizeFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FORM_FIELDS;
  return raw
    .map((f) => {
      const row = f as Partial<FormField>;
      const id = String(row.id || "").trim();
      if (!id) return null;
      const type =
        row.type === "email" ||
        row.type === "phone" ||
        row.type === "textarea" ||
        row.type === "text"
          ? row.type
          : "text";
      return {
        id,
        label: String(row.label || id).trim() || id,
        type,
        required: Boolean(row.required),
        enabled: row.enabled !== false,
      } satisfies FormField;
    })
    .filter(Boolean) as FormField[];
}