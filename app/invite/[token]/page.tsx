"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { joinWithInvite } from "./actions";

type InviteInfo = {
  organization_name: string;
  role: string;
  email: string;
  status: string;
};

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

      const { data, error: rpcError } = await supabase
        .rpc("get_invite_info", { invite_token: token })
        .maybeSingle();

      if (rpcError || !data) {
        setError(
          "This invite link isn’t valid or has expired. Ask the workspace owner for a new one.",
        );
        setInvite(null);
      } else {
        setInvite(data as InviteInfo);
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
            "You’re not signed in. Create an account or sign in with the invited email, then open this link again.",
          );
        } else {
          setError(msg);
        }
      }
    });
  }

  const loginHref = invite
    ? `/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/invite/${token}`)}`
    : "/login";

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight text-zinc-900"
          >
            JNS
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
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
                  Create an account or sign in with{" "}
                  <strong>{invite.email}</strong> (exact email).
                </li>
                <li>Come back to this same invite link.</li>
                <li>Click <strong>Join workspace</strong> below.</li>
              </ol>

              {!userEmail ? (
                <div className="mt-6 space-y-3">
                  <Link
                    href={loginHref}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Step 1 — Sign up / Sign in
                  </Link>
                  <p className="text-xs text-zinc-400">
                    After you sign in, open this invite link again to finish.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    Signed in as{" "}
                    <span className="font-medium text-zinc-900">{userEmail}</span>
                  </p>
                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleJoin}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {isPending ? "Joining…" : "Join workspace"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
