"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  approveUser,
  rejectUser,
  setUserRole,
  generatePasswordResetLink,
} from "@/app/admin/actions";

type Profile = {
  id: string;
  email: string | null;
  business_name: string | null;
  role: "client" | "admin";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export function AdminClient({ profiles }: { profiles: Profile[] }) {
  const [isPending, startTransition] = useTransition();
  const [resetInfo, setResetInfo] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const activeUsers = profiles.filter((p) => p.status !== "rejected");
  const rejectedUsers = profiles.filter((p) => p.status === "rejected");

  function handleResetLink(userId: string) {
    setResetError(null);
    setResetInfo(null);
    startTransition(async () => {
      try {
        const result = await generatePasswordResetLink(userId);
        setResetInfo(result);
      } catch (err) {
        setResetError(
          err instanceof Error ? err.message : "Could not generate link",
        );
      }
    });
  }

  async function copyLink() {
    if (!resetInfo?.link) return;
    try {
      await navigator.clipboard.writeText(resetInfo.link);
    } catch {
      // fallback: select is enough if clipboard blocked
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Admin
        </span>
        <Link
          href="/dashboard"
          className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-600"
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        All users
      </h1>

      {(resetInfo || resetError) && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {resetError && (
            <p className="text-sm text-red-600">{resetError}</p>
          )}
          {resetInfo && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Reset link for{" "}
                <span className="font-medium text-zinc-900">{resetInfo.email}</span>
                . Copy and send it yourself (chat, SMS, email). No SMTP required.
              </p>
              <textarea
                readOnly
                value={resetInfo.link}
                className="h-24 w-full rounded-lg border border-zinc-200 bg-[#0B132B] px-3 py-2 text-xs text-cyan-800"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => setResetInfo(null)}
                  className="text-xs text-slate-400 underline underline-offset-2 hover:text-zinc-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Active accounts
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {p.business_name || p.email}
                    </p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p.role}</td>
                  <td className="px-4 py-3 text-zinc-500">active</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        disabled={isPending || !p.email}
                        onClick={() => handleResetLink(p.id)}
                        className="text-xs text-cyan-700 underline underline-offset-2 hover:text-cyan-800 disabled:opacity-40"
                      >
                        Reset password link
                      </button>
                      {p.role !== "admin" && (
                        <>
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => {
                                setUserRole(p.id, "admin");
                              })
                            }
                            className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-600"
                          >
                            Make admin
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => {
                                rejectUser(p.id);
                              })
                            }
                            className="text-xs text-red-600 underline underline-offset-2 hover:text-red-600"
                          >
                            Block
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rejectedUsers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
            Blocked accounts
          </h2>
          <div className="flex flex-col gap-3">
            {rejectedUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/10 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-zinc-500">{p.email}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      approveUser(p.id);
                    })
                  }
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  Restore access
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}