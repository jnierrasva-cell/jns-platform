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

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

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
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setConfirmSent(true);
  }

  function chooseMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError(null);
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
              Sign in to manage your business tools, customer operations, and active automations from one focused place.
            </p>
            <ul className="mt-8 space-y-3.5 text-sm text-slate-300">
              {workspaceBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            Secure access to your JNS workspace
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" aria-label="JNS home">
                <Image
                  src="/jns-logo.png"
                  alt="JNS Platform"
                  width={160}
                  height={60}
                  className="h-10 w-auto"
                  priority
                />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
              >
                Back to site <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#101a37]/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
              {confirmSent ? (
                <div className="py-5 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                    <Check className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-5 text-xl font-semibold text-white">Check your inbox</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    We sent a confirmation email to <span className="font-medium text-slate-100">{email}</span>. Once confirmed, come back and sign in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmSent(false);
                      chooseMode("signin");
                    }}
                    className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                  >
                    Back to sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    {mode === "signin" ? "Welcome back" : "Get started"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    {mode === "signin" ? "Sign in to your workspace" : "Create your JNS account"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {mode === "signin"
                      ? "Continue where your business work comes together."
                      : "Set up secure access to your connected business workspace."}
                  </p>

                  <div className="mt-7 flex rounded-xl border border-white/10 bg-[#0B132B]/65 p-1">
                    <button
                      type="button"
                      onClick={() => chooseMode("signin")}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        mode === "signin"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseMode("signup")}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                        mode === "signup"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    <div>
                      <label htmlFor="email" className="text-sm font-medium text-slate-200">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@company.com"
                        className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <label htmlFor="password" className="text-sm font-medium text-slate-200">
                          Password
                        </label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            className="text-xs font-medium text-cyan-200 transition hover:text-cyan-100"
                            onClick={() => alert("Password reset coming soon")}
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
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                      />
                    </div>

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
                        : mode === "signin"
                          ? "Sign in to JNS"
                          : "Create your account"}
                      {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </form>
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
