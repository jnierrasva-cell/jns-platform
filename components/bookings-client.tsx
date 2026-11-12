"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

function contactLabel(c?: Contact | null) {
  if (!c) return "—";
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || "—";
}

function getContact(b: Booking): Contact | null {
  if (!b.contacts) return null;
  return Array.isArray(b.contacts) ? (b.contacts[0] ?? null) : b.contacts;
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

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "scheduled") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }
  if (s === "completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (s === "cancelled" || s === "canceled") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  return "bg-slate-50 text-slate-600 ring-slate-200";
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
  const router = useRouter();
  const [title, setTitle] = useState("Appointment");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [contactId, setContactId] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
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
        const result = await createBooking({
          organizationId,
          title,
          startsAt,
          endsAt: endsAt || undefined,
          contactId: contactId || undefined,
          notes: notes || undefined,
          sendEmailNotification,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setTitle("Appointment");
        setStartDate("");
        setStartTime("09:00");
        setEndDate("");
        setEndTime("10:00");
        setContactId("");
        setSendEmailNotification(false);
        setNotes("");
        setSuccess("Booking created.");
        router.refresh();
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
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reminder run failed");
      }
    });
  }

  function setStatus(bookingId: string, status: "completed" | "cancelled") {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await updateBookingStatus(bookingId, status);
        setSuccess(
          status === "completed"
            ? "Marked completed."
            : "Booking cancelled.",
        );
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not update booking",
        );
      }
    });
  }

  function contactCell(b: Booking) {
    const c = getContact(b);
    if (!c) return <span className="text-slate-400">—</span>;
    const label = contactLabel(c);
    if (c.id) {
      return (
        <Link
          href={`/dashboard/contacts/${c.id}`}
          className="font-medium text-slate-700 underline-offset-2 hover:text-sky-700 hover:underline"
        >
          {label}
        </Link>
      );
    }
    return <span className="text-slate-600">{label}</span>;
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Schedule
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Bookings
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">
            Create appointments, track status, and send SMS reminders. Times use
            your browser timezone.
          </p>
          {publicBookingPath ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>Public booking link:</span>
              <a
                href={publicBookingPath}
                className="inline-flex items-center gap-1 font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                target="_blank"
                rel="noreferrer"
              >
                {publicBookingPath}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSendReminders}
          className={secondaryBtn}
        >
          {isPending ? "Working…" : "Send due SMS reminders"}
        </button>
      </div>

      {smsRemindersEnabled && !twilioConnected ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">SMS reminders need Twilio</p>
          <p className="mt-1 text-amber-900/90">
            Reminders are on, but Twilio is not connected yet.
          </p>
          <Link
            href="/dashboard/integrations"
            className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            Open Connections →
          </Link>
        </div>
      ) : null}

      <form
        id="new-booking"
        onSubmit={handleCreate}
        className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-sm font-semibold text-slate-900">New appointment</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Contact (optional)
            </label>
            <select
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setSendEmailNotification(false);
              }}
              className={inputClass}
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                  {c.phone ? ` · ${c.phone}` : " · no phone"}
                </option>
              ))}
            </select>
            {selectedContact?.email ? (
              <label className="mt-1 flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="mt-1 accent-sky-600"
                />
                <span>
                  Send this contact a Google Calendar email invitation
                  <span className="block text-xs text-slate-500">
                    Off by default. They will receive an invitation at{" "}
                    {selectedContact.email} if enabled.
                  </span>
                </span>
              </label>
            ) : null}
            {missingPhone ? (
              <p className="text-xs text-amber-700">
                SMS Reminders is on, but this contact has no phone. Add a phone
                on the contact page or reminders will skip them.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Starts
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Time
                </label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Ends
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>
                <input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} min-h-0`}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="mt-4 text-sm font-medium text-emerald-700">
            {success}
          </p>
        ) : null}

        <button type="submit" disabled={isPending} className={`mt-5 ${primaryBtn}`}>
          {isPending ? "Saving…" : "Create appointment"}
        </button>
      </form>

      {bookings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="Create an appointment above, or share your public booking link so clients can request time themselves."
            actionLabel="Create appointment"
            onAction={() => {
              document
                .getElementById("new-booking")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            secondaryLabel={publicBookingPath ? "Open public link" : undefined}
            secondaryHref={publicBookingPath}
          />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="mt-6 space-y-3 md:hidden">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{b.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatLocal(b.starts_at)}
                    </p>
                    {b.ends_at ? (
                      <p className="text-xs text-slate-400">
                        → {formatLocal(b.ends_at)}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-sm">{contactCell(b)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${statusBadge(b.status)}`}
                  >
                    {b.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  SMS reminder:{" "}
                  {b.reminder_sms_sent_at
                    ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                    : "Not sent"}
                </p>
                {b.status === "scheduled" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      className={secondaryBtn}
                      onClick={() => setStatus(b.id, "completed")}
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      onClick={() => setStatus(b.id, "cancelled")}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SMS</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-4 py-3.5 text-slate-700">
                      <div className="font-medium text-slate-900">
                        {formatLocal(b.starts_at)}
                      </div>
                      {b.ends_at ? (
                        <div className="text-xs text-slate-500">
                          → {formatLocal(b.ends_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {b.title}
                    </td>
                    <td className="px-4 py-3.5">{contactCell(b)}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${statusBadge(b.status)}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {b.reminder_sms_sent_at
                        ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {b.status === "scheduled" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            className={secondaryBtn}
                            onClick={() => setStatus(b.id, "completed")}
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            onClick={() => setStatus(b.id, "cancelled")}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
