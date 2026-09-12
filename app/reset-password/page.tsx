"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B132B] px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={140}
              height={52}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-white">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Choose a new password for your JNS account.
          </p>
        </div>

        {done ? (
          <p className="text-center text-sm text-slate-300">
            Password updated. Taking you to your workspace…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
              />
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update password"}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}