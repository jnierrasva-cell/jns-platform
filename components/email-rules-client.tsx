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
  created_at: string;
};

function conditionSummary(rule: Rule) {
  const parts: string[] = [];
  if (rule.from_email) parts.push(`from ${rule.from_email}`);
  if (rule.from_domain) parts.push(`domain ${rule.from_domain}`);
  if (rule.subject_contains) parts.push(`subject contains “${rule.subject_contains}”`);
  if (rule.only_new_contact) parts.push("new contacts only");
  return parts.length ? parts.join(" · ") : "Any inbound email";
}

export function EmailRulesClient({
  organizationId,
  rules,
}: {
  organizationId: string;
  rules: Rule[];
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
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
          Email
        </span>
        <Link
          href="/dashboard/automation"
          className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
        >
          ← Back to Automation
        </Link>
      </div>

      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Email rules
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-[#94A3B8]">
        Filter inbound mail by sender, domain, or subject, then choose what
        happens. Lower priority numbers run first. If no rule matches, default
        auto-ack is used when that system is on.
      </p>

      {/* Create rule */}
      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 className="text-sm font-medium text-white">New rule</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pricing inquiries"
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Priority (lower = first)</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">From email (optional)</label>
            <input
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="someone@company.com"
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">From domain (optional)</label>
            <input
              value={fromDomain}
              onChange={(e) => setFromDomain(e.target.value)}
              placeholder="company.com"
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Subject contains (optional)</label>
            <input
              value={subjectContains}
              onChange={(e) => setSubjectContains(e.target.value)}
              placeholder="pricing"
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Action</label>
            <select
              value={action}
              onChange={(e) =>
                setAction(e.target.value as "auto_ack" | "skip" | "tag_only")
              }
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="auto_ack">Send auto-ack</option>
              <option value="skip">Skip (no reply)</option>
              <option value="tag_only">Tag only (no reply)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Tag (optional)</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="pricing"
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <label className="mt-6 flex items-center gap-2 text-sm text-[#E2E8F0]">
            <input
              type="checkbox"
              checked={onlyNewContact}
              onChange={(e) => setOnlyNewContact(e.target.checked)}
              className="rounded border-white/20"
            />
            Only if this is a new contact
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create rule"}
        </button>
      </form>

      {/* Rules list */}
      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-4 py-3">Rule</th>
              <th className="px-4 py-3">Conditions</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#94A3B8]">
                  No custom rules yet. Default auto-ack still runs when that
                  system is on.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{rule.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {rule.is_enabled ? "Enabled" : "Disabled"}
                      {rule.tag ? ` · tag: ${rule.tag}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {conditionSummary(rule)}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{rule.action}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{rule.priority}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-xs text-[#60A5FA] underline underline-offset-2"
                        onClick={() =>
                          startTransition(async () => {
                            await setEmailRuleEnabled(rule.id, !rule.is_enabled);
                          })
                        }
                      >
                        {rule.is_enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-400 underline underline-offset-2"
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