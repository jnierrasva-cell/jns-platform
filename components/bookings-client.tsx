"use client";

import { CalendarDays } from "lucide-react";
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reminder run failed");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-slate-500">
            Calendar
          </span>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Schedule
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Times use your browser timezone automatically.
          </p>
          {publicBookingPath && (
            <p className="mt-2 text-xs text-slate-500">
              Public booking link:{" "}
              <a
                href={publicBookingPath}
                className="text-sky-600 underline underline-offset-2"
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
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-600 transition hover:bg-sky-100 disabled:opacity-60"
        >
          {isPending ? "Working…" : "Send due SMS reminders"}
        </button>
      </div>

      {smsRemindersEnabled && !twilioConnected && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          SMS Reminders is on, but Twilio is not connected. Connect Twilio in
          Integrations to send texts.
        </p>
      )}

      <form
        id="new-booking"
        onSubmit={handleCreate}
        className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-6"
      >
        <h2 className="text-sm font-medium text-slate-900">New appointment</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-slate-700">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-slate-700">Contact (optional)</label>
            <select
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setSendEmailNotification(false);
              }}
              className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                  {c.phone ? ` · ${c.phone}` : " · no phone"}
                </option>
              ))}
            </select>
            {selectedContact?.email && (
              <label className="flex items-start gap-2 text-sm text-slate-700">
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
            )}
            {missingPhone && (
              <p className="text-xs text-amber-700">
                SMS Reminders is on, but this contact has no phone. Add a phone
                on the contact page or reminders will skip them.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Starts
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Date</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Time</label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Ends
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Date</label>
                <input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create appointment"}
        </button>
      </form>

      {bookings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarDays}
            title="No schedule items yet"
            description="Schedule client sessions here. Times follow the visitor’s browser timezone. Share your public booking link when you’re ready."
            actionLabel="Scroll to create"
            onAction={() => {
              document
                .getElementById("new-booking")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3 md:hidden">
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
                    <p className="mt-1 text-xs text-slate-500">
                      {contactLabel(getContact(b))}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">
                    {b.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Reminder:{" "}
                  {b.reminder_sms_sent_at
                    ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                    : "—"}
                </p>
                {b.status === "scheduled" && (
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      className="min-h-[44px] text-xs font-medium text-sky-600 underline underline-offset-2"
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
                      className="min-h-[44px] text-xs font-medium text-red-600 underline underline-offset-2"
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
              </li>
            ))}
          </ul>
          <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200/80 text-xs uppercase tracking-wide text-slate-500">
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
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-700">
                      <div>{formatLocal(b.starts_at)}</div>
                      {b.ends_at && (
                        <div className="text-xs text-slate-500">
                          → {formatLocal(b.ends_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{b.title}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {contactLabel(getContact(b))}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">
                      {b.status}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {b.reminder_sms_sent_at
                        ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === "scheduled" && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs text-sky-600 underline underline-offset-2"
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
                            className="text-xs text-red-600 underline underline-offset-2"
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
