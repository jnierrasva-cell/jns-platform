"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

const workspaceBenefits = [
  "Contacts and pipeline in one list",
  "Bookings, forms, and follow-up on the same record",
  "Automations that run on your connected accounts",
];

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          },
        );
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setResetSent(true);
        return;
      }

      if (mode === "signin") {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        if (!data.session) {
          setError(
            "No session created. Check Supabase → Auth → Email → Confirm email is OFF.",
          );
          return;
        }

        window.location.href = "/dashboard";
        return;
      }

      // signup
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (signUpData.session) {
        window.location.href = "/onboarding/account-type";
        return;
      }

      // No session = confirm email still on, or needs sign-in
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInData.session) {
        window.location.href = "/onboarding/account-type";
        return;
      }

      if (signInError) {
        setError(signInError.message);
        return;
      }

      setConfirmSent(true);
    } finally {
      setLoading(false);
    }
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setConfirmSent(false);
    setResetSent(false);
  }

  return (
    <main className="grid min-h-full bg-[#0B132B] lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-[#1e2a4a] bg-[#080f22] px-10 py-8 lg:flex xl:px-14">
        <BrandMark />
        <div className="max-w-md pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {mode === "signin" ? "Sign in to your workspace" : "Welcome to JNS"}
          </h1>
          <ul className="mt-6 space-y-2">
            {workspaceBenefits.map((b) => (
              <li key={b} className="text-sm text-[#94A3B8]">
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[#64748B]">JNSystem</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => chooseMode("signin")}
              className={
                mode === "signin"
                  ? "font-medium text-white"
                  : "text-[#94A3B8]"
              }
            >
              Sign in
            </button>
            <span className="text-[#1e2a4a]">·</span>
            <button
              type="button"
              onClick={() => chooseMode("signup")}
              className={
                mode === "signup"
                  ? "font-medium text-white"
                  : "text-[#94A3B8]"
              }
            >
              Sign up
            </button>
          </div>

          {confirmSent ? (
            <p className="mt-6 text-sm text-[#94A3B8]">
              Check your email to confirm, or turn off Confirm email in Supabase
              Auth settings.
            </p>
          ) : resetSent ? (
            <p className="mt-6 text-sm text-[#94A3B8]">
              If that email exists, a reset link was sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-[#94A3B8]">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1e2a4a] bg-[#111e3a] px-3 py-2 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="text-sm text-[#94A3B8]">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#1e2a4a] bg-[#111e3a] px-3 py-2 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {loading
                  ? "Please wait…"
                  : mode === "forgot"
                    ? "Send reset link"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => chooseMode("forgot")}
                  className="text-xs text-[#2563EB] underline"
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}