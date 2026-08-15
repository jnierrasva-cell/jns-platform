"use client";

import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

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
          <form className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-[#a8a6a0] mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
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
                placeholder="••••••••"
                className="w-full rounded-md bg-[#232838] border border-[#2c3140] px-3 py-2 text-sm text-[#edeae3] placeholder:text-[#5a5f6e] outline-none focus:border-[#d9a253] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-[#d9a253] text-[#10131a] py-2.5 text-sm font-semibold hover:bg-[#e6b167] transition-colors"
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#2c3140]" />
            <span className="text-[11px] text-[#5a5f6e] font-mono">OR</span>
            <div className="h-px flex-1 bg-[#2c3140]" />
          </div>

          <button className="w-full flex items-center justify-center gap-2 rounded-md border border-[#2c3140] py-2.5 text-sm text-[#edeae3] hover:border-[#3a4155] transition-colors">
            Continue with Google
          </button>
        </div>

        <p className="text-center text-sm text-[#a8a6a0] mt-6">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-[#d9a253] hover:underline"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}