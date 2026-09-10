"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Plus, X } from "lucide-react";
import {
  createContact,
  updateContact,
  sendContactEmail,
  sendContactSms,
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
};

const STAGES = [
  { id: "all", label: "All" },
  { id: "lead", label: "Lead" },
  { id: "booked", label: "Booked" },
  { id: "customer", label: "Customer" },
  { id: "inactive", label: "Inactive" },
] as const;

function displayName(c: Contact) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || c.phone || "Untitled";
}

function stageColor(status: string) {
  switch (status) {
    case "lead":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    case "booked":
      return "border-blue-400/30 bg-blue-400/10 text-blue-100";
    case "customer":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "inactive":
      return "border-white/10 bg-white/[0.04] text-slate-400";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-400";
  }
}

export function ContactsClient({
  organizationId,
  contacts,
  googleConnected,
  twilioConnected,
}: {
  organizationId: string;
  contacts: Contact[];
  googleConnected: boolean;
  twilioConnected: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showAdd, setShowAdd] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<
    "lead" | "booked" | "customer" | "inactive"
  >("lead");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [compose, setCompose] = useState<null | {
    type: "email" | "sms";
    contact: Contact;
  }>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: contacts.length,
      lead: 0,
      booked: 0,
      customer: 0,
      inactive: 0,
    };
    for (const c of contacts) {
      if (map[c.status] !== undefined) map[c.status] += 1;
    }
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (stage !== "all" && c.status !== stage) return false;
      if (!q) return true;
      const hay = [c.first_name, c.last_name, c.email, c.phone, c.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, stage, query]);

  function changeStage(contactId: string, nextStatus: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateContact({
          contactId,
          organizationId,
          status: nextStatus as "lead" | "booked" | "customer" | "inactive",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update stage");
      }
    });
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStatus("lead");
    setNote("");
    setFormError(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await createContact({
          organizationId,
          firstName,
          lastName,
          email,
          phone,
          status,
          note,
        });
        resetForm();
        setShowAdd(false);
        router.push(`/dashboard/contacts/${result.contactId}`);
        router.refresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not create");
      }
    });
  }

  function openEmail(c: Contact) {
    setMenuId(null);
    setError(null);
    if (!googleConnected) {
      setError("Connect Google in Integrations to send email from JNS.");
      return;
    }
    if (!c.email) {
      setError("This contact has no email.");
      return;
    }
    setComposeSubject("");
    setComposeBody("");
    setComposeError(null);
    setComposeSuccess(null);
    setCompose({ type: "email", contact: c });
  }

  function openSms(c: Contact) {
    setMenuId(null);
    setError(null);
    if (!twilioConnected) {
      setError("Connect Twilio in Integrations to send SMS from JNS.");
      return;
    }
    if (!c.phone) {
      setError("This contact has no phone number.");
      return;
    }
    setComposeSubject("");
    setComposeBody("");
    setComposeError(null);
    setComposeSuccess(null);
    setCompose({ type: "sms", contact: c });
  }

  function handleComposeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!compose) return;
    setComposeError(null);
    setComposeSuccess(null);
    const current = compose;
    startTransition(async () => {
      try {
        if (current.type === "email") {
          await sendContactEmail({
            organizationId,
            contactId: current.contact.id,
            subject: composeSubject,
            body: composeBody,
          });
          setComposeSuccess("Email sent.");
        } else {
          await sendContactSms({
            organizationId,
            contactId: current.contact.id,
            body: composeBody,
          });
          setComposeSuccess("SMS sent.");
        }
        setTimeout(() => setCompose(null), 900);
      } catch (err) {
        setComposeError(err instanceof Error ? err.message : "Send failed");
      }
    });
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            CRM
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Contacts
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Pipeline, manual leads, and reach-out from your connected Google and
            Twilio accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setFormError(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add contact
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {STAGES.map((s) => {
          const active = stage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStage(s.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-blue-400/40 bg-blue-500/20 text-blue-100"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-slate-500">{counts[s.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="w-full max-w-md rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-6 overflow-visible rounded-xl border border-white/10 bg-white/[0.035]">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            No contacts in this stage. Use Add contact or share a form.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/contacts/${c.id}`}
                      className="font-medium text-white hover:text-cyan-200"
                    >
                      {displayName(c)}
                    </Link>
                    {(c.tags ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => changeStage(c.id, e.target.value)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium outline-none ${stageColor(c.status)}`}
                    >
                      <option value="lead">Lead</option>
                      <option value="booked">Booked</option>
                      <option value="customer">Customer</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-500">
                    {(c.source ?? "—").replace(/_/g, " ")}
                  </td>
                  <td className="relative z-10 px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuId((id) => (id === c.id ? null : c.id))
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === c.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 z-30 mt-1 w-44 rounded-lg border border-white/10 bg-[#0f1a35] py-1 shadow-xl"
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
                          onClick={() => openEmail(c)}
                        >
                          Send email
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
                          onClick={() => openSms(c)}
                        >
                          Send SMS
                        </button>
                        <Link
                          href={`/dashboard/contacts/${c.id}`}
                          className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
                          onClick={() => setMenuId(null)}
                        >
                          Open contact
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#101a37] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  New contact
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Add to your CRM
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-200">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-200">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-200">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional if phone is set"
                  className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-300/70"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-200">Phone</label>
                <CountryPhoneInput value={phone} onChange={setPhone} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-200">Stage</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as
                        | "lead"
                        | "booked"
                        | "customer"
                        | "inactive",
                    )
                  }
                  className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                >
                  <option value="lead">Lead</option>
                  <option value="booked">Booked</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-200">
                  First note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                />
              </div>

              {formError && <p className="text-sm text-red-300">{formError}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {compose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#101a37] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  {compose.type === "email" ? "Send email" : "Send SMS"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {displayName(compose.contact)}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {compose.type === "email"
                    ? compose.contact.email
                    : compose.contact.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompose(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleComposeSubmit}
              className="mt-6 flex flex-col gap-4"
            >
              {compose.type === "email" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-200">Subject</label>
                  <input
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-200">Message</label>
                <textarea
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
                />
              </div>

              {composeError && (
                <p className="text-sm text-red-300">{composeError}</p>
              )}
              {composeSuccess && (
                <p className="text-sm text-emerald-300">{composeSuccess}</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompose(null)}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {isPending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}