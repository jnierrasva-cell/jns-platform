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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase text-text-muted">
            Schedule
          </span>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
            Schedule
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Times use your browser timezone automatically.
          </p>
          {publicBookingPath && (
            <p className="mt-3 text-sm text-text-secondary">
              Public booking link:{" "}
              <a
                href={publicBookingPath}
                className="text-accent-cyan underline underline-offset-2"
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
          className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-surface-inset disabled:opacity-60"
        >
          {isPending ? "Working…" : "Send due SMS reminders"}
        </button>
      </div>

      {smsRemindersEnabled && !twilioConnected && (
        <p className="rounded-xl border border-attention/30 bg-attention/10 px-4 py-3 text-sm text-attention">
          SMS Reminders is on, but Twilio is not connected. Connect Twilio in
          Integrations to send texts.
        </p>
      )}

      <form
        id="new-booking"
        onSubmit={handleCreate}
        className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
      >
        <h2 className="font-heading text-base font-bold text-foreground">New booking</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-text-secondary">Title</label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-text-secondary">Contact (optional)</label>
            <Select
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setSendEmailNotification(false);
              }}
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactLabel(c)}
                  {c.phone ? ` · ${c.phone}` : " · no phone"}
                </option>
              ))}
            </Select>
            {selectedContact?.email && (
              <label className="flex min-h-11 items-center gap-3 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="h-5 w-5 accent-accent-cyan"
                />
                <span>
                  Send this contact a Google Calendar email invitation
                  <span className="block text-xs text-text-muted">
                    Off by default. They will receive an invitation at{" "}
                    {selectedContact.email} if enabled.
                  </span>
                </span>
              </label>
            )}
            {missingPhone && (
              <p className="text-xs text-attention">
                SMS Reminders is on, but this contact has no phone. Add a phone
                on the contact page or reminders will skip them.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface-inset p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-text-muted">
              Starts
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Date</label>
                <Input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Time</label>
                <Input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-inset p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-text-muted">
              Ends
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Date</label>
                <Input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-text-secondary">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        {success && <p className="mt-3 text-sm text-success" role="status">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create booking"}
        </button>
      </form>

      {bookings.length === 0 ? (
        <div>
          <EmptyState
            icon={CalendarDays}
            title="No schedule items yet"
            description="Schedule client sessions here. Times follow your browser timezone. Share your public booking link when you’re ready."
            actionLabel="Scroll to create"
            onAction={() => {
              document
                .getElementById("new-booking")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card text-card-foreground">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border bg-surface-inset text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SMS</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-text-secondary">
                    <div>{formatLocal(b.starts_at)}</div>
                    {b.ends_at && (
                      <div className="text-xs text-text-muted">
                        → {formatLocal(b.ends_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{b.title}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {contactLabel(getContact(b))}
                  </td>
                  <td className="px-4 py-3 capitalize text-text-secondary">
                    <Badge variant={b.status === "scheduled" ? "default" : "secondary"}>
                      {b.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {b.reminder_sms_sent_at
                      ? `Sent ${formatLocal(b.reminder_sms_sent_at)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "scheduled" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center text-sm text-accent-cyan underline underline-offset-2"
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
                          className="inline-flex min-h-11 items-center text-sm text-danger underline underline-offset-2"
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
      )}
    </div>
  );
}