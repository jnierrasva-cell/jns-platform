"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { updateContact } from "@/app/dashboard/contacts/actions";

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
  return name || c.email || "Untitled";
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
}: {
  organizationId: string;
  contacts: Contact[];
}) {
  const [stage, setStage] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function changeStage(contactId: string, status: Contact["status"]) {
    setError(null);
    startTransition(async () => {
      try {
        await updateContact({
          contactId,
          organizationId,
          status: status as "lead" | "booked" | "customer" | "inactive",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update stage");
      }
    });
  }

  return (
    <div className="pb-4">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          CRM
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Contacts
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Move people through your pipeline and open any contact for notes,
          bookings, and email history.
        </p>
      </div>

      {/* Stage filters */}
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
      {isPending && (
        <p className="mt-2 text-xs text-slate-500">Updating pipeline…</p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">
            No contacts in this stage.
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 last:border-0"
                >
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}