"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "./actions";

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
      try {
        // 1) Server: validate invite, create/update user + password, join org
        const { email } = await acceptInvite(token, password);

        // 2) Browser: establish session cookies
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session && !signInData.session) {
          setError(
            "Account is ready but session was not created. Try Sign in on /login with the same email and password.",
          );
          return;
        }

        // 3) Full navigation so proxy/layout see cookies
        window.location.href = "/dashboard";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invite");
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
                Already joined?{" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>
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
                Create a password for{" "}
                <span className="font-medium text-zinc-800">{invite.email}</span>
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-zinc-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
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