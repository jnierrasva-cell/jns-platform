"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createEmailRule,
  deleteEmailRule,
  setEmailRuleEnabled,
} from "@/app/dashboard/email-rules/actions";

type Rule = {
  id: string;
  name: string;
  is_enabled: boolean;
  priority: number;
  from_email: string | null;
  from_domain: string | null;
  subject_contains: string | null;
  only_new_contact: boolean;
  action: "auto_ack" | "skip" | "tag_only";
  tag: string | null;
  template_key?: string | null;
  created_at: string;
};

function conditionSummary(rule: Rule) {
  const parts: string[] = [];
  if (rule.from_email) parts.push(`from ${rule.from_email}`);
  if (rule.from_domain) parts.push(`domain ${rule.from_domain}`);
  if (rule.subject_contains)
    parts.push(`subject contains “${rule.subject_contains}”`);
  if (rule.only_new_contact) parts.push("new contacts only");
  return parts.length ? parts.join(" · ") : "Any inbound email";
}

export function EmailRulesClient({
  organizationId,
  rules,
  templateKeys,
}: {
  organizationId: string;
  rules: Rule[];
  templateKeys: string[];
}) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(100);
  const [fromEmail, setFromEmail] = useState("");
  const [fromDomain, setFromDomain] = useState("");
  const [subjectContains, setSubjectContains] = useState("");
  const [onlyNewContact, setOnlyNewContact] = useState(false);
  const [action, setAction] = useState<"auto_ack" | "skip" | "tag_only">(
    "auto_ack",
  );
  const [tag, setTag] = useState("");
  const [templateKey, setTemplateKey] = useState("gmail_auto_ack");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setPriority(100);
    setFromEmail("");
    setFromDomain("");
    setSubjectContains("");
    setOnlyNewContact(false);
    setAction("auto_ack");
    setTag("");
    setTemplateKey("gmail_auto_ack");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createEmailRule({
          organizationId,
          name,
          priority: Number(priority) || 100,
          fromEmail,
          fromDomain,
          subjectContains,
          onlyNewContact,
          action,
          tag,
          templateKey,
        });
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create rule");
      }
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Email
        </span>
        <Link
          href="/dashboard/automation"
          className="text-xs text-zinc-600 underline underline-offset-2"
        >
          ← Automation
        </Link>
      </div>

      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Email rules</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Decide who gets a reply, who becomes a contact, and who is ignored.
        Lower priority runs first. This is how JNS stays clean — not a silent
        reply to everything.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-medium text-zinc-900">New rule</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pricing inquiries"
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">
              Priority (lower = first)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">From email (optional)</label>
            <input
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">From domain (optional)</label>
            <input
              value={fromDomain}
              onChange={(e) => setFromDomain(e.target.value)}
              placeholder="gmail.com"
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-zinc-700">
              Subject contains (optional)
            </label>
            <input
              value={subjectContains}
              onChange={(e) => setSubjectContains(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Action</label>
            <select
              value={action}
              onChange={(e) =>
                setAction(e.target.value as "auto_ack" | "skip" | "tag_only")
              }
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            >
              <option value="auto_ack">Send auto-reply + contact</option>
              <option value="tag_only">Contact only (tag, no reply)</option>
              <option value="skip">Skip (ignore)</option>
            </select>
          </div>
          {action === "auto_ack" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-zinc-700">Template</label>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
              >
                {templateKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Tag (optional)</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
            <input
              type="checkbox"
              checked={onlyNewContact}
              onChange={(e) => setOnlyNewContact(e.target.checked)}
            />
            Only when this is a new contact
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add rule"}
        </button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3">Rule</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No custom rules yet. Save templates, then add rules so
                  replies stay intentional.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{rule.name}</p>
                    <p className="text-xs text-zinc-500">
                      {rule.is_enabled ? "Enabled" : "Disabled"}
                      {rule.tag ? ` · tag: ${rule.tag}` : ""}
                      {rule.template_key
                        ? ` · template: ${rule.template_key}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {conditionSummary(rule)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{rule.action}</td>
                  <td className="px-4 py-3 text-zinc-500">{rule.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-xs text-zinc-600 underline"
                        onClick={() =>
                          startTransition(async () => {
                            await setEmailRuleEnabled(
                              rule.id,
                              !rule.is_enabled,
                            );
                          })
                        }
                      >
                        {rule.is_enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 underline"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteEmailRule(rule.id);
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
