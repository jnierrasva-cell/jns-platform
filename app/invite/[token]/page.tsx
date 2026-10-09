"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getInviteInfo, joinWithInvite, type InviteInfo } from "./actions";

function roleLabel(role: string) {
  if (role === "ceo") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "assistant") return "Assistant";
  return "Member";
}

export default function InvitePage() {
  const params = useParams();
  const token = String(params?.token ?? "");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!token) {
        setError("This invite link isn’t valid.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setUserEmail(sessionData.session?.user?.email ?? null);

      const result = await getInviteInfo(token);
      if (!result.ok) {
        setError(result.error);
        setInvite(null);
      } else {
        setInvite(result.invite);
        setError(null);
      }
      setLoading(false);
    }

    load();
  }, [token, supabase]);

  function handleJoin() {
    if (!token) return;
    setError(null);

    startTransition(async () => {
      try {
        await joinWithInvite(token);
        window.location.href = "/dashboard";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not join";
        if (msg === "NOT_SIGNED_IN") {
          setError(
            "You’re not signed in. Use the button below with the invited email, then open this link again.",
          );
        } else {
          setError(msg);
        }
      }
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = `/invite/${token}`;
  }

  const loginHref = invite
    ? `/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/invite/${token}`)}`
    : "/login";

  const emailMatches =
    userEmail &&
    invite &&
    userEmail.trim().toLowerCase() === invite.email.trim().toLowerCase();

  const canJoin =
    invite?.status === "pending" && Boolean(userEmail) && emailMatches;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight text-zinc-900"
          >
            JNS
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading invite…</p>
          ) : !invite || invite.status !== "pending" ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                {error ?? "This invite is no longer valid."}
              </p>
              <p className="text-sm text-zinc-500">
                Already joined?{" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
                , then open <strong>My orgs</strong> and select the workspace.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-zinc-900">
                You’re invited to {invite.organization_name}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Role:{" "}
                <span className="font-medium text-zinc-800">
                  {roleLabel(invite.role)}
                </span>
                <br />
                This link only works for{" "}
                <span className="font-medium text-zinc-800">{invite.email}</span>
              </p>

              <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
                <li>
                  Sign up or sign in with <strong>{invite.email}</strong> only.
                </li>
                <li>Return to this page (or use the same link again).</li>
                <li>
                  Click <strong>Join workspace</strong>.
                </li>
              </ol>

              {!userEmail ? (
                <div className="mt-6 space-y-3">
                  <Link
                    href={loginHref}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Step 1 — Sign up / Sign in
                  </Link>
                  <p className="text-center text-xs text-zinc-400">
                    After auth you’ll come back here automatically.
                  </p>
                </div>
              ) : !emailMatches ? (
                <div className="mt-6 space-y-3">
                  <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    You’re signed in as <strong>{userEmail}</strong>, but this
                    invite is for <strong>{invite.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Sign out and use the invited email
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-xs text-zinc-500">
                    Signed in as <strong>{userEmail}</strong>
                  </p>
                  <button
                    type="button"
                    disabled={isPending || !canJoin}
                    onClick={handleJoin}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isPending ? "Joining…" : "Join workspace"}
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}