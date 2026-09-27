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

  function handleRevoke(inviteId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await revokeInvite(inviteId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke");
      }
    });
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
        Invite with a private link. They must use the exact email you enter.
        Each link works once.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-medium">How invitees join</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-amber-800">
          <li>You create the invite and copy the link.</li>
          <li>
            They open the link → Sign up / Sign in with that email → return to
            the same link → Join workspace.
          </li>
          <li>They should see this workspace under My orgs.</li>
        </ol>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

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
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Pending invites ({pendingInvites.length})
        </h2>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending invites.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{inv.email}</p>
                  <p className="text-xs text-zinc-500">
                    {roleLabel(inv.role)} · {appOrigin}/invite/{inv.token}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inv)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    {copiedId === inv.id ? "Copied" : "Copy invite link"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRevoke(inv.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Current team ({members.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-zinc-500">
                    No members yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.user_id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 text-zinc-900">{memberEmail(m)}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {roleLabel(m.role)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
