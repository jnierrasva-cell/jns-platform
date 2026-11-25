"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Mail,
  NotebookPen,
  UserRound,
} from "lucide-react";
import {
  saveContactDetails,
  addContactNote,
} from "@/app/dashboard/contacts/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { EmptyState } from "@/components/empty-state";
import PageHeader from "@/components/ui/PageHeader";

type Contact = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  tags?: string[] | null;
  last_contacted_at: string | null;
  created_at: string;
  pipeline_stage_id?: string | null;
};

type Stage = {
  id: string;
  name: string;
  slug: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

type Activity = {
  id: string;
  direction: string;
  subject: string | null;
  from_email: string | null;
  to_email: string | null;
  status: string;
  created_at: string;
};

type Booking = {
  id: string;
  title: string;
  starts_at: string;
  status: string;
};

type Note = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  booked: "Booked",
  customer: "Customer",
  inactive: "Inactive",
};

export function ContactDetailClient({
  organizationId,
  contact,
  stages,
  activity,
  bookings,
  notes: initialNotes,
}: {
  organizationId: string;
  contact: Contact;
  stages: Stage[];
  activity: Activity[];
  bookings: Booking[];
  notes: Note[];
}) {
  const [firstName, setFirstName] = useState(contact.first_name ?? "");
  const [lastName, setLastName] = useState(contact.last_name ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [status, setStatus] = useState(contact.status);
  const [pipelineStageId, setPipelineStageId] = useState(
    contact.pipeline_stage_id ?? "",
  );
  const [committed, setCommitted] = useState({
    firstName: contact.first_name ?? "",
    lastName: contact.last_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    status: contact.status,
    pipelineStageId: contact.pipeline_stage_id ?? "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isAddingNote, startNoteTransition] = useTransition();

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    email ||
    phone ||
    "Contact";

  const stageName =
    stages.find((s) => s.id === pipelineStageId)?.name ?? null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const prev = committed;
    const next = {
      firstName,
      lastName,
      email,
      phone,
      status,
      pipelineStageId,
    };
    setCommitted(next);
    startSaveTransition(async () => {
      try {
        await saveContactDetails({
          contactId: contact.id,
          organizationId,
          firstName,
          lastName,
          email,
          phone,
          status: status as "lead" | "booked" | "customer" | "inactive",
          pipelineStageId: pipelineStageId || null,
        });
        setSaved(true);
      } catch (err) {
        setCommitted(prev);
        setFirstName(prev.firstName);
        setLastName(prev.lastName);
        setEmail(prev.email);
        setPhone(prev.phone);
        setStatus(prev.status);
        setPipelineStageId(prev.pipelineStageId);
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    setNoteError(null);
    setNoteSaved(false);
    const body = noteBody.trim();
    if (!body) {
      setNoteError("Write a short note first.");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const optimistic: Note = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      created_by: null,
    };
    setNotes((prev) => [optimistic, ...prev]);
    setNoteBody("");
    startNoteTransition(async () => {
      try {
        const created = await addContactNote({
          organizationId,
          contactId: contact.id,
          body,
        });
        setNotes((prev) =>
          prev.map((n) =>
            n.id === tempId
              ? {
                  id: created.id,
                  body: created.body,
                  created_at: created.created_at,
                  created_by: null,
                }
              : n,
          ),
        );
        setNoteSaved(true);
      } catch (err) {
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        setNoteBody(body);
        setNoteError(err instanceof Error ? err.message : "Could not add note");
      }
    });
  }

  return (
    <div className="pb-4">
      <PageHeader
        backHref="/dashboard/contacts"
        backLabel="Back to Clients"
        eyebrow="Client"
        title={displayName}
        description="Update details, move them through your journey, and keep notes in one place."
      />

      <section className="mt-5 flex flex-wrap items-center gap-2">
        {stageName ? (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
            {stageName}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
            No journey stage
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
          {STATUS_LABEL[status] ?? status}
        </span>
        {contact.source ? (
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
            {contact.source}
          </span>
        ) : null}
        {(contact.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {contact.last_contacted_at
            ? `Last contact ${formatDate(contact.last_contacted_at)}`
            : `Added ${formatDate(contact.created_at) ?? ""}`}
        </span>
      </section>

      <form
        onSubmit={handleSave}
        className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900">Details</h2>
          {isSaving ? (
            <span className="ml-auto text-xs font-medium text-sky-600">
              Saving…
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Journey stage
            </label>
            <select
              value={pipelineStageId}
              onChange={(e) => setPipelineStageId(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Unassigned</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Stages are managed in{" "}
              <Link
                href="/dashboard/pipeline"
                className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
              >
                Journey
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="lead">Lead</option>
              <option value="booked">Booked</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs text-slate-500">
              Country defaults from your browser timezone. Enter the local
              number only — country code is on the left.
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-4 text-sm font-medium text-emerald-700">
            Saved. Changes are live on Journey and Clients.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/dashboard/pipeline"
            className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            Open Journey board
          </Link>
        </div>
      </form>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
        </div>

        <form
          onSubmit={handleAddNote}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
        >
          <label htmlFor="contact-note" className="sr-only">
            Add a note
          </label>
          <textarea
            id="contact-note"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={3}
            placeholder="Log a call, follow-up, or internal note…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          {noteError ? (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {noteError}
            </p>
          ) : null}
          {noteSaved ? (
            <p role="status" className="mt-2 text-sm font-medium text-emerald-700">
              Note added.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isAddingNote}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {isAddingNote ? "Adding…" : "Add note"}
          </button>
        </form>

        <div className="mt-4">
          {notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No notes yet"
              description="Capture calls, follow-ups, and context here so anyone on the team can pick up the thread."
            />
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100">
              {notes.map((n) => (
                <li key={n.id} className="px-4 py-3.5 sm:px-5">
                  <p className="text-sm whitespace-pre-wrap text-slate-700">
                    {n.body}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    {formatDateTime(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
            <h2 className="text-sm font-semibold text-slate-900">Bookings</h2>
          </div>
          <Link
            href="/dashboard/bookings"
            className="text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            All bookings
          </Link>
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No bookings yet"
            description="When this person books time, sessions will show up here. You can also create bookings from Schedule."
            actionLabel="Open Schedule"
            href="/dashboard/bookings"
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {b.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDateTime(b.starts_at)} · {b.status}
                  </p>
                </div>
                <Link
                  href="/dashboard/bookings"
                  className="shrink-0 text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900">
            Email activity
          </h2>
        </div>

        {activity.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email activity yet"
            description="Sent and received messages linked to this person will appear here once Google is connected and mail is flowing."
            actionLabel="Open Connections"
            href="/dashboard/integrations"
            secondaryLabel="Email rules"
            secondaryHref="/dashboard/email-rules"
          />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100">
            {activity.map((row) => (
              <li key={row.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.subject || "(no subject)"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.direction === "inbound" ? "Received" : "Sent"} ·{" "}
                      {row.status}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(row.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
