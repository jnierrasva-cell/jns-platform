"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

const workspaceBenefits = [
  "Contacts under your rules — not every email as a lead",
  "Bookings and intake on the same workspace",
  "Follow-up on accounts you connect (Google, SMS, and more)",
];

type Mode = "signin" | "signup" | "forgot";

function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
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
        afterAuthRedirect("/onboarding/account-type");
        return;
      }

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
      <section className="relative flex w-full flex-col justify-between bg-[#0B132B] px-8 py-10 text-white lg:max-w-md lg:px-10 lg:py-12">
        <div>
          <BrandMark href="/" />
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            Journey Network Systems
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            One workspace for clients, bookings, and follow-up
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            For service businesses and the people who run them — with rules so
            the system stays clean.
          </p>
          <ul className="mt-8 space-y-3">
            {workspaceBenefits.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-sm leading-5 text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-xs text-slate-500 lg:mt-0">
          JNS · Private pilot
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
        <div className="w-full max-w-sm">
          {nextPath?.startsWith("/invite/") && (
            <p className="mb-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
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
                    ? "font-medium text-[#0B132B]"
                    : "text-zinc-500 hover:text-zinc-800"
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => chooseMode("signup")}
                className={
                  mode === "signup"
                    ? "font-medium text-[#0B132B]"
                    : "text-zinc-500 hover:text-zinc-800"
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
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
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
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
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
                  className="w-full rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
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
                    className="text-xs text-zinc-500 underline hover:text-zinc-800"
                  >
                    Forgot password?
                  </button>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            <Link href="/" className="underline hover:text-zinc-600">
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
