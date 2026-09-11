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

  const activeUsers = profiles.filter((p) => p.status !== "rejected");
  const rejectedUsers = profiles.filter((p) => p.status === "rejected");

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

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Active accounts
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
              {activeUsers.map((p) => (
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
                  <td className="px-4 py-3 text-[#94A3B8]">active</td>
                  <td className="px-4 py-3 text-right">
                    {p.role !== "admin" && (
                      <div className="flex justify-end gap-3">
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
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => {
                              rejectUser(p.id);
                            })
                          }
                          className="text-xs text-red-300 underline underline-offset-2 hover:text-red-200"
                        >
                          Block
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rejectedUsers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Blocked accounts
          </h2>
          <div className="flex flex-col gap-3">
            {rejectedUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/10 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-[#94A3B8]">{p.email}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      approveUser(p.id);
                    })
                  }
                  className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
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
