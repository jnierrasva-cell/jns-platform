"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const workspaceBenefits = [
  "Manage customer operations in one workspace",
  "Keep essential business tools connected",
  "Activate workflows built for repeatable work",
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
    <main className="relative isolate min-h-full overflow-hidden bg-[#0B132B] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-1/3 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -right-52 -top-28 h-[34rem] w-[34rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 px-10 py-9 lg:flex xl:px-16">
          <Link href="/" className="inline-flex w-fit" aria-label="JNS home">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={160}
              height={60}
              className="h-11 w-auto"
              priority
            />
          </Link>

          <div className="max-w-lg pb-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Journey Network Systems
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
              The connected workspace for your next stage of growth.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Sign in to manage your business tools, customer operations, and
              active automations from one focused place.
            </p>

            <ul className="mt-8 space-y-3">
              {workspaceBenefits.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-cyan-200">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
            Secure access to your business systems
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex" aria-label="JNS home">
                <Image
                  src="/jns-logo.png"
                  alt="JNS Platform"
                  width={140}
                  height={52}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
              {confirmSent ? (
                <div className="space-y-3 text-center">
                  <h2 className="text-xl font-semibold text-white">
                    Check your email
                  </h2>
                  <p className="text-sm leading-6 text-slate-300">
                    We sent a confirmation link to{" "}
                    <span className="font-medium text-white">{email}</span>.
                    Open it to finish creating your account.
                  </p>
                  <button
                    type="button"
                    onClick={() => chooseMode("signin")}
                    className="text-sm text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : resetSent ? (
                <div className="space-y-3 text-center">
                  <h2 className="text-xl font-semibold text-white">
                    Password reset sent
                  </h2>
                  <p className="text-sm leading-6 text-slate-300">
                    If an account exists for{" "}
                    <span className="font-medium text-white">{email}</span>,
                    you’ll receive a link to set a new password.
                  </p>
                  <button
                    type="button"
                    onClick={() => chooseMode("signin")}
                    className="text-sm text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white">
                      {mode === "forgot"
                        ? "Reset your password"
                        : mode === "signup"
                          ? "Create your account"
                          : "Welcome back"}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-400">
                      {mode === "forgot"
                        ? "Enter your email and we’ll send a reset link."
                        : mode === "signup"
                          ? "Start with email and password. You’ll choose account type next."
                          : "Sign in to continue to your workspace."}
                    </p>
                  </div>

                  {mode !== "forgot" && (
                    <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/20 p-1">
                      <button
                        type="button"
                        onClick={() => chooseMode("signin")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                          mode === "signin"
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={() => chooseMode("signup")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                          mode === "signup"
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Sign up
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                        className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                      />
                    </div>

                    {mode !== "forgot" && (
                      <div>
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="password"
                            className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400"
                          >
                            Password
                          </label>
                          {mode === "signin" && (
                            <button
                              type="button"
                              className="text-xs font-medium text-cyan-200 transition hover:text-cyan-100"
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
                          autoComplete={
                            mode === "signup"
                              ? "new-password"
                              : "current-password"
                          }
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Enter your password"
                          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                        />
                      </div>
                    )}

                    {error && (
                      <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-200">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading
                        ? "Please wait..."
                        : mode === "forgot"
                          ? "Send reset link"
                          : mode === "signup"
                            ? "Create your account"
                            : "Sign in to JNS"}
                      {!loading && (
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </form>

                  {mode === "forgot" && (
                    <button
                      type="button"
                      onClick={() => chooseMode("signin")}
                      className="mt-4 w-full text-center text-sm text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                    >
                      Back to sign in
                    </button>
                  )}
                </>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
              Secure access to your business systems
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}