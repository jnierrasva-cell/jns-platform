"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  saveEmailTemplate,
  sendTestAutoAck,
  deleteEmailTemplate,
} from "@/app/dashboard/templates/actions";
import PageHeader from "@/components/ui/PageHeader";

type Template = {
  template_key: string;
  label: string;
  subject: string;
  body: string;
  updated_at?: string | null;
};

/** Only variables the backend actually replaces today. */
const SUPPORTED_VARS = [
  {
    token: "{{first_name}}",
    label: "First name",
    hint: "Contact or guessed from email",
  },
  {
    token: "{{business_name}}",
    label: "Business name",
    hint: "This workspace name",
  },
  {
    token: "{{email}}",
    label: "Email",
    hint: "Recipient address",
  },
] as const;

function categoryForKey(key: string): string {
  if (key === "gmail_auto_ack") return "Inquiry responses";
  if (key === "form_thanks") return "Forms";
  if (key.includes("booking") || key.includes("reminder")) return "Bookings";
  return "Custom";
}

function applyPreview(
  text: string,
  sample: { first_name: string; business_name: string; email: string },
) {
  return text
    .replaceAll("{{first_name}}", sample.first_name)
    .replaceAll("{{business_name}}", sample.business_name)
    .replaceAll("{{email}}", sample.email);
}

