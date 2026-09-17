"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateContact,
  addContactNote,
  setContactPipelineStage,
} from "@/app/dashboard/contacts/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";

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

export function ContactDetailClient({
  organizationId,
  contact,
  stages,
  activity,
  bookings,
  notes,
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
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateContact({
          contactId: contact.id,
          organizationId,
          firstName,
          lastName,
          email,
          phone,
          status: status as "lead" | "booked" | "customer" | "inactive",
        });
        await setContactPipelineStage({
          organizationId,
          contactId: contact.id,
          stageId: pipelineStageId || null,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    setNoteError(null);
    startTransition(async () => {
      try {
        await addContactNote({
          organizationId,
          contactId: contact.id,
          body: noteBody,
        });
        setNoteBody("");
      } catch (err) {
        setNoteError(err instanceof Error ? err.message : "Could not add note");
      }
    });
  }

  return (
    <div className="mt-4">
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
        Contact
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        {[firstName, lastName].filter(Boolean).join(" ") || email || "Contact"}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {(contact.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="inline-flex rounded-full border border-[#2563EB]/30 bg-zinc-900/10 px-2.5 py-0.5 text-xs text-blue-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <form
        onSubmit={handleSave}
        className="mt-8 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 className="text-sm font-medium text-zinc-900">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Pipeline stage</label>
            <select
              value={pipelineStageId}
              onChange={(e) => setPipelineStageId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Unassigned</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Managed in{" "}
              <Link
                href="/dashboard/pipeline"
                className="text-cyan-700 underline underline-offset-2"
              >
                Pipeline
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-700">Legacy status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="lead">Lead</option>
              <option value="booked">Booked</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-zinc-700">Phone</label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs text-zinc-500">
              Country defaults from your browser timezone. Enter the local
              number only — country code is on the left.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {saved && <p className="mt-3 text-sm text-emerald-600">Saved.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save contact"}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Notes
        </h2>
        <form
          onSubmit={handleAddNote}
          className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"
        >
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={3}
            placeholder="Log a call, follow-up, or internal note…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          {noteError && (
            <p className="mt-2 text-sm text-red-400">{noteError}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="mt-3 rounded-lg border border-[#2563EB]/40 bg-zinc-900/15 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-zinc-900/25 disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add note"}
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {notes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No notes yet. Add the first one above.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {notes.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap text-zinc-700">
                    {n.body}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Bookings
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {bookings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No bookings for this contact yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {bookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{b.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(b.starts_at).toLocaleString()} · {b.status}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/bookings"
                    className="text-xs text-blue-600 underline underline-offset-2"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
          Email activity
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No email activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {activity.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {row.subject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {row.direction === "inbound" ? "Received" : "Sent"} ·{" "}
                        {row.status}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-500">
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}