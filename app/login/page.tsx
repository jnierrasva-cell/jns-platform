"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      );
      setLoading(false);

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setResetSent(true);
      return;
    }

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setConfirmSent(true);
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setConfirmSent(false);
    setResetSent(false);
  }

  return (
    <main className="grid min-h-full bg-white lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-zinc-200 bg-zinc-50 px-10 py-8 lg:flex xl:px-14">
        <BrandMark />
        <div className="max-w-md pb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Sign in to your workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Manage contacts, bookings, forms, and automations from one place.
          </p>
          <ul className="mt-8 space-y-2.5 text-sm text-zinc-600">
            {workspaceBenefits.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-zinc-400">Journey Network Systems</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          {confirmSent ? (
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Check your email</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                We sent a confirmation link to{" "}
                <span className="font-medium text-zinc-900">{email}</span>.
              </p>
              <button type="button" onClick={() => chooseMode("signin")} className="jns-link mt-4">
                Back to sign in
              </button>
            </div>
          ) : resetSent ? (
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Reset email sent</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                If an account exists for{" "}
                <span className="font-medium text-zinc-900">{email}</span>, you’ll
                get a link to set a new password.
              </p>
              <button type="button" onClick={() => chooseMode("signin")} className="jns-link mt-4">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-zinc-900">
                {mode === "forgot"
                  ? "Reset password"
                  : mode === "signup"
                    ? "Create an account"
                    : "Welcome back"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {mode === "forgot"
                  ? "Enter your email and we’ll send a reset link."
                  : mode === "signup"
                    ? "Start with email and password. You’ll choose account type next."
                    : "Enter your email and password."}
              </p>

              {mode !== "forgot" && (
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => chooseMode("signin")}
                    className={`rounded px-3 py-1.5 text-sm font-medium ${
                      mode === "signin" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseMode("signup")}
                    className={`rounded px-3 py-1.5 text-sm font-medium ${
                      mode === "signup" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                    }`}
                  >
                    Sign up
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="jns-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@studio.com"
                    className="jns-input"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                        Password
                      </label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                          onClick={() => chooseMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="jns-input"
                    />
                  </div>
                )}

                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="jns-btn w-full">
                  {loading
                    ? "Please wait..."
                    : mode === "forgot"
                      ? "Send reset link"
                      : mode === "signup"
                        ? "Create account"
                        : "Sign in"}
                </button>
              </form>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => chooseMode("signin")}
                  className="jns-link mt-4 w-full text-center"
                >
                  Back to sign in
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
