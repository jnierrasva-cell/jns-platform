"use client";

import {
  Contact as ContactIcon,
  Download,
  MoreVertical,
  Plus,
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
import { Input } from "@/components/ui/input";

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
        // Put new contacts on first pipeline stage when available
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
              "Contact was created, but it could not be assigned to the first pipeline stage.",
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
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-text-muted">
            Clients
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
            Clients
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            Filter and move people through{" "}
            <Link
              href="/dashboard/pipeline"
              className="text-accent-cyan underline underline-offset-2"
            >
              your custom Journey
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-text-secondary hover:bg-surface-inset hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            id="import"
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-text-secondary hover:bg-surface-inset hover:text-foreground"
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
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add client
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Filter clients by journey stage">
        <button
          type="button"
          onClick={() => setStageFilter("all")}
          className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
            stageFilter === "all"
              ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan"
              : "border-border bg-card text-text-secondary hover:bg-surface-inset"
          }`}
        >
          All
          <span className="ml-1.5 tabular-nums text-text-muted">{counts.all ?? 0}</span>
        </button>
        {stages.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStageFilter(s.id)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${
              stageFilter === s.id
                ? "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan"
                : "border-border bg-card text-text-secondary hover:bg-surface-inset"
            }`}
          >
            {s.name}
            <span className="ml-1.5 tabular-nums text-text-muted">{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          aria-label="Search clients by name, email, or phone"
          className="max-w-md"
        />
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {info && <p className="text-sm text-success" role="status">{info}</p>}

      <div>
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
          <div className="overflow-x-auto rounded-2xl border border-border bg-card text-card-foreground">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border bg-surface-inset text-xs font-semibold uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Journey</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contacts/${c.id}`}
                        className="font-medium text-foreground hover:text-accent-cyan"
                      >
                        {displayName(c)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={c.pipeline_stage_id ?? ""}
                        onChange={(e) =>
                          changePipelineStage(c.id, e.target.value)
                        }
                        aria-label={`Journey stage for ${displayName(c)}`}
                        className="min-h-11 max-w-40 rounded-xl border border-input bg-surface-inset px-3 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <option value="">Unassigned</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-text-muted">
                      {(c.source ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="relative z-10 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuId((id) => (id === c.id ? null : c.id))
                        }
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-muted hover:bg-surface-inset hover:text-foreground"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 z-30 mt-1 w-44 rounded-xl border border-border bg-surface py-1 text-foreground shadow-[var(--shadow-soft)]"
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
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">
                  New contact
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold text-foreground">
                  Add client
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-muted hover:bg-surface-inset hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <label className="text-sm text-text-secondary">Phone</label>
                <CountryPhoneInput value={phone} onChange={setPhone} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Legacy status</label>
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
                  className="min-h-11 rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                >
                  <option value="lead">Lead</option>
                  <option value="booked">Booked</option>
                  <option value="customer">Customer</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="min-h-24 rounded-xl border border-input bg-surface-inset px-3.5 py-3 text-[15px] text-foreground placeholder:text-text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </div>
              {formError && (
                <p role="alert" className="text-sm text-danger">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    resetForm();
                  }}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {compose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-text-muted">
                  {compose.type === "email" ? "Send email" : "Send SMS"}
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold text-foreground">
                  {displayName(compose.contact)}
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {compose.type === "email"
                    ? compose.contact.email
                    : compose.contact.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompose(null)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-muted hover:bg-surface-inset hover:text-foreground"
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
                  <label className="text-sm text-text-secondary">Subject</label>
                  <input
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="min-h-11 rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary">Message</label>
                <textarea
                  required
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  className="min-h-32 rounded-xl border border-input bg-surface-inset px-3.5 py-3 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </div>
              {composeError && (
                <p className="text-sm text-danger">{composeError}</p>
              )}
              {composeSuccess && (
                <p className="text-sm text-success">{composeSuccess}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompose(null)}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
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