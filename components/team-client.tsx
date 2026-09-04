"use client";

import { useState, useTransition } from "react";
import { createInvite, revokeInvite } from "@/app/dashboard/team/actions";

type Member = {
  user_id: string;
  role: string;
  profiles:
    | { email: string | null; business_name: string | null }
    | { email: string | null; business_name: string | null }[]
    | null;
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
  const [role, setRole] = useState<"admin" | "assistant" | "member">("member");
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
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        {orgName}
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Team
      </h1>

      {/* Invite form */}
      <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 text-sm font-medium text-white">Invite someone</h2>
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="inviteEmail" className="text-sm text-[#E2E8F0]">
              Email
            </label>
            <input
              id="inviteEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@email.com"
              className="rounded-lg border border-white/12 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inviteRole" className="text-sm text-[#E2E8F0]">
              Role
            </label>
            <select
              id="inviteRole"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-lg border border-white/12 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="member">Member</option>
              <option value="assistant">Assistant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Pending invites
          </h2>
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-white">{invite.email}</p>
                  <p className="text-xs text-[#94A3B8]">{invite.role}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      revokeInvite(invite.id);
                    })
                  }
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition hover:border-white/25 hover:text-white"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Current team */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Current team ({members.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#64748B]">
              <tr>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.user_id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 text-white">{memberEmail(m)}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}