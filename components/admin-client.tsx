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
  role: string;
  status: "pending" | "approved" | "rejected" | string;
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
      // ignore
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          JNS Admin
        </span>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-zinc-900 underline-offset-2 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        All users
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Platform access only. Org roles (Owner / Admin / Assistant) are managed
        inside each workspace under Team.
      </p>

      {(resetInfo || resetError) && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          {resetInfo && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                Reset link for{" "}
                <span className="font-medium text-zinc-900">
                  {resetInfo.email}
                </span>
                . Copy and send it yourself.
              </p>
              <input
                readOnly
                value={resetInfo.link}
                className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-800"
              />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Copy link
              </button>
            </div>
          )}
        </div>
      )}

      <section className="mt-8">
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Platform role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {p.business_name || p.email || "—"}
                    </p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {p.role === "super_admin" ? "super_admin" : "user"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleResetLink(p.id)}
                        className="text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-50"
                      >
                        Reset link
                      </button>
                      {p.role !== "super_admin" ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => {
                              setUserRole(p.id, "super_admin");
                            })
                          }
                          className="text-xs text-blue-600 underline underline-offset-2 disabled:opacity-50"
                        >
                          Make super admin
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => {
                              setUserRole(p.id, "user");
                            })
                          }
                          className="text-xs text-zinc-600 underline underline-offset-2 disabled:opacity-50"
                        >
                          Remove super admin
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            rejectUser(p.id);
                          })
                        }
                        className="text-xs text-red-600 underline underline-offset-2 disabled:opacity-50"
                      >
                        Block
                      </button>
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
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            Blocked accounts
          </h2>
          <div className="flex flex-col gap-3">
            {rejectedUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-zinc-500">{p.email}</p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      approveUser(p.id);
                    })
                  }
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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