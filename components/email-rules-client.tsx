"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

function conditionSummary(rule: Rule) {
  const parts: string[] = [];
  if (rule.from_email) parts.push(`from ${rule.from_email}`);
  if (rule.from_domain) parts.push(`domain ${rule.from_domain}`);
  if (rule.subject_contains)
    parts.push(`subject contains "${rule.subject_contains}"`);
  if (rule.only_new_contact) parts.push("new contacts only");
  return parts.length ? parts.join(" · ") : "Any inbound email";
}

const ACTION_OPTIONS: {
  value: Rule["action"];
  label: string;
  short: string;
  help: string;
}[] = [
  {
    value: "auto_ack",
    label: "Reply + save contact",
    short: "Reply + contact",
    help: "Saves the sender as a contact (if new), then sends your chosen template from the connected Google account. Use for inquiries you want to acknowledge.",
  },
  {
    value: "tag_only",
    label: "Save contact only (no reply)",
    short: "Contact only",
    help: "Saves or updates the contact and can apply a tag. Does not send email. Use when you want the lead in Clients without an automatic reply.",
  },
  {
    value: "skip",
    label: "Ignore this mail",
    short: "Ignore",
    help: "Does nothing: no contact, no reply, not added to Needs review for this match. Use for newsletters, receipts, or mail you never want in JNS.",
  },
];

function actionLabel(action: Rule["action"]) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.short ?? action;
}

function actionHelp(action: Rule["action"]) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.help ?? "";
}

