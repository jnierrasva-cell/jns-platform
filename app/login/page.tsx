"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <div className="flex min-h-full items-center justify-center bg-[#F6F5F1] px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
        </div>

        <div className="rounded-lg border border-[#E1DFD6] bg-white p-8">
          {confirmSent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-[#1B1D1F]">
                Check your email to confirm your account.
              </p>
              <p className="text-sm text-[#6B7069]">
                Once confirmed, come back and sign in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmSent(false);
                  setMode("signin");
                }}
                className="mt-2 text-sm text-[#1F4D42] underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex rounded-md border border-[#E1DFD6] bg-[#F6F5F1] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className={`flex-1 rounded-sm py-1.5 text-sm transition-colors ${
                    mode === "signin"
                      ? "bg-white text-[#1B1D1F] shadow-sm"
                      : "text-[#6B7069]"
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
                  className={`flex-1 rounded-sm py-1.5 text-sm transition-colors ${
                    mode === "signup"
                      ? "bg-white text-[#1B1D1F] shadow-sm"
                      : "text-[#6B7069]"
                  }`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-sm text-[#1B1D1F]">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm text-[#1B1D1F]"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#B3432B]">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 rounded-md bg-[#1F4D42] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#163B33] disabled:opacity-60"
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
      </div>
    </div>
  );
}