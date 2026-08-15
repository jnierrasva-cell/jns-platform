"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // If Supabase didn't return a session, email confirmation is
      // required before the account can log in.
      if (!data.session) {
        setCheckEmail(true);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-[#10131a] flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <span className="font-semibold text-xl tracking-tight text-[#edeae3]">
            JN<span className="text-[#d9a253]">System</span>
          </span>
          <div className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-8 mt-8">
            <div className="w-12 h-12 rounded-full bg-[#d9a253]/10 text-[#d9a253] flex items-center justify-center mx-auto mb-5 text-xl">
              ✉
            </div>
            <h1 className="text-lg font-semibold text-[#edeae3] mb-2">
              Registration complete
            </h1>
            <p className="text-sm text-[#a8a6a0]">
              Check <span className="text-[#edeae3]">{email}</span> for a
              confirmation link. Once confirmed, log in with the email and
              password you just used to finish setting up your account.
            </p>
            <button
              onClick={() => {
                setCheckEmail(false);
                setMode("login");
              }}
              className="mt-6 w-full rounded-md border border-[#2c3140] py-2.5 text-sm text-[#edeae3] hover:border-[#3a4155] transition-colors"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10131a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-semibold text-xl tracking-tight text-[#edeae3]">
            JN<span className="text-[#d9a253]">System</span>
          </span>
          <p className="text-sm text-[#a8a6a0] mt-2">
            {mode === "login"
              ? "Log in to manage your automations."
              : "Create your account to get started."}
          </p>
        </div>

        <div className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-[#a8a6a0] mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business"
                  className="w-full rounded-md bg-[#232838] border border-[#2c3140] px-3 py-2 text-sm text-[#edeae3] placeholder:text-[#5a5f6e] outline-none focus:border-[#d9a253] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-[#a8a6a0] mb-1.5">
                Business email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="w-full rounded-md bg-[#232838] border border-[#2c3140] px-3 py-2 text-sm text-[#edeae3] placeholder:text-[#5a5f6e] outline-none focus:border-[#d9a253] transition-colors"
              />
              <p className="text-[11px] text-[#5a5f6e] mt-1.5">
                Use the Google Workspace email you&apos;ll automate — required
                for current integrations.
              </p>
            </div>
            <div>
              <label className="block text-xs text-[#a8a6a0] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md bg-[#232838] border border-[#2c3140] px-3 py-2 text-sm text-[#edeae3] placeholder:text-[#5a5f6e] outline-none focus:border-[#d9a253] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#d9a253] text-[#10131a] py-2.5 text-sm font-semibold hover:bg-[#e6b167] transition-colors disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Log in"
                : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#2c3140]" />
            <span className="text-[11px] text-[#5a5f6e] font-mono">OR</span>
            <div className="h-px flex-1 bg-[#2c3140]" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-[#2c3140] py-2.5 text-sm text-[#edeae3] hover:border-[#3a4155] transition-colors"
          >
            Continue with Google
          </button>
        </div>

        <p className="text-center text-sm text-[#a8a6a0] mt-6">
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-[#d9a253] hover:underline"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}