"use client";

import { useMemo, useState, useTransition } from "react";
import { submitPublicBooking } from "@/app/book/[orgSlug]/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";

function toIsoFromLocal(date: string, time: string) {
  if (!date || !time) return "";
  const local = new Date(`${date}T${time}:00`);
  if (Number.isNaN(local.getTime())) return "";
  return local.toISOString();
}

export function PublicBookingClient({
  organizationId,
  businessName,
}: {
  organizationId: string;
  businessName: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const startsAt = useMemo(() => toIsoFromLocal(date, time), [date, time]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await submitPublicBooking({
          organizationId,
          name,
          email,
          phone,
          startsAt,
          notes,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B132B] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
            Booked
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
            You’re on the calendar
          </h1>
          <p className="mt-3 text-sm text-[#94A3B8]">
            Thanks, {name.split(" ")[0] || "there"}. Check your email for a
            calendar invite from {businessName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B132B] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
          Book with
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
          {businessName}
        </h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Pick a time and we’ll confirm by email.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Your name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Phone (optional)</label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#E2E8F0]">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-[#E2E8F0]">Time</label>
              <input
                required
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {isPending ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      </div>
    </div>
  );
}