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
        setError("This invite link isn't valid.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setUserEmail(sessionData.session?.user?.email ?? null);

      const { data, error: rpcError } = await supabase
        .rpc("get_invite_info", { invite_token: token })
        .maybeSingle();

      if (rpcError || !data) {
        setError(rpcError?.message || "This invite link isn't valid.");
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
          setError("Sign in first with the invited email, then open this link again.");
        } else {
          setError(msg);
        }
      }
    });
  }

  const loginHref = invite
    ? `/login?email=${encodeURIComponent(invite.email)}`
    : "/login";

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-tight text-zinc-900"
          >
            JNS
          </Link>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-8">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading invite…</p>
          ) : !invite || invite.status !== "pending" ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                {error ?? "This invite is no longer valid."}
              </p>
              <Link href="/login" className="text-sm text-zinc-600 underline">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-zinc-900">
                Join {invite.organization_name}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Role: <span className="font-medium">{invite.role}</span>
                <br />
                Invited email:{" "}
                <span className="font-medium text-zinc-800">{invite.email}</span>
              </p>

              {!userEmail ? (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-zinc-600">
                    Create an account or sign in with{" "}
                    <strong>{invite.email}</strong>, then open this invite link
                    again.
                  </p>
                  <Link
                    href={loginHref}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Sign up / Sign in first
                  </Link>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-zinc-600">
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