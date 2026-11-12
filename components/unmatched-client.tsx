"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  convertUnmatchedToLead,
  ignoreUnmatched,
} from "@/app/dashboard/unmatched/actions";

type Row = {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  gmail_message_id: string;
};

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50";

export function UnmatchedClient({
  organizationId,
  rows,
}: {
  organizationId: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function convert(row: Row) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await convertUnmatchedToLead({
          organizationId,
          unmatchedId: row.id,
        });
        setSuccess(`Converted ${row.from_name || row.from_email} to a lead.`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not convert to lead",
        );
      }
    });
  }

  function ignore(row: Row) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await ignoreUnmatched({
          organizationId,
          unmatchedId: row.id,
        });
        setSuccess("Ignored. It will not appear here again.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not ignore");
      }
    });
  }

  function actions(row: Row) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => convert(row)}
          className={primaryBtn}
        >
          Convert to lead
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => ignore(row)}
          className={secondaryBtn}
        >
          Ignore
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="border-b border-slate-200/80 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Inbox
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Needs review
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
          These senders are not contacts and did not match an email rule.
          Convert real leads or ignore the rest — nothing here enters your
          journey automatically.
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

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inbox is clear"
            description="No unmatched mail right now. Rules keep newsletters and noise out of Clients. When Google is connected and auto-reply is on, real inquiries stay out of this queue."
            actionLabel="Review email rules"
            href="/dashboard/email-rules"
            secondaryLabel="Open Automations"
            secondaryHref="/dashboard/automation"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p>
                <span className="font-semibold">{rows.length}</span> message
                {rows.length === 1 ? "" : "s"} waiting for a decision.
              </p>
              <Link
                href="/dashboard/email-rules"
                className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
              >
                Add a rule for similar mail →
              </Link>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <p className="font-semibold text-slate-900">
                    {row.from_name || row.from_email}
                  </p>
                  {row.from_name ? (
                    <p className="text-xs text-slate-500">{row.from_email}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-700">
                    {row.subject || "(no subject)"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                  <div className="mt-3">{actions(row)}</div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">From</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {row.from_name || row.from_email}
                        </p>
                        {row.from_name ? (
                          <p className="text-xs text-slate-500">
                            {row.from_email}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {row.subject || "(no subject)"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">{actions(row)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        Tip: create{" "}
        <Link
          href="/dashboard/email-rules"
          className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
        >
          email rules
        </Link>{" "}
        for real inquiry patterns so those auto-create leads. Newsletters and
        noise stay out of Clients.
      </p>
    </div>
  );
}
