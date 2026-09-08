"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateContact } from "@/app/dashboard/contacts/actions";
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

export function ContactDetailClient({
  organizationId,
  contact,
  activity,
  bookings,
}: {
  organizationId: string;
  contact: Contact;
  activity: Activity[];
  bookings: Booking[];
}) {
  const [firstName, setFirstName] = useState(contact.first_name ?? "");
  const [lastName, setLastName] = useState(contact.last_name ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [status, setStatus] = useState(contact.status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="mt-4">
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Contact
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        {[firstName, lastName].filter(Boolean).join(" ") || email || "Contact"}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {(contact.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="inline-flex rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-0.5 text-xs text-[#93C5FD]"
          >
            {tag}
          </span>
        ))}
      </div>

      <form
        onSubmit={handleSave}
        className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 className="text-sm font-medium text-white">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-[#E2E8F0]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="lead">Lead</option>
              <option value="booked">Booked</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-sm text-[#E2E8F0]">Phone</label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs text-[#64748B]">
              Country defaults from your browser timezone. Enter the local
              number only — country code is on the left.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {saved && <p className="mt-3 text-sm text-[#67E8F9]">Saved.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save contact"}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Bookings
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {bookings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#94A3B8]">
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
                    <p className="text-sm font-medium text-white">{b.title}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {new Date(b.starts_at).toLocaleString()} · {b.status}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/bookings"
                    className="text-xs text-[#60A5FA] underline underline-offset-2"
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
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Email activity
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No email activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {activity.map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {row.subject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        {row.direction === "inbound" ? "Received" : "Sent"} ·{" "}
                        {row.status}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-[#64748B]">
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