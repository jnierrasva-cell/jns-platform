"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/redirect.mjs";
import { BrandMark } from "@/components/brand-mark";
import { saveSignupNames } from "./actions";

const workspaceBenefits = [
  "Contacts under your rules — not every email as a lead",
  "Bookings and intake on the same workspace",
  "Follow-up on accounts you connect (Google, SMS, and more)",
];

const inputClassName =
  "mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#0B132B] focus:ring-2 focus:ring-[#0B132B]/10 [color-scheme:light] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#18181b] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]";

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "auth_callback"
      ? "We couldn’t complete sign in. The link may have expired; please try again."
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  function afterAuthRedirect(fallback: string) {
    window.location.href = nextPath || fallback;
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback${
        nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
      }`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "online",
            prompt: "select_account",
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
      // On success the browser navigates away to Google.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGoogleLoading(false);
    }
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
    setShowPassword(false);
    setError(null);
    setConfirmSent(false);
    setResetSent(false);
  }

  const heading =
    mode === "forgot"
      ? "Reset password"
      : mode === "signup"
        ? "Create your account"
        : "Welcome back";
  const subtext =
    mode === "forgot"
      ? "Enter your email and we’ll send a reset link."
      : mode === "signup"
        ? "Start a free workspace for clients, bookings, and follow-up."
        : "Sign in to your Journey Network Systems workspace.";

  const busy = loading || googleLoading;

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
      <section className="relative flex min-h-[70vh] w-full flex-1 items-center justify-center bg-zinc-50 px-4 py-10 sm:px-8 lg:min-h-screen">
        <Link
          href="/"
          className="absolute right-4 top-4 text-xs font-medium text-zinc-500 transition hover:text-zinc-800 sm:right-8 sm:top-6"
        >
          ← Back to home
        </Link>

        <div className="w-full max-w-sm">
          {nextPath?.startsWith("/invite/") && (
            <p className="mb-4 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-center text-xs text-sky-900">
              After you create your account, you’ll return to the invite to join
              the workspace.
            </p>
          )}

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(11,19,43,0.35)] sm:p-7">
            {/* Segmented mode switcher — hidden on forgot */}
            {mode !== "forgot" && (
              <div
                className="grid grid-cols-2 rounded-full bg-zinc-100 p-1"
                role="tablist"
                aria-label="Sign in or create account"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  onClick={() => chooseMode("signin")}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === "signin"
                      ? "bg-white text-[#0B132B] shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  onClick={() => chooseMode("signup")}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    mode === "signup"
                      ? "bg-white text-[#0B132B] shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Create account
                </button>
              </div>
            )}

            <div className={mode === "forgot" ? "" : "mt-6"}>
              <h2 className="text-lg font-semibold tracking-tight text-[#0B132B]">
                {heading}
              </h2>
              <p className="mt-1 text-sm leading-5 text-zinc-500">{subtext}</p>
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
              <>
                {/* Google OAuth — additive; same /auth/callback pipeline */}
                {mode !== "forgot" && (
                  <div className="mt-6 space-y-4">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleMark />
                      {googleLoading
                        ? "Redirecting…"
                        : mode === "signup"
                          ? "Continue with Google"
                          : "Continue with Google"}
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-200" />
                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        or
                      </span>
                      <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  className={mode === "forgot" ? "mt-6 space-y-4" : "space-y-4"}
                >
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
                          className={inputClassName}
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
                          className={inputClassName}
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
                      className={inputClassName}
                    />
                  </div>

                  {mode !== "forgot" && (
                    <div>
                      <label className="text-sm font-medium text-zinc-700">
                        Password
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          type={
                            mode === "signin" && showPassword
                              ? "text"
                              : "password"
                          }
                          required
                          minLength={8}
                          autoComplete={
                            mode === "signin"
                              ? "current-password"
                              : "new-password"
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClassName} mt-0 pr-11`}
                        />
                        {mode === "signin" && (
                          <button
                            type="button"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            aria-pressed={showPassword}
                            onClick={() =>
                              setShowPassword((visible) => !visible)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B132B]"
                          >
                            {showPassword ? (
                              <EyeOff aria-hidden="true" size={18} />
                            ) : (
                              <Eye aria-hidden="true" size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-600" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
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
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
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
