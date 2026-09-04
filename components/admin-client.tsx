"use client";

import { useTransition } from "react";
import Link from "next/link";
import { approveUser, rejectUser, setUserRole } from "@/app/admin/actions";

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

  const pendingUsers = profiles.filter((p) => p.status === "pending");
  const otherUsers = profiles.filter((p) => p.status !== "pending");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
          Admin
        </span>
        <Link
          href="/dashboard"
          className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        All users
      </h1>

      {pendingUsers.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Awaiting approval ({pendingUsers.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-[#94A3B8]">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        approveUser(p.id);
                      })
                    }
                    className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        rejectUser(p.id);
                      })
                    }
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition hover:border-white/25 hover:text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          All accounts
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {otherUsers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {p.business_name || p.email}
                    </p>
                    <p className="text-xs text-[#94A3B8]">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{p.role}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{p.status}</td>
                  <td className="px-4 py-3 text-right">
                    {p.role !== "admin" && (
                      <button
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            setUserRole(p.id, "admin");
                          })
                        }
                        className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
                      >
                        Make admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}