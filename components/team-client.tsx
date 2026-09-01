"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createInvite, revokeInvite } from "@/app/dashboard/team/actions";

type Member = {
  user_id: string;
  role: string;
  profiles: { email: string | null; business_name: string | null } | { email: string | null; business_name: string | null }[] | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

function memberEmail(m: Member) {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return p?.business_name || p?.email || "Unknown";
}

export function TeamClient({
  orgId,
  orgName,
  members,
  invites,
}: {
  orgId: string;
  orgName: string;
  members: Member[];
  invites: Invite[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "assistant" | "member">(
    "member",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingInvites = invites.filter((i) => i.status === "pending");

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createInvite(orgId, email, role);
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send invite");
      }
    });
  }

  return (
    <div className="min-h-full bg-[#F6F5F1]">
      <header className="border-b border-[#E1DFD6] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
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

      <div className="mx-auto max-w-4xl px-6 py-10">
        <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
          {orgName}
        </span>
        <h1 className="text-2xl font-medium text-[#1B1D1F]">Team</h1>

        <section className="mt-8 rounded-lg border border-[#E1DFD6] bg-white p-6">
          <h2 className="mb-4 text-sm font-medium text-[#1B1D1F]">
            Invite someone
          </h2>
          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="inviteEmail" className="text-sm text-[#1B1D1F]">
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@email.com"
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inviteRole" className="text-sm text-[#1B1D1F]">
                Role
              </label>
              <select
                id="inviteRole"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              >
                <option value="member">Member</option>
                <option value="assistant">Assistant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-[#1F4D42] px-4 py-2 text-sm font-medium text-white hover:bg-[#163B33] disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send invite"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-[#B3432B]">{error}</p>}
        </section>

        {pendingInvites.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
              Pending invites
            </h2>
            <div className="flex flex-col gap-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-[#E9CFA0] bg-[#F6E9D3] p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1B1D1F]">
                      {invite.email}
                    </p>
                    <p className="text-xs text-[#6B7069]">{invite.role}</p>
                  </div>
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        revokeInvite(invite.id);
                      })
                    }
                    className="rounded-md border border-[#DEDCD3] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7069] hover:border-[#B9C4BF]"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            Current team ({members.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-[#E1DFD6] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E1DFD6] bg-[#FBFAF7] text-xs uppercase tracking-wide text-[#8A8F87]">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.user_id}
                    className="border-b border-[#E1DFD6] last:border-0"
                  >
                    <td className="px-4 py-3 text-[#1B1D1F]">
                      {memberEmail(m)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7069]">{m.role}</td>
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