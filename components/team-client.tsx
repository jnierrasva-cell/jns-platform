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
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
        {orgName}
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Team
      </h1>

      {/* Invite form */}
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-medium text-zinc-900">Invite someone</h2>
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="inviteEmail" className="text-sm text-zinc-700">
              Email
            </label>
            <input
              id="inviteEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@email.com"
              className="rounded-lg border border-white/12 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inviteRole" className="text-sm text-zinc-700">
              Role
            </label>
            <select
              id="inviteRole"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-lg border border-white/12 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="member">Member</option>
              <option value="assistant">Assistant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
            Pending invites
          </h2>
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{invite.email}</p>
                  <p className="text-xs text-zinc-500">{invite.role}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => {
                      revokeInvite(invite.id);
                    })
                  }
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900"
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
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Current team ({members.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
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
                  <td className="px-4 py-3 text-zinc-900">{memberEmail(m)}</td>
                  <td className="px-4 py-3 text-zinc-500">{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}