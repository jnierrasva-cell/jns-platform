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
    <div className="min-h-full bg-[#F6F5F1]">
      <header className="border-b border-[#E1DFD6] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[#1F4D42] underline underline-offset-2"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
          Admin
        </span>
        <h1 className="text-2xl font-medium text-[#1B1D1F]">All users</h1>

        {pendingUsers.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
              Awaiting approval ({pendingUsers.length})
            </h2>
            <div className="flex flex-col gap-3">
              {pendingUsers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[#E9CFA0] bg-[#F6E9D3] p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1B1D1F]">
                      {p.business_name || p.email}
                    </p>
                    <p className="text-xs text-[#6B7069]">{p.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(() => {
                          approveUser(p.id);
                        })
                      }
                      className="rounded-md bg-[#1F4D42] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163B33] disabled:opacity-60"
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
                      className="rounded-md border border-[#DEDCD3] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7069] hover:border-[#B9C4BF]"
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
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            All accounts
          </h2>
          <div className="overflow-hidden rounded-lg border border-[#E1DFD6] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E1DFD6] bg-[#FBFAF7] text-xs uppercase tracking-wide text-[#8A8F87]">
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
                    className="border-b border-[#E1DFD6] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B1D1F]">
                        {p.business_name || p.email}
                      </p>
                      <p className="text-xs text-[#6B7069]">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6B7069]">{p.role}</td>
                    <td className="px-4 py-3 text-[#6B7069]">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      {p.role !== "admin" && (
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => {
                              setUserRole(p.id, "admin");
                            })
                          }
                          className="text-xs text-[#1F4D42] underline underline-offset-2"
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
    </div>
  );
}