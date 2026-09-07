"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createBooking,
  updateBookingStatus,
  sendBookingRemindersNow,
} from "@/app/dashboard/bookings/actions";

type Contact = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
};

type Booking = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  source: string;
  notes: string | null;
  contact_id: string | null;
  reminder_sms_sent_at?: string | null;
  contacts?: Contact | Contact[] | null;
};

function contactLabel(c?: Contact | null) {
  if (!c) return "—";
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || "—";
}

function getContact(b: Booking): Contact | null {
  if (!b.contacts) return null;
  return Array.isArray(b.contacts) ? b.contacts[0] ?? null : b.contacts;
}

/** Combine date (YYYY-MM-DD) + time (HH:MM) into a local ISO-like value for the server */
function combineDateAndTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export function BookingsClient({
  organizationId,
  bookings,
  contacts,
}: {
  organizationId: string;
  bookings: Booking[];
  contacts: Contact[];
}) {
  const [title, setTitle] = useState("Appointment");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startsAt = useMemo(
    () => combineDateAndTime(startDate, startTime),
    [startDate, startTime],
  );
  const endsAt = useMemo(() => {
    const d = endDate || startDate;
    return combineDateAndTime(d, endTime);
  }, [endDate, startDate, endTime]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await createBooking({
          organizationId,
          title,
          startsAt,
          endsAt: endTime ? endsAt : undefined,
          contactId: contactId || undefined,
          notes: notes || undefined,
        });
        setTitle("Appointment");
        setStartDate("");
        setStartTime("09:00");
        setEndDate("");
        setEndTime("10:00");
        setContactId("");
        setNotes("");
        setSuccess("Booking created.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create");
      }
    });
  }

  function handleSendReminders() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await sendBookingRemindersNow(organizationId);
        setSuccess(
          `Reminders: ${result.sent} sent, ${result.skipped} skipped.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reminder run failed");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
            Calendar
          </span>
          <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Create appointments with date & time. Send SMS reminders for
            upcoming bookings when SMS Reminders is on.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSendReminders}
          className="rounded-lg border border-[#2563EB]/40 bg-[#2563EB]/15 px-4 py-2.5 text-sm font-medium text-[#93C5FD] transition hover:bg-[#2563EB]/25 disabled:opacity-60"
        >
          {isPending ? "Working…" : "Send due SMS reminders"}
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 className="text-sm font-medium text-white">New booking</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-[#E2E8F0]">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-[#E2E8F0]">Contact (optional)</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                  {c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Start */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Starts
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E2E8F0]">Date</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E2E8F0]">Time</label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
            </div>
          </div>

          {/* End */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Ends
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E2E8F0]">Date</label>
                <input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E2E8F0]">Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-[#E2E8F0]">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-[#67E8F9]">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create booking"}
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SMS</th>
              <th className="px-4 py-3"></th>
            </tr>