export function TemplateClient({
  orgId,
  orgName = "Your business",
  templates: initial,
}: {
  orgId: string;
  orgName?: string;
  templates: Template[];
}) {
  const [list, setList] = useState(initial);
  const [savedKeys, setSavedKeys] = useState(
    () => new Set(initial.map((template) => template.template_key)),
  );
  const [activeKey, setActiveKey] = useState(
    initial[0]?.template_key ?? "gmail_auto_ack",
  );
  const active = list.find((t) => t.template_key === activeKey) ?? list[0];

  const [subject, setSubject] = useState(active?.subject ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [testEmail, setTestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState("");
  const [search, setSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const sample = useMemo(
    () => ({
      first_name: "Alex",
      business_name: orgName || "Your business",
      email: testEmail.trim() || "alex@example.com",
    }),
    [orgName, testEmail],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.template_key.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        categoryForKey(t.template_key).toLowerCase().includes(q),
    );
  }, [list, search]);

  function selectTemplate(key: string) {
    const t = list.find((x) => x.template_key === key);
    if (!t) return;
    setActiveKey(key);
    setSubject(t.subject);
    setBody(t.body);
    setSaved(false);
    setError(null);
    setTestResult(null);
  }

  function insertVar(token: string) {
    setBody((prev) =>
      prev.endsWith(" ") || prev.length === 0 ? prev + token : `${prev}${token}`,
    );
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveEmailTemplate({
          organizationId: orgId,
          templateKey: activeKey,
          subject,
          body,
        });
        setList((prev) =>
          prev.map((t) =>
            t.template_key === activeKey
              ? {
                  ...t,
                  subject,
                  body,
                  updated_at: new Date().toISOString(),
                }
              : t,
          ),
        );
        setSavedKeys((prev) => new Set(prev).add(activeKey));
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleAdd() {
    setError(null);
    setTestResult(null);
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    if (list.some((t) => t.template_key === key)) {
      setError("That template key already exists");
      return;
    }
    const t: Template = {
      template_key: key,
      label: key.replace(/_/g, " "),
      subject: "Subject",
      body: `Hi {{first_name}},\n\n\n{{business_name}}`,
    };
    setList((prev) => [...prev, t]);
    setNewKey("");
    setActiveKey(key);
    setSubject(t.subject);
    setBody(t.body);
    setSaved(false);
  }

  function handleDuplicate() {
    if (!active) return;
    const base = `${active.template_key}_copy`;
    let key = base;
    let n = 2;
    while (list.some((t) => t.template_key === key)) {
      key = `${base}_${n}`;
      n += 1;
    }
    const t: Template = {
      template_key: key,
      label: `${active.label} (copy)`,
      subject,
      body,
    };
    setList((prev) => [...prev, t]);
    setActiveKey(key);
    setSaved(false);
    setError(null);
  }

  function handleDelete() {
    if (activeKey === "gmail_auto_ack") return;
    if (!window.confirm(`Delete template “${activeKey}”?`)) return;
    startTransition(async () => {
      try {
        await deleteEmailTemplate(orgId, activeKey);
        const next = list.filter((t) => t.template_key !== activeKey);
        setList(next);
        const first = next[0];
        if (first) selectTemplate(first.template_key);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete");
      }
    });
  }

  function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      try {
        const result = await sendTestAutoAck(orgId, testEmail, activeKey);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setTestResult(`Test sent · Gmail id ${result.messageId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Test failed");
      }
    });
  }

  const previewSubject = applyPreview(subject, sample);
  const previewBody = applyPreview(body, sample);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Email"
        title="Email Studio"
        description="Write replies your automations and rules can send. Variables are replaced when the message goes out."
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link
          href="/dashboard/automation"
          className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          Automation Center
        </Link>
        <span aria-hidden>·</span>
        <Link
          href="/dashboard/email-rules"
          className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
        >
          Email rules
        </Link>
      </div>

      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Template saved.
        </p>
      )}
      {testResult && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {testResult}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                Template library
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Keys stay stable for rules and automations.
              </p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-500 focus:bg-white focus:ring-2"
              />
            </div>
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  No templates match.
                </li>
              ) : (
                filtered.map((t) => {
                  const selected = t.template_key === activeKey;
                  const isSaved = savedKeys.has(t.template_key);
                  return (
                    <li key={t.template_key}>
                      <button
                        type="button"
                        onClick={() => selectTemplate(t.template_key)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                          selected ? "bg-sky-50/80" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {t.label}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isSaved
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                : "bg-amber-50 text-amber-800 ring-1 ring-amber-100"
                            }`}
                          >
                            {isSaved ? "Saved" : "Unsaved"}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {categoryForKey(t.template_key)}
                        </span>
                        <span className="truncate font-mono text-[11px] text-slate-500">
                          {t.template_key}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-slate-100 p-4">
              <label className="text-xs font-medium text-slate-600">
                New template key
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="booking_confirm"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4 xl:col-span-8">
          <div className="flex gap-2 xl:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("edit")}
              className={`min-h-[40px] flex-1 rounded-xl text-sm font-medium ${
                mobileTab === "edit"
                  ? "bg-sky-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`min-h-[40px] flex-1 rounded-xl text-sm font-medium ${
                mobileTab === "preview"
                  ? "bg-sky-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              Preview
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form
              onSubmit={handleSave}
              className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${
                mobileTab === "preview" ? "hidden lg:block" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Compose</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {activeKey}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Duplicate
                  </button>
                  {activeKey !== "gmail_auto_ack" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleDelete}
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-600">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setSaved(false);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-600">
                    Body
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORTED_VARS.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        title={v.hint}
                        onClick={() => insertVar(v.token)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                      >
                        {v.token}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setSaved(false);
                  }}
                  rows={12}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Only the tokens above are replaced on send. Plain text only
                  (Gmail-safe).
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
              >
                {isPending ? "Saving…" : "Save template"}
              </button>
            </form>

            <div
              className={`rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm ${
                mobileTab === "edit" ? "hidden lg:block" : ""
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                Live preview
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Sample: {sample.first_name} · {sample.business_name}
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Subject
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-900">
                    {previewSubject || "—"}
                  </p>
                </div>
                <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-slate-800">
                  {previewBody || (
                    <span className="text-slate-400">Empty body</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleTest}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">Send test</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Uses your connected Google account. Save the template first if it
              is new.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs font-medium text-slate-600">
                  Send to
                </label>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !savedKeys.has(activeKey)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Send test email
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
