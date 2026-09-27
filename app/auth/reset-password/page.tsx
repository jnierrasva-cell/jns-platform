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
    <main className="flex min-h-screen items-center justify-center bg-[#0B132B] px-6 py-12">
      <div className="w-full max-w-[380px]">
        <BrandMark />
        <div className="jns-card mt-8 p-6">
          <h1 className="text-lg font-semibold text-white">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-[#94A3B8]">
            Choose a new password for your JNS account.
          </p>

          {info && <p className="mt-4 text-sm text-[#94A3B8]">{info}</p>}

          {error && (
            <div className="mt-4 space-y-2">
              <p className="rounded-md border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
              <Link href="/login" className="text-sm text-[#2563EB] underline">
                Back to sign in
              </Link>
            </div>
          )}

          {done && (
            <p className="mt-6 text-sm text-[#94A3B8]">
              Password updated. Opening your workspace…
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="text-sm text-[#94A3B8]">
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
                  className="mt-1 w-full rounded-lg border border-[#1e2a4a] bg-[#111e3a] px-3 py-2 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="text-sm text-[#94A3B8]">
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
                  className="mt-1 w-full rounded-lg border border-[#1e2a4a] bg-[#111e3a] px-3 py-2 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
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