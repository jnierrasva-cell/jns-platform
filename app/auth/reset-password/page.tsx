"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

type SupabaseBrowser = ReturnType<typeof createClient>;

export default function AuthResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>("Checking reset link…");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseBrowser | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();
    setSupabase(client);

    async function prepareSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // PKCE / email link: exchange code for a recovery session
        if (code) {
          const { error: exchangeError } =
            await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setError(exchangeError.message);
              setInfo(null);
              setReady(false);
            }
            return;
          }
          // Clean code out of the address bar
          window.history.replaceState({}, "", "/auth/reset-password");
        }

        const { data } = await client.auth.getSession();
        if (!data.session) {
          if (!cancelled) {
            setError(
              "This reset link is invalid or expired. Request a new one from Sign in → Forgot password.",
            );
            setInfo(null);
            setReady(false);
          }
          return;
        }

        if (!cancelled) {
          setReady(true);
          setInfo(null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not open reset link",
          );
          setInfo(null);
          setReady(false);
        }
      }
    }

    prepareSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Auth is still loading. Please try again.");
      return;
    }

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
      window.location.assign("/dashboard");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-[#F4F6FB] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Choose a new password for your JNS account.
          </p>

          {info && <p className="mt-4 text-sm text-slate-500">{info}</p>}

          {error && (
            <div className="mt-4 space-y-2">
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
              <Link href="/login" className="text-sm text-slate-600 underline">
                Back to sign in
              </Link>
            </div>
          )}

          {done && (
            <p className="mt-6 text-sm text-slate-600">
              Password updated. Opening your workspace…
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="text-sm text-slate-700">
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
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="text-sm text-slate-700">
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
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
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