export function EmailRulesClient({
  organizationId,
  rules,
  rulesLoadError,
  templateKeys,
}: {
  organizationId: string;
  rules: Rule[];
  rulesLoadError: string | null;
  templateKeys: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(10);
  const [fromEmail, setFromEmail] = useState("");
  const [fromDomain, setFromDomain] = useState("");
  const [subjectContains, setSubjectContains] = useState("");
  const [onlyNewContact, setOnlyNewContact] = useState(false);
  const [action, setAction] = useState<"auto_ack" | "skip" | "tag_only">(
    "auto_ack",
  );
  const [tag, setTag] = useState("");
  const [templateKey, setTemplateKey] = useState("gmail_auto_ack");
  const [enableOnCreate, setEnableOnCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setPriority(10);
    setFromEmail("");
    setFromDomain("");
    setSubjectContains("");
    setOnlyNewContact(false);
    setAction("auto_ack");
    setTag("");
    setTemplateKey("gmail_auto_ack");
    setEnableOnCreate(false);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await createEmailRule({
          organizationId,
          name,
          priority: Number(priority) || 10,
          fromEmail,
          fromDomain,
          subjectContains,
          onlyNewContact,
          action,
          tag,
          templateKey,
          enabled: enableOnCreate,
        });
        resetForm();
        setSuccess("Rule saved.");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Could not create rule";
        setError(
          message.includes("Minified React error")
            ? "Could not save this rule. Check you are an owner/admin of this workspace, then try again."
            : message,
        );
      }
    });
  }

  function toggleEnabled(rule: Rule) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await setEmailRuleEnabled(rule.id, !rule.is_enabled);
        setSuccess(
          rule.is_enabled
            ? `Disabled "${rule.name}".`
            : `Enabled "${rule.name}".`,
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not update rule",
        );
      }
    });
  }

  function removeRule(rule: Rule) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await deleteEmailRule(rule.id);
        setSuccess(`Deleted "${rule.name}".`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not delete rule",
        );
      }
    });
  }

  return (
    <div className="pb-4">
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Inbox
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              href="/dashboard/unmatched"
              className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Needs review
            </Link>
            <Link
              href="/dashboard/templates"
              className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Templates
            </Link>
            <Link
              href="/dashboard/automation"
              className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              Automations
            </Link>
          </div>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Email rules
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
          Rules decide who gets a reply and who becomes a contact. Leave
          optional filters empty to match more mail. Lower priority number is
          checked first.
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="mt-4 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      <form
        id="new-rule"
        onSubmit={handleCreate}
        className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-semibold text-slate-900">New rule</h2>
        <p className="mt-1 text-xs text-slate-500">
          Example: subject contains "cancel" → reply + contact. You do not need
          every field filled in.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cancellation requests"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Priority (1 = highest)
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 1)}
              className={inputClass}
            />
            <p className="text-xs text-slate-400">
              Use 1–10 for important rules. Default 10 is fine.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              From email (optional)
            </label>
            <input
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="one.person@email.com"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              From domain (optional)
            </label>
            <input
              value={fromDomain}
              onChange={(e) => setFromDomain(e.target.value)}
              placeholder="ilovemypilates.com"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Subject contains (optional)
            </label>
            <input
              value={subjectContains}
              onChange={(e) => setSubjectContains(e.target.value)}
              placeholder="cancellation"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Action</label>
            <select
              value={action}
              onChange={(e) =>
                setAction(e.target.value as "auto_ack" | "skip" | "tag_only")
              }
              className={inputClass}
              aria-describedby="action-help"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div
              id="action-help"
              className="rounded-xl border border-sky-100 bg-sky-50/80 px-3.5 py-3 text-xs leading-5 text-slate-700"
            >
              <p className="font-medium text-slate-900">
                {ACTION_OPTIONS.find((o) => o.value === action)?.label}
              </p>
              <p className="mt-1 text-slate-600">{actionHelp(action)}</p>
              <ul className="mt-2 space-y-1 border-t border-sky-100/80 pt-2 text-slate-500">
                <li>
                  <span className="font-medium text-slate-700">
                    Reply + save contact:
                  </span>{" "}
                  contact + template email
                </li>
                <li>
                  <span className="font-medium text-slate-700">
                    Save contact only:
                  </span>{" "}
                  contact/tag, silent
                </li>
                <li>
                  <span className="font-medium text-slate-700">Ignore:</span>{" "}
                  drop this match completely
                </li>
              </ul>
            </div>
          </div>
          {action === "auto_ack" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Reply template
              </label>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className={inputClass}
              >
                {(templateKeys.length > 0
                  ? templateKeys
                  : ["gmail_auto_ack"]
                ).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Tag (optional)
            </label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="cancellation"
              className={inputClass}
            />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={onlyNewContact}
              onChange={(e) => setOnlyNewContact(e.target.checked)}
              className="rounded border-slate-300"
            />
            Only when this is a new contact
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={enableOnCreate}
              onChange={(e) => setEnableOnCreate(e.target.checked)}
              className="rounded border-slate-300"
            />
            Enable this rule immediately
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`mt-5 ${primaryBtn}`}
        >
          {isPending ? "Saving..." : "Add rule"}
        </button>
      </form>

      <div className="mt-8">
        {rulesLoadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
            <p className="text-sm font-medium text-red-800" role="alert">
              {rulesLoadError}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className={`mt-4 ${secondaryBtn}`}
            >
              Try again
            </button>
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No rules yet"
            description="Add a rule so auto-reply only fires when you want it. Without rules, unmatched mail lands in Needs review instead of becoming contacts."
            actionLabel="Create a rule"
            onAction={() => {
              document
                .getElementById("new-rule")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            secondaryLabel="Open Needs review"
            secondaryHref="/dashboard/unmatched"
          />
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {conditionSummary(rule)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {actionLabel(rule.action)} · priority {rule.priority}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                        rule.is_enabled
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-slate-50 text-slate-500 ring-slate-200"
                      }`}
                    >
                      {rule.is_enabled ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.is_enabled}
                      aria-label={`${rule.is_enabled ? "Disable" : "Enable"} ${rule.name}`}
                      disabled={isPending}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                        rule.is_enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      onClick={() => toggleEnabled(rule)}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          rule.is_enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      className="min-h-[44px] text-xs font-medium text-red-600 underline underline-offset-2 disabled:opacity-50"
                      onClick={() => removeRule(rule)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {rule.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span
                            className={
                              rule.is_enabled
                                ? "font-medium text-emerald-700"
                                : "text-slate-400"
                            }
                          >
                            {rule.is_enabled ? "Enabled" : "Disabled"}
                          </span>
                          {rule.tag ? ` · tag: ${rule.tag}` : ""}
                          {rule.template_key
                            ? ` · template: ${rule.template_key}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {conditionSummary(rule)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {actionLabel(rule.action)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {rule.priority}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.is_enabled}
                            aria-label={`${rule.is_enabled ? "Disable" : "Enable"} ${rule.name}`}
                            disabled={isPending}
                            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                              rule.is_enabled ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                            onClick={() => toggleEnabled(rule)}
                          >
                            <span
                              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                rule.is_enabled
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            className="min-h-[44px] text-xs font-medium text-red-600 underline underline-offset-2 disabled:opacity-50"
                            onClick={() => removeRule(rule)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
