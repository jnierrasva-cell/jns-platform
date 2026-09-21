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
  token: string;
  created_at: string;
};

function memberEmail(m: Member) {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return p?.business_name || p?.email || "Unknown";
}

function roleLabel(role: string) {
  if (role === "ceo") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "assistant") return "Assistant";
  if (role === "member") return "Member";
  return role;
}

export function TeamClient({
  orgId,
  orgName,
  members,
  invites,
  appOrigin,
}: {
  orgId: string;
  orgName: string;
  members: Member[];
  invites: Invite[];
  appOrigin: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "assistant" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
        setError(err instanceof Error ? err.message : "Could not create invite");
      }
    });
  }

  async function copyInviteLink(invite: Invite) {
    const link = `${appOrigin}/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy — select the link manually");
    }
  }

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Team
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        {orgName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Invite people with a private link. Only the email you enter can use it,
        and each link works once.
      </p>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Invite someone</h2>
        <form
          onSubmit={handleInvite}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label htmlFor="inviteEmail" className="text-sm text-zinc-700">
              Email
            </label>
            <input
              id="inviteEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div className="sm:w-40">
            <label htmlFor="inviteRole" className="text-sm text-zinc-700">
              Role
            </label>
            <select
              id="inviteRole"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "assistant" | "member")
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="admin">Admin</option>
              <option value="assistant">Assistant</option>
              <option value="member">Member</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Create invite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {pendingInvites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            Pending invites
          </h2>
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => {
              const link = `${appOrigin}/invite/${invite.token}`;
              return (
                <div
                  key={invite.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {invite.email}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {roleLabel(invite.role)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => copyInviteLink(invite)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                      >
                        {copiedId === invite.id ? "Copied" : "Copy invite link"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            revokeInvite(invite.id);
                          })
                        }
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">
                    {link}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
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
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 text-zinc-900">{memberEmail(m)}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {roleLabel(m.role)}
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