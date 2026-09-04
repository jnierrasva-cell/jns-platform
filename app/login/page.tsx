"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setConfirmSent(true);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      {/* Soft ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[40%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB]/12 blur-[130px]" />
      </div>

      <div className="relative w-full max-w-[380px]">
        {/* Logo + context */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={160}
              height={60}
              className="mx-auto h-12 w-auto"
              priority
            />
          </Link>
          <p className="mt-4 text-sm text-[#94A3B8]">
            {mode === "signin"
              ? "Sign in to your workspace"
              : "Create your workspace account"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          {confirmSent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm font-medium text-white">
                Check your email to confirm your account.
              </p>
              <p className="text-sm text-[#94A3B8]">
                Once confirmed, come back and sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmSent(false);
                  setMode("signin");
                }}
                className="mt-3 text-sm text-[#60A5FA] underline underline-offset-2 transition hover:text-[#93C5FD]"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mb-7 flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === "signin"
                      ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === "signup"
                      ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  Create account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[#E2E8F0]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="rounded-lg border border-white/15 bg-[#0B132B]/70 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/35"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-[#E2E8F0]"
                    >
                      Password
                    </label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs text-[#60A5FA] transition hover:text-[#93C5FD]"
                        onClick={() => {
                          // Placeholder – wire up later if needed
                          alert("Password reset coming soon");
                        }}
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-lg border border-white/15 bg-[#0B132B]/70 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/35"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#1D4ED8] hover:shadow-[#2563EB]/40 disabled:opacity-60"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Small trust line */}
        <p className="mt-6 text-center text-xs text-[#64748B]">
          Secure access to your business systems
        </p>
      </div>
    </div>
  );
}