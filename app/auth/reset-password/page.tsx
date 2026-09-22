"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

export default function AuthResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>("Checking reset link…");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function prepareSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE / email link: exchange code for a recovery session
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            setInfo(null);
            setReady(false);
            return;
          }
          // Clean code out of the address bar
          window.history.replaceState({}, "", "/auth/reset-password");
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError(
            "This reset link is invalid or expired. Request a new one from Sign in → Forgot password.",
          );
          setInfo(null);
          setReady(false);
          return;
        }

        setReady(true);
        setInfo(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open reset link");
        setInfo(null);
        setReady(false);
      }
    }

    prepareSession();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-[380px]">
        <BrandMark />
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-zinc-900">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Choose a new password for your JNS account.
          </p>

          {info && <p className="mt-4 text-sm text-zinc-500">{info}</p>}

          {error && (
            <div className="mt-4 space-y-2">
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
              <Link href="/login" className="text-sm text-zinc-600 underline">
                Back to sign in
              </Link>
            </div>
          )}

          {done && (
            <p className="mt-6 text-sm text-zinc-600">
              Password updated. Opening your workspace…
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="text-sm text-zinc-700">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="text-sm text-zinc-700">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}