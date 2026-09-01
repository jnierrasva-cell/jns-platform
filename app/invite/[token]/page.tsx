"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { consumeInvite } from "./actions";

type InviteInfo = {
  organization_name: string;
  role: string;
  email: string;
  status: string;
};

export default function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadInvite() {
      const { data, error } = await supabase
        .rpc("get_invite_info", { invite_token: token })
        .single();

      if (error || !data) {
        setError("This invite link isn't valid.");
      } else {
        setInvite(data as InviteInfo);
      }
      setLoading(false);
    }
    loadInvite();
  }, [token, supabase]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invite) return;
    setError(null);

    startTransition(async () => {
      const { error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      try {
        await consumeInvite(token);
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join the team");
      }
    });
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
          {loading ? (
            <p className="text-sm text-[#6B7069]">Loading invite…</p>
          ) : !invite || invite.status !== "pending" ? (
            <p className="text-sm text-[#B3432B]">
              {error ?? "This invite has already been used or revoked."}
            </p>
          ) : (
            <>
              <h1 className="text-lg font-medium text-[#1B1D1F]">
                Join {invite.organization_name}
              </h1>
              <p className="mt-1.5 text-sm text-[#6B7069]">
                You've been invited as {invite.role}. Set a password to
                finish joining.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-[#1B1D1F]">Email</label>
                  <input
                    type="email"
                    value={invite.email}
                    disabled
                    className="rounded-md border border-[#DEDCD3] bg-[#F6F5F1] px-3 py-2 text-sm text-[#6B7069]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm text-[#1B1D1F]">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
                  />
                </div>
                {error && <p className="text-sm text-[#B3432B]">{error}</p>}
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 rounded-md bg-[#1F4D42] py-2.5 text-sm font-medium text-white hover:bg-[#163B33] disabled:opacity-60"
                >
                  {isPending ? "Joining…" : "Join team"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}