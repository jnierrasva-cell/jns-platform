"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/redirect.mjs";
import { BrandMark } from "@/components/brand-mark";
import { saveSignupNames } from "./actions";

const workspaceBenefits = [
  "Contacts under your rules — not every email as a lead",
  "Bookings and intake on the same workspace",
  "Follow-up on accounts you connect (Google, SMS, and more)",
];

type Mode = "signin" | "signup" | "forgot";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(
    searchParams.get("next"),
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("next")?.includes("/invite/") ? "signup" : "signin",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(
    () => searchParams.get("email")?.trim() ?? "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "auth_callback"
      ? "We couldn’t complete sign in. The link may have expired; please try again."
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

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

      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      if (!trimmedFirstName || !trimmedLastName) {
        setError("Enter your first and last name.");
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: trimmedFirstName,
              last_name: trimmedLastName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback${
              nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
            }`,
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (signUpData.session) {
        await saveSignupNames(trimmedFirstName, trimmedLastName);
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

      await saveSignupNames(trimmedFirstName, trimmedLastName);
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
    <main className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden lg:flex-row">
      {/* LEFT: brand panel */}
      <section className="flex w-full flex-col justify-between bg-[#0B132B] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-screen lg:w-[42%] lg:max-w-xl lg:px-12 lg:py-12">
        <div>
          <BrandMark href="/" className="h-9 w-auto" />
          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:mt-14">
            Journey Network Systems
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            One workspace for clients, bookings, and follow-up
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Built for service businesses — with rules so the system stays clean.
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
          © {new Date().getFullYear()} Journey Network Systems
        </p>
      </section>

      {/* RIGHT: form */}
      <section className="flex min-h-[70vh] w-full flex-1 items-center justify-center bg-zinc-50 px-4 py-10 sm:px-8 lg:min-h-screen">
        <div className="w-full max-w-sm">
          {nextPath?.startsWith("/invite/") && (
            <p className="mb-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-center text-xs text-sky-900">
              After you create your account, you’ll return to the invite to join
              the workspace.
            </p>
          )}

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(11,19,43,0.35)] sm:p-7">
            <div className="flex justify-center gap-8 text-sm">
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
              <p className="mt-6 text-center text-sm text-zinc-600">
                Check your email to confirm your account, then sign in.
              </p>
            ) : resetSent ? (
              <p className="mt-6 text-center text-sm text-zinc-600">
                If that email exists, a reset link was sent.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {mode === "signup" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-zinc-700">
                        First name
                      </label>
                      <input
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B132B]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-700">
                        Last name
                      </label>
                      <input
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B132B]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#0B132B] focus:ring-2 focus:ring-[#0B132B]/10"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <label className="text-sm font-medium text-zinc-700">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#0B132B] focus:ring-2 focus:ring-[#0B132B]/10"
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
                  className="w-full rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#111e3a] disabled:opacity-60"
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
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => chooseMode("forgot")}
                      className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {mode === "forgot" && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => chooseMode("signin")}
                      className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                    >
                      Back to sign in
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            <Link
              href="/"
              className="underline-offset-2 hover:text-zinc-600 hover:underline"
            >
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
        <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}