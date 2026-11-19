"use client";

import { useState, useTransition } from "react";
import {
  installAutomationRecipe,
  setAutomationRecipeActive,
} from "@/app/dashboard/automation/recipe-actions";
import { WorkflowGraphView } from "@/components/workflow-graph-view";
import type { WorkflowGraph } from "@/lib/workflows/types";

export type RecipeCard = {
  key: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  graph?: WorkflowGraph;
};

export function AutomationRecipes({
  organizationId,
  recipes,
  activeKeys,
}: {
  organizationId: string;
  recipes: RecipeCard[];
  activeKeys: string[];
}) {
  const [active, setActive] = useState(() => new Set(activeKeys));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(key: string, next: boolean) {
    setError(null);
    setActive((prev) => {
      const n = new Set(prev);
      if (next) n.add(key);
      else n.delete(key);
      return n;
    });
    startTransition(async () => {
      try {
        if (next) await installAutomationRecipe(organizationId, key);
        else await setAutomationRecipeActive(organizationId, key, false);
      } catch (err) {
        setActive((prev) => {
          const n = new Set(prev);
          if (next) n.delete(key);
          else n.add(key);
          return n;
        });
        setError(err instanceof Error ? err.message : "Could not update recipe");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Workflow recipes
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Engine-powered automations. Expand a card to view steps. Legacy
          email/SMS systems below stay available and are mirrored into the
          workflow inventory when toggled.
        </p>
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {recipes.map((r) => {
          const on = active.has(r.key);
          const isOpen = expanded === r.key;
          return (
            <article
              key={r.key}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                on ? "border-sky-200 ring-1 ring-sky-100" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-slate-900">
                      {r.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        on
                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }`}
                    >
                      {on ? "Active" : "Off"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{r.description}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    Trigger: {r.triggerType}
                  </p>
                  {r.graph ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : r.key)}
                      className="mt-2 text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      {isOpen ? "Hide steps" : "View steps"}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={pending}
                  onClick={() => toggle(r.key, !on)}
                  className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                    on
                      ? "border-sky-600 bg-sky-600"
                      : "border-slate-300 bg-slate-200"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      on ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {isOpen && r.graph ? (
                <div className="mt-4">
                  <WorkflowGraphView graph={r.graph} title="Recipe steps" />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
