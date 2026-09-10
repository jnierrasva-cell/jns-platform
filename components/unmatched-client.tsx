"use client";

import { useTransition } from "react";
import Link from "next/link";
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

export function UnmatchedClient({
  organizationId,
  rows,
}: {
  organizationId: string;
  rows: Row[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="pb-4">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Inbox review
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Unmatched email
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          These senders are not contacts and did not match an email rule. Convert
          real leads or ignore the rest — nothing here enters your pipeline
          automatically.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            No unmatched emails. Your CRM stays clean.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {row.from_name || row.from_email}
                    </p>
                    {row.from_name && (
                      <p className="text-xs text-slate-500">{row.from_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.subject || "(no subject)"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await convertUnmatchedToLead({
                              organizationId,
                              unmatchedId: row.id,
                            });
                          })
                        }
                        className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100"
                      >
                        Convert to lead
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await ignoreUnmatched({
                              organizationId,
                              unmatchedId: row.id,
                            });
                          })
                        }
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-400"
                      >
                        Ignore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Tip: create{" "}
        <Link
          href="/dashboard/email-rules"
          className="text-cyan-200 underline underline-offset-2"
        >
          Email rules
        </Link>{" "}
        for real inquiry patterns so those auto-create leads. Newsletters stay
        out of Contacts.
      </p>
    </div>
  );
}