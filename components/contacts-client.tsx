"use client";

import {
  Contact as ContactIcon,
  Download,
  MoreVertical,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContact,
  updateContact,
  sendContactEmail,
  sendContactSms,
  importContactsCsv,
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

function displayName(c: Contact) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || c.phone || "Untitled";
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function headerIndex(headers: string[], names: string[]) {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = normalized.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function ContactsClient({
  organizationId,
  contacts,
  stages,
  googleConnected,
  twilioConnected,
}: {
  organizationId: string;
  contacts: Contact[];
  stages: Stage[];
  googleConnected: boolean;
  twilioConnected: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
      if (!menuRef.current.contains(e.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stages) map.set(s.id, s.name);
    return map;
  }, [stages]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: contacts.length };
    for (const s of stages) map[s.id] = 0;
    for (const c of contacts) {
      if (c.pipeline_stage_id && map[c.pipeline_stage_id] !== undefined) {
        map[c.pipeline_stage_id] += 1;
      }
    }
    return map;
  }, [contacts, stages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (stageFilter !== "all" && c.pipeline_stage_id !== stageFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [c.first_name, c.last_name, c.email, c.phone, c.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, stageFilter, query]);

  function changePipelineStage(contactId: string, stageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setContactPipelineStage({
          organizationId,
          contactId,
          stageId: stageId || null,
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
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        if (stages[0]?.id) {
          try {
            await setContactPipelineStage({
              organizationId,
              contactId: result.contactId,
              stageId: stages[0].id,
            });
          } catch {
            resetForm();
            setShowAdd(false);
            setError(
              "Contact was created, but it could not be assigned to the first journey stage.",
            );
            router.refresh();
            return;
          }
        }
        resetForm();
        setShowAdd(false);
        router.push(`/dashboard/contacts/${result.contactId}`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setFormError(
          message.startsWith("Minified React error #")
            ? "Could not create contact. Please try again."
            : message || "Could not create contact. Please try again.",
        );
      }
    });
  }

  function exportCsv() {
    const header = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "pipeline_stage",
      "status",
      "source",
      "created_at",
    ];
    const lines = [header.join(",")];
    for (const c of filtered) {
      lines.push(
        [
          csvEscape(c.first_name ?? ""),
          csvEscape(c.last_name ?? ""),
          csvEscape(c.email ?? ""),
          csvEscape(c.phone ?? ""),
          csvEscape(
            c.pipeline_stage_id
              ? stageNameById.get(c.pipeline_stage_id) ?? ""
              : "",
          ),
          csvEscape(c.status ?? ""),
          csvEscape(c.source ?? ""),
          csvEscape(c.created_at ?? ""),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jns-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    setError(null);
    setInfo(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const matrix = parseCsv(text);
        if (matrix.length < 2) {
          setError("CSV needs a header row and at least one data row");
          return;
        }
        const headers = matrix[0];
        const iFirst = headerIndex(headers, ["first_name", "firstname", "first"]);
        const iLast = headerIndex(headers, ["last_name", "lastname", "last"]);
        const iEmail = headerIndex(headers, ["email", "e-mail"]);
        const iPhone = headerIndex(headers, ["phone", "mobile", "phone_number"]);
        const iStatus = headerIndex(headers, ["status", "stage"]);

        const rows = matrix.slice(1).map((r) => ({
          firstName: iFirst >= 0 ? r[iFirst] : "",
          lastName: iLast >= 0 ? r[iLast] : "",
          email: iEmail >= 0 ? r[iEmail] : "",
          phone: iPhone >= 0 ? r[iPhone] : "",
          status: iStatus >= 0 ? r[iStatus] : "lead",
        }));

        startTransition(async () => {
          try {
            const result = await importContactsCsv({
              organizationId,
              rows,
            });
            setInfo(
              `Import done: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
            );
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
          }
        });
      } catch {
        setError("Could not read that CSV file");
      }
    };
    reader.readAsText(file);
  }

  function openEmail(c: Contact) {
    setMenuId(null);
    setError(null);
    if (!googleConnected) {
      setError("Connect Google in Connections to send email from JNS.");
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
      setError("Connect Twilio in Connections to send SMS from JNS.");
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
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Clients
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Clients
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Filter and move people through{" "}
            <Link
              href="/dashboard/pipeline"
              className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
            >
              your journey
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            id="import"
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setShowAdd(true);
              setFormError(null);
            }}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add client
          </button>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="group"
            aria-label="Filter clients by journey stage"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={stageFilter === "all"}
              onClick={() => setStageFilter("all")}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-xs font-medium transition ${
                stageFilter === "all"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] text-slate-500">
                {counts.all ?? 0}
              </span>
            </button>
            {stages.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={stageFilter === s.id}
                onClick={() => setStageFilter(s.id)}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-xs font-medium transition ${
                  stageFilter === s.id
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.name}
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] text-slate-500">
                  {counts[s.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Search clients"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone…"
                className="min-h-[44px] w-full rounded-xl border border-slate-200/80 bg-white pl-9 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
        </div>
      </section>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {info && <p className="mt-3 text-sm text-emerald-700">{info}</p>}

      <div className="mt-6">
        {contacts.length === 0 ? (
          <EmptyState
            icon={ContactIcon}
            title="No clients yet"
            description="People from forms, bookings, and email land here. Add someone manually or import a CSV to start."
            actionLabel="Add client"
            onAction={() => setShowAdd(true)}
            secondaryLabel="Import CSV"
            secondaryHref="#import"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Nothing in this stage or search. Clear filters or try another name."
            actionLabel="Show all"
            onAction={() => {
              setStageFilter("all");
              setQuery("");
            }}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <table
              aria-label="Clients"
              className="w-full min-w-[720px] table-fixed text-left text-sm"
            >
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="w-[20%] px-3 py-3.5">
                    Name
                  </th>
                  <th scope="col" className="w-[24%] px-3 py-3.5">
                    Email
                  </th>
                  <th scope="col" className="w-[16%] px-3 py-3.5">
                    Phone
                  </th>
                  <th scope="col" className="w-[20%] px-3 py-3.5">
                    Journey
                  </th>
                  <th scope="col" className="w-[11%] px-3 py-3.5">
                    Source
                  </th>
                  <th scope="col" className="w-[9%] px-2 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={`/dashboard/contacts/${c.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-sky-700"
                      >
                        {displayName(c)}
                      </Link>
                    </td>
                    <td className="truncate px-3 py-3 text-slate-600">
                      {c.email ?? "—"}
                    </td>
                    <td className="truncate px-3 py-3 text-slate-500">
                      {c.phone ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        aria-label={`Journey stage for ${displayName(c)}`}
                        value={c.pipeline_stage_id ?? ""}
                        onChange={(e) =>
                          changePipelineStage(c.id, e.target.value)
                        }
                        className="min-h-[44px] max-w-full rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-xs font-medium text-sky-800 outline-none transition focus:ring-2 focus:ring-sky-100"
                      >
                        <option value="">Unassigned</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="truncate px-3 py-3 text-xs capitalize text-slate-500">
                      {(c.source ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="relative z-10 px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuId((id) => (id === c.id ? null : c.id))
                        }
                        className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 z-30 mt-1 w-44 rounded-2xl border border-slate-200/80 bg-white py-1 shadow-xl"
                        >
                          <button
                            type="button"
                            className="block min-h-[44px] w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                            onClick={() => openEmail(c)}
                          >
                            Send email
                          </button>
                          <button
                            type="button"
                            className="block min-h-[44px] w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                            onClick={() => openSms(c)}
                          >
                            Send SMS
                          </button>
                          <Link
                            href={`/dashboard/contacts/${c.id}`}
                            className="block min-h-[44px] w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
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
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Add client</h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-700">First name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-700">Last name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Phone</label>
                <CountryPhoneInput value={phone} onChange={setPhone} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Status</label>
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
                  className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="lead">Lead</option>
                  <option value="booked">Booked</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="min-h-[44px] rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Create client"}
              </button>
            </form>
          </div>
        </div>
      )}

      {compose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {compose.type === "email" ? "Send email" : "Send SMS"}
              </h2>
              <button
                type="button"
                onClick={() => setCompose(null)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50"
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
                  <label className="text-sm text-slate-700">Subject</label>
                  <input
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-slate-700">Message</label>
                <textarea
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="rounded-2xl border border-slate-200/80 px-3.5 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              {composeError && (
                <p className="text-sm text-red-600">{composeError}</p>
              )}
              {composeSuccess && (
                <p className="text-sm text-emerald-700">{composeSuccess}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompose(null)}
                  className="min-h-[44px] rounded-2xl border border-slate-200/80 px-4 py-2.5 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-[44px] rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
