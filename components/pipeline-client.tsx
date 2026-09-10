"use client";

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
        await createPipelineStage({ organizationId, name });
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create stage");
      }
    });
  }

  return (
    <div className="pb-4">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Lead management
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Pipeline stages
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Build the lifecycle your business actually uses. Every org can have a
          different process.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-200">
            New stage name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Proposal sent"
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-300/70"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add stage"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
        {stages.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            No stages yet. Add your first lifecycle stage above.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
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
                      className="flex-1 rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-300/70"
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await renamePipelineStage({
                              organizationId,
                              stageId: stage.id,
                              name: editName,
                            });
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
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-white">
                        <span className="mr-2 text-slate-500">{index + 1}.</span>
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
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await deletePipelineStage({
                                organizationId,
                                stageId: stage.id,
                              });
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Could not delete",
                              );
                            }
                          })
                        }
                        className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200"
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
