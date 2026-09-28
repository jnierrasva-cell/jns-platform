"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

const workspaceBenefits = [
  "Contacts and pipeline in one list",
  "Bookings, forms, and follow-up on the same record",
  "Automations that run on your connected accounts",
];

type Mode = "signin" | "signup" | "forgot";

function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  // Only same-origin relative paths (block open redirects)
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const qEmail = searchParams.get("email");
    if (qEmail) setEmail(qEmail.trim());

    // Invited users should land on signup first
    if (searchParams.get("next")?.includes("/invite/")) {
      setMode("signup");
    }
  }, [searchParams]);

  function afterAuthRedirect(fallback: string) {
    window.location.href = nextPath || fallback;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
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
            "No session created. Confirm email should be OFF in Supabase Auth.",
          );
          return;
        }

        afterAuthRedirect("/dashboard");
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
        // Invited → back to invite link; otherwise normal onboarding
        afterAuthRedirect("/onboarding/account-type");
        return;
      }

      // No session → try sign-in (confirm email off) or show confirm message
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError || !signInData.session) {
        setConfirmSent(true);
        return;
      }

      afterAuthRedirect("/onboarding/account-type");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
    <main className="flex min-h-full flex-col lg:flex-row">
      <section className="hidden w-full max-w-md flex-col justify-between bg-zinc-900 px-10 py-12 text-white lg:flex">
        <BrandMark inverted href="/" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Run the business from one workspace
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Contacts, bookings, automations, and team access — without juggling
            five tools.
          </p>
          <ul className="mt-8 space-y-3">
            {workspaceBenefits.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-zinc-500">JNS · Private pilot</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark href="/" />
          </div>

          {nextPath?.startsWith("/invite/") && (
            <p className="mb-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
              After you create your account, you’ll return to the invite to join
              the workspace.
            </p>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => chooseMode("signin")}
                className={
                  mode === "signin"
                    ? "font-medium text-zinc-900"
                    : "text-zinc-500"
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => chooseMode("signup")}
                className={
                  mode === "signup"
                    ? "font-medium text-zinc-900"
                    : "text-zinc-500"
                }
              >
                Create account
              </button>
            </div>

            {confirmSent ? (
              <p className="mt-6 text-sm text-zinc-600">
                Check your email to confirm, or turn off Confirm email in
                Supabase Auth so signup can sign you in immediately.
              </p>
            ) : resetSent ? (
              <p className="mt-6 text-sm text-zinc-600">
                If that email exists, a reset link was sent.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm text-zinc-700">Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label className="text-sm text-zinc-700">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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
                    className="text-xs text-zinc-500 underline"
                  >
                    Forgot password?
                  </button>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            <Link href="/" className="underline">
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}