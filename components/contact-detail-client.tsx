"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateContact,
  addContactNote,
  setContactPipelineStage,
} from "@/app/dashboard/contacts/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="space-y-8 pb-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-text-muted">
          Client
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          {[firstName, lastName].filter(Boolean).join(" ") || email || "Client"}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {(contact.tags ?? []).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6"
      >
        <h2 className="font-heading text-base font-bold text-foreground">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="min-h-11 rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="min-h-11 rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Journey stage</label>
            <Select
              value={pipelineStageId}
              onChange={(e) => setPipelineStageId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-text-muted">
              Managed in{" "}
              <Link
                href="/dashboard/pipeline"
                className="text-accent-cyan underline underline-offset-2"
              >
                Journey
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-text-secondary">Legacy status</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="lead">Lead</option>
              <option value="booked">Booked</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-text-secondary">Phone</label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs text-text-muted">
              Country defaults from your browser timezone. Enter the local
              number only — country code is on the left.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {saved && <p className="mt-3 text-sm text-success">Saved.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save client"}
        </button>
      </form>

      <section>
        <h2 className="font-heading text-base font-bold text-foreground">
          Notes
        </h2>
        <form
          onSubmit={handleAddNote}
          className="mt-3 rounded-2xl border border-border bg-card p-4"
        >
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            rows={3}
            placeholder="Log a call, follow-up, or internal note…"
          />
          {noteError && (
            <p className="mt-2 text-sm text-danger">{noteError}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="mt-3 min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-inset disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add note"}
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {notes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              No notes yet. Add the first one above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-foreground">
          Schedule
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          {bookings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              No bookings for this contact yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.title}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(b.starts_at).toLocaleString()} · {b.status}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/bookings"
                    className="inline-flex min-h-11 items-center text-sm text-accent-cyan underline underline-offset-2"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-foreground">
          Email activity
        </h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              No email activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {row.subject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {row.direction === "inbound" ? "Received" : "Sent"} ·{" "}
                        {row.status}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-text-muted">
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}