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
