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

function toIsoFromLocal(date: string, time: string) {
  if (!date || !time) return "";
  const local = new Date(`${date}T${time}:00`);
  if (Number.isNaN(local.getTime())) return "";
  return local.toISOString();
}

function formatLocal(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function BookingsClient({
  organizationId,
  bookings,
  contacts,
  smsRemindersEnabled,
  twilioConnected,
  publicBookingPath,
}: {
  organizationId: string;
  bookings: Booking[];
  contacts: Contact[];
  smsRemindersEnabled: boolean;
  twilioConnected: boolean;
  publicBookingPath?: string;
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
    () => toIsoFromLocal(startDate, startTime),
    [startDate, startTime],
  );

  const endsAt = useMemo(() => {
    const d = endDate || startDate;
    return toIsoFromLocal(d, endTime);
  }, [endDate, startDate, endTime]);

  const selectedContact = contacts.find((c) => c.id === contactId) ?? null;
  const missingPhone =
    smsRemindersEnabled &&
    Boolean(contactId) &&
    !selectedContact?.phone?.trim();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!startsAt) {
      setError("Please pick a valid start date and time.");
      return;
    }

    startTransition(async () => {
      try {
        await createBooking({
          organizationId,
          title,
          startsAt,
          endsAt: endsAt || undefined,
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
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
            Calendar
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Times use your browser timezone automatically.
          </p>
          {publicBookingPath && (
            <p className="mt-2 text-xs text-zinc-500">
              Public booking link:{" "}
              <a
                href={publicBookingPath}
                className="text-blue-600 underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                {publicBookingPath}
              </a>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSendReminders}
          className="rounded-lg border border-[#2563EB]/40 bg-zinc-900/15 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-zinc-900/25 disabled:opacity-60"
        >
          {isPending ? "Working…" : "Send due SMS reminders"}
        </button>
      </div>

      {smsRemindersEnabled && !twilioConnected && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          SMS Reminders is on, but Twilio is not connected. Connect Twilio in
          Integrations to send texts.
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-medium text-zinc-900">New booking</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-zinc-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-zinc-700">Contact (optional)</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                  {c.phone ? ` · ${c.phone}` : " · no phone"}
                </option>
              ))}
            </select>
            {missingPhone && (
              <p className="text-xs text-amber-300">
                SMS Reminders is on, but this contact has no phone. Add a phone
                on the contact page or reminders will skip them.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Starts
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-700">Date</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-700">Time</label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white/[0.02] p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Ends
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-700">Date</label>
                <input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-zinc-700">Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-zinc-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create booking"}
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SMS</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No bookings yet. Create one above or share your public booking
                  link.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-zinc-700">
                    <div>{formatLocal(b.starts_at)}</div>
                    {b.ends_at && (
                      <div className="text-xs text-zinc-500">
                        → {formatLocal(b.ends_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{b.title}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {contactLabel(getContact(b))}
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-500">
                    {b.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {b.reminder_sms_sent_at
                      ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "scheduled" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs text-blue-600 underline underline-offset-2"
                          onClick={() =>
                            startTransition(async () => {
                              await updateBookingStatus(b.id, "completed");
                            })
                          }
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-400 underline underline-offset-2"
                          onClick={() =>
                            startTransition(async () => {
                              await updateBookingStatus(b.id, "cancelled");
                            })
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}