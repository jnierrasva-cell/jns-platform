"use client";

import { Kanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useState, useTransition } from "react";
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

export function PipelineClient({
  organizationId,
  stages,
}: {
  organizationId: string;
  stages: Stage[];
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

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
    <div className="pb-4">
      <div className="border-b border-slate-200/80 pb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Journey
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Journey stages
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Build the lifecycle your business actually uses. Every workspace can
          have a different process.
        </p>
      </div>

      <form
        id="new-stage"
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
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

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {stages.length === 0 ? (
          <EmptyState
            icon={Kanban}
            title="No journey stages yet"
            description="Stages are your client lifecycle (Lead → Booked → Client). Add the first stage so Clients can move people through a clear path."
            actionLabel="Scroll to add stage"
            onAction={() => {
              document
                .getElementById("new-stage")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
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
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
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
                        <span className="mr-2 text-slate-400">{index + 1}.</span>
                        {stage.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
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
    </div>
  );
}
