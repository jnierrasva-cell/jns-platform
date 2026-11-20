"use client";

import { useEffect, useRef } from "react";
import {
  Plus,
  X,
  GripVertical,
  Monitor,
  Smartphone,
} from "lucide-react";
import type { FormField } from "@/lib/forms/fields";

export type FormDraft = {
  formId: string;
  name: string;
  headline: string;
  description: string;
  successMessage: string;
  fields: FormField[];
  slug: string;
  isPublished: boolean;
};

const inputClass =
  "mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const secondaryBtn =
  "inline-flex min-h-[36px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-sky-600 bg-sky-600" : "border-slate-300 bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

export function FormEditorDrawer({
  draft,
  setDraft,
  orgName,
  isPending,
  onSave,
  onClose,
  previewMode,
  setPreviewMode,
}: {
  draft: FormDraft;
  setDraft: React.Dispatch<React.SetStateAction<FormDraft | null>>;
  orgName: string;
  isPending: boolean;
  onSave: () => void;
  onClose: () => void;
  previewMode: "desktop" | "mobile";
  setPreviewMode: (m: "desktop" | "mobile") => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [draft.formId]);

  function updateField(index: number, patch: Partial<FormField>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        fields: d.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      };
    });
  }

  function addCustomField() {
    const id = `custom_${Math.random().toString(36).slice(2, 8)}`;
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        fields: [
          ...d.fields,
          {
            id,
            label: "New question",
            type: "text",
            required: false,
            enabled: true,
          },
        ],
      };
    });
  }

  function removeField(index: number) {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, fields: d.fields.filter((_, i) => i !== index) };
    });
  }

  function moveField(index: number, dir: -1 | 1) {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.fields];
      const j = index + dir;
      if (j < 0 || j >= next.length) return d;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...d, fields: next };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-[2px]">
      <div className="flex min-h-0 flex-1 flex-col bg-white shadow-2xl sm:m-3 sm:rounded-2xl lg:m-4">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Customize form
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {draft.name || "Untitled form"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} className={secondaryBtn}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onSave}
              className={primaryBtn}
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <section className="space-y-4">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Form settings
              </h2>
              <div>
                <label className="text-xs font-medium text-slate-600">Name</label>
                <input
                  ref={titleRef}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  className={inputClass}
                  placeholder="Form name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Headline
                </label>
                <input
                  value={draft.headline}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, headline: e.target.value } : d,
                    )
                  }
                  placeholder={`e.g. Contact ${orgName}`}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                  rows={2}
                  placeholder="Short intro for visitors"
                  className={`${inputClass} min-h-0`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Success message
                </label>
                <textarea
                  value={draft.successMessage}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, successMessage: e.target.value } : d,
                    )
                  }
                  rows={2}
                  className={`${inputClass} min-h-0`}
                />
              </div>
            </section>

            <section className="mt-8 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Questions / fields
                </h2>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 underline underline-offset-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add question
                </button>
              </div>
              <div className="space-y-3">
                {draft.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-2 flex flex-col gap-0.5 text-slate-300">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => moveField(index, -1)}
                          className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={index === draft.fields.length - 1}
                          onClick={() => moveField(index, 1)}
                          className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                        >
                          <GripVertical className="h-4 w-4 -rotate-90" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <input
                          value={field.label}
                          onChange={(e) =>
                            updateField(index, { label: e.target.value })
                          }
                          className="w-full min-h-[40px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          placeholder="Question label"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(index, {
                                type: e.target.value as FormField["type"],
                              })
                            }
                            className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="textarea">Long text</option>
                          </select>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <Toggle
                              checked={field.required}
                              onChange={(v) =>
                                updateField(index, { required: v })
                              }
                              label="Required"
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <Toggle
                              checked={field.enabled !== false}
                              onChange={(v) =>
                                updateField(index, { enabled: v })
                              }
                              label="Show field"
                            />
                            Show
                          </label>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="ml-auto text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-h-0 flex-col bg-slate-50/80 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Live preview
              </h2>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    previewMode === "desktop"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    previewMode === "mobile"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto">
              <div
                className={`w-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-all ${
                  previewMode === "mobile" ? "max-w-[360px]" : "max-w-lg"
                }`}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {orgName}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {draft.headline || draft.name || "Form"}
                  </h3>
                  {draft.description ? (
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">
                      {draft.description}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-4 px-5 py-5">
                  {draft.fields
                    .filter((f) => f.enabled !== false)
                    .map((field) => (
                      <div key={field.id}>
                        <label className="text-sm font-medium text-slate-700">
                          {field.label}
                          {field.required ? (
                            <span className="text-red-500"> *</span>
                          ) : null}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            disabled
                            rows={3}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
                            placeholder={field.label}
                          />
                        ) : (
                          <input
                            disabled
                            type={
                              field.type === "email"
                                ? "email"
                                : field.type === "phone"
                                  ? "tel"
                                  : "text"
                            }
                            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
                            placeholder={field.label}
                          />
                        )}
                      </div>
                    ))}
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white opacity-90"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
