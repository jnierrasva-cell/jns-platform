"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Placeholder — Supabase auth wiring lands in Step 2.
    console.log(`${mode} submitted (not yet wired to Supabase)`);
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
          <div className="mb-6 flex rounded-md border border-[#E1DFD6] bg-[#F6F5F1] p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
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
              onClick={() => setMode("signup")}
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
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="business"
                  className="text-sm text-[#1B1D1F]"
                >
                  Business name
                </label>
                <input
                  id="business"
                  type="text"
                  placeholder="ilovemypilates"
                  className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-[#1B1D1F]">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@studio.com"
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm text-[#1B1D1F]">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>

            <button
              type="submit"
              className="mt-2 rounded-md bg-[#1F4D42] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#163B33]"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#8A8F87]">
          Not wired to real accounts yet — Step 2 connects this to Supabase.
        </p>
      </div>
    </div>
  );
}
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
