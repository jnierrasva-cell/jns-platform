"use client";

import { Kanban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { useState, useTransition } from "react";
import { setContactPipelineStage } from "@/app/dashboard/pipeline/actions";
import { Badge } from "@/components/ui/badge";
import {
  createPipelineStage,
  renamePipelineStage,
  deletePipelineStage,
} from "@/app/dashboard/pipeline/actions";

type Stage = {
  id: string;
  name: string;
  slug: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

type ContactCard = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string;
  pipeline_stage_id: string | null;
};

function contactName(contact: ContactCard) {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Unnamed client"
  );
}

export function PipelineClient({
  organizationId,
  stages,
  contacts,
}: {
  organizationId: string;
  stages: Stage[];
  contacts: ContactCard[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function moveContact(contactId: string, stageId: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        await setContactPipelineStage({ organizationId, contactId, stageId });
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not move client",
        );
      }
    });
  }

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create stage");
      }
    });
  }

  return (
    <div className="space-y-8 pb-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-text-muted">
          Journey
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Client journey
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
          Move clients through the stages your workspace already uses.
        </p>
      </header>

      <form
        id="new-stage"
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">
            New stage name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Proposal sent"
            className="mt-2 min-h-11 w-full rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 py-2.5 text-sm font-semibold text-[#0A0E1A] hover:brightness-110 disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add stage"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {stages.length === 0 && (
        <EmptyState
          icon={Kanban}
          title="No journey stages yet"
          description="Add a stage to give clients a place in your workflow. Unassigned clients stay visible below."
          actionLabel="Scroll to add stage"
          onAction={() => {
            document
              .getElementById("new-stage")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <section
        aria-label="Client journey board"
        className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6"
      >
        <div className="flex min-w-0 items-start gap-3">
          {[{ id: null, name: "Unassigned" }, ...stages].map((stage) => {
            const stageContacts = contacts.filter(
              (contact) => contact.pipeline_stage_id === stage.id,
            );
            return (
              <section
                key={stage.id ?? "unassigned"}
                aria-label={`${stage.name} stage`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const contactId = event.dataTransfer.getData("text/plain");
                  if (contactId) moveContact(contactId, stage.id);
                }}
                className="w-[18rem] shrink-0 rounded-2xl border border-border bg-surface-inset p-3"
              >
                <header className="flex min-h-11 items-center justify-between gap-2 px-1">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {stage.name}
                  </h2>
                  <Badge variant="secondary">{stageContacts.length}</Badge>
                </header>
                <ul className="mt-2 min-h-24 space-y-2">
                  {stageContacts.length === 0 ? (
                    <li className="px-2 py-4 text-center text-xs text-text-muted">
                      Drop clients here or use the stage selector.
                    </li>
                  ) : (
                    stageContacts.map((contact) => (
                      <li
                        key={contact.id}
                        draggable={!isPending}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", contact.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        className="rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm"
                      >
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="block min-h-11 rounded-lg py-1 text-sm font-semibold text-foreground hover:text-accent-cyan focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {contactName(contact)}
                        </Link>
                        {contact.email && (
                          <p className="truncate text-xs text-text-secondary">
                            {contact.email}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <Badge variant="outline">{contact.status}</Badge>
                          <label className="sr-only" htmlFor={`stage-${contact.id}`}>
                            Move {contactName(contact)} to stage
                          </label>
                          <select
                            id={`stage-${contact.id}`}
                            value={contact.pipeline_stage_id ?? ""}
                            disabled={isPending}
                            onChange={(event) =>
                              moveContact(contact.id, event.target.value || null)
                            }
                            className="min-h-11 max-w-32 rounded-lg border border-input bg-surface-inset px-2 text-xs text-foreground"
                          >
                            <option value="">Unassigned</option>
                            {stages.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold text-foreground">
            Journey stages
          </h2>
        </div>
        {stages.length === 0 ? (
          <p className="px-4 py-5 text-sm text-text-muted">
            Create a stage above to begin your journey.
          </p>
        ) : (
          <ul className="divide-y divide-border">
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
                      className="min-h-11 flex-1 rounded-xl border border-input bg-surface-inset px-3.5 py-2 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
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
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Could not rename",
                            );
                          }
                        })
                      }
                      className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A]"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-foreground">
                        <span className="mr-2 text-text-muted">{index + 1}.</span>
                        {stage.name}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {stage.is_won
                          ? "Won stage"
                          : stage.is_lost
                            ? "Lost stage"
                            : "Active stage"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(stage.id);
                          setEditName(stage.name);
                        }}
                        className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary"
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
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Could not delete",
                              );
                            }
                          })
                        }
                        className="min-h-11 rounded-xl border border-danger/30 px-4 text-sm text-danger"
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
      </section>
    </div>
  );
}
