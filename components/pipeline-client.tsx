"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kanban, Plus, Settings2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  createPipelineStage,
  renamePipelineStage,
  deletePipelineStage,
  setContactPipelineStage,
} from "@/app/dashboard/pipeline/actions";

type Stage = {
  id: string;
  name: string;
  slug: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

type Contact = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  source: string | null;
  pipeline_stage_id: string | null;
  updated_at: string | null;
  created_at: string;
};

const STAGE_DOTS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function contactName(c: Contact) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || "Unnamed";
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PipelineClient({
  organizationId,
  stages,
  contacts,
}: {
  organizationId: string;
  stages: Stage[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const hay = [c.first_name, c.last_name, c.email, c.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, query]);

  const byStage = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    for (const s of stages) map[s.id] = [];
    const unassigned: Contact[] = [];
    for (const c of filtered) {
      if (c.pipeline_stage_id && map[c.pipeline_stage_id]) {
        map[c.pipeline_stage_id].push(c);
      } else {
        unassigned.push(c);
      }
    }
    return { map, unassigned };
  }, [filtered, stages]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createPipelineStage({ organizationId, name });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create stage");
      }
    });
  }

  function moveContact(contactId: string, stageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setContactPipelineStage({
          organizationId,
          contactId,
          stageId: stageId || null,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not move contact");
      }
    });
  }

  function renderCard(c: Contact) {
    return (
      <div
        key={c.id}
        className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/contacts/${c.id}`}
            className="min-w-0 font-semibold text-slate-900 hover:text-sky-700"
          >
            <span className="block truncate text-sm">{contactName(c)}</span>
          </Link>
          <span className="shrink-0 text-[11px] text-slate-400">
            {relativeTime(c.updated_at || c.created_at)}
          </span>
        </div>
        {c.email ? (
          <p className="mt-1 truncate text-xs text-slate-500">{c.email}</p>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {c.source ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
              {c.source}
            </span>
          ) : null}
          <label className="sr-only" htmlFor={`move-${c.id}`}>
            Move to stage
          </label>
          <select
            id={`move-${c.id}`}
            disabled={isPending || stages.length === 0}
            value={c.pipeline_stage_id ?? ""}
            onChange={(e) => moveContact(c.id, e.target.value)}
            className="ml-auto max-w-[9rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-sky-300"
          >
            <option value="">Unassigned</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  function renderColumn(
    key: string,
    title: string,
    dotClass: string,
    list: Contact[],
    emptyHint: string,
  ) {
    return (
      <div
        key={key}
        className="flex w-[280px] shrink-0 flex-col gap-2.5 rounded-2xl bg-slate-100/80 p-3"
      >
        <div className="flex items-center gap-2 px-1.5 py-1">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
            {list.length}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-xs text-slate-400">
              {emptyHint}
            </p>
          ) : (
            list.map(renderCard)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Journey
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Journey board
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">
            Move clients between stages as they progress. Use the menu on each
            card to change stage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter contacts"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <Link
            href="/dashboard/contacts"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Add contact
          </Link>
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" />
            {manageOpen ? "Hide stages" : "Manage stages"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {stages.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Kanban}
            title="No journey stages yet"
            description="Stages are your client lifecycle (Lead → Booked → Client). Add the first stage, then move people across the board."
            actionLabel="Scroll to add stage"
            onAction={() => {
              setManageOpen(true);
              document
                .getElementById("new-stage")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      ) : (
        <section className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage, index) =>
            renderColumn(
              stage.id,
              stage.name,
              STAGE_DOTS[index % STAGE_DOTS.length],
              byStage.map[stage.id] ?? [],
              stage.is_lost
                ? "Drop contacts here when a lead goes cold."
                : "No contacts in this stage yet.",
            ),
          )}
          {renderColumn(
            "unassigned",
            "Unassigned",
            "bg-slate-400",
            byStage.unassigned,
            "Contacts without a stage appear here.",
          )}
        </section>
      )}

      {(manageOpen || stages.length === 0) && (
        <div className="mt-10 border-t border-slate-200/80 pt-8">
          <h2 className="text-sm font-semibold text-slate-900">Manage stages</h2>
          <p className="mt-1 text-sm text-slate-500">
            Build the lifecycle your business actually uses.
          </p>

          <form
            id="new-stage"
            onSubmit={handleCreate}
            className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">
                New stage name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Proposal sent"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isPending ? "Adding…" : "Add stage"}
            </button>
          </form>

          {stages.length > 0 && (
            <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              {stages.map((stage, index) => (
                <li
                  key={stage.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === stage.id ? (
                    <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              const result = await renamePipelineStage({
                                organizationId,
                                stageId: stage.id,
                                name: editName,
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setEditingId(null);
                              router.refresh();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Could not rename",
                              );
                            }
                          })
                        }
                        className="min-h-[44px] rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium text-slate-900">
                          <span className="mr-2 text-slate-400">
                            {index + 1}.
                          </span>
                          {stage.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {stage.is_won
                            ? "Won stage"
                            : stage.is_lost
                              ? "Lost stage"
                              : "Active stage"}
                          {" · "}
                          {(byStage.map[stage.id] ?? []).length} contacts
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(stage.id);
                            setEditName(stage.name);
                          }}
                          className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                const result = await deletePipelineStage({
                                  organizationId,
                                  stageId: stage.id,
                                });
                                if (!result.ok) setError(result.error);
                                else router.refresh();
                              } catch (err) {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not delete",
                                );
                              }
                            })
                          }
                          className="min-h-[44px] rounded-xl border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
