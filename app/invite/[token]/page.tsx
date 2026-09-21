"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { consumeInvite } from "./actions";

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
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("This invite link isn't valid.");
        setLoading(false);
        return;
      }

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

    loadInvite();
  }, [token, supabase]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invite || !token) return;
    setError(null);

    startTransition(async () => {
      // 1) Try sign up
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: invite.email,
          password,
        });

      // 2) If already registered → sign in with same password
      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        const already =
          msg.includes("already") ||
          msg.includes("registered") ||
          msg.includes("exists");

        if (!already) {
          setError(signUpError.message);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInError) {
          setError(
            signInError.message ||
              "Account exists — check the password and try again.",
          );
          return;
        }
      } else if (!signUpData.session) {
        // Confirm-email still ON: try sign-in anyway
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInError) {
          setError(
            "Account created but not signed in. Turn off Confirm email in Supabase, or sign in from /login then open this invite link again.",
          );
          return;
        }
      }

      // 3) Join org + mark invite accepted
      try {
        await consumeInvite(token);
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not join the team",
        );
      }
    });
  }

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
              <p className="text-sm text-zinc-500">
                If you already joined,{" "}
                <Link href="/login" className="underline">
                  sign in
                </Link>{" "}
                instead.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-zinc-900">
                Join {invite.organization_name}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Role: <span className="font-medium">{invite.role}</span>
                <br />
                Use password for{" "}
                <span className="font-medium text-zinc-800">{invite.email}</span>
                . If you already have an account, enter that password to join.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-zinc-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isPending ? "Joining…" : "Accept invite & open dashboard"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}