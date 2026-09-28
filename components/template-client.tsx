"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  saveEmailTemplate,
  sendTestAutoAck,
  deleteEmailTemplate,
} from "@/app/dashboard/templates/actions";

type Template = {
  template_key: string;
  label: string;
  subject: string;
  body: string;
};

export function TemplateClient({
  orgId,
  templates: initial,
}: {
  orgId: string;
  templates: Template[];
}) {
  const [list, setList] = useState(initial);
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
            t.template_key === activeKey ? { ...t, subject, body } : t,
          ),
        );
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleAdd() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return;
    if (list.some((t) => t.template_key === key)) {
      setError("That template key already exists");
      return;
    }
    const t = {
      template_key: key,
      label: key,
      subject: "Subject",
      body: `Hi {{first_name}},\n\n\n{{business_name}}`,
    };
    setList((prev) => [...prev, t]);
    setNewKey("");
    setActiveKey(key);
    setSubject(t.subject);
    setBody(t.body);
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
        setTestResult(`Sent. Gmail id: ${result.messageId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Test failed");
      }
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Templates
        </span>
        <Link
          href="/dashboard/automation"
          className="text-xs text-zinc-600 underline underline-offset-2"
        >
          ← Automation
        </Link>
      </div>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Email templates
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Use <code className="text-xs">{"{{first_name}}"}</code> and{" "}
        <code className="text-xs">{"{{business_name}}"}</code>. Rules can pick
        which template to send.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {list.map((t) => (
          <button
            key={t.template_key}
            type="button"
            onClick={() => selectTemplate(t.template_key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              activeKey === t.template_key
                ? "bg-[#0B132B] text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs text-zinc-500">New template key</label>
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="booking_confirm"
            className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-4 text-sm text-emerald-600">Saved.</p>
      )}
      {testResult && (
        <p className="mt-2 text-sm text-zinc-600">{testResult}</p>
      )}

      {active && (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <p className="text-xs text-zinc-400">
            Key: <code>{activeKey}</code>
          </p>
          <div>
            <label className="text-sm text-zinc-700">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-700">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save template"}
            </button>
            {activeKey !== "gmail_auto_ack" && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}

      <form onSubmit={handleTest} className="mt-8 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-sm text-zinc-700">Test send to</label>
          <input
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          Send test
        </button>
      </form>
    </div>
  );
}