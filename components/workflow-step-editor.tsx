"use client";

import { useMemo, useState, useTransition } from "react";
import { saveWorkflowGraph } from "@/app/dashboard/automation/graph-actions";
import type { WorkflowGraph, WorkflowNode } from "@/lib/workflows/types";

function orderedNodes(graph: WorkflowGraph): WorkflowNode[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const order: string[] = [];
  const trigger = graph.nodes.find((n) => n.type === "trigger");
  if (trigger) {
    let cur: string | undefined = trigger.id;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      order.push(cur);
      const edge = graph.edges.find(
        (e) => e.from === cur && (!e.when || e.when === "pass"),
      );
      cur = edge?.to;
    }
    for (const n of graph.nodes) {
      if (!seen.has(n.id)) order.push(n.id);
    }
  } else {
    order.push(...graph.nodes.map((n) => n.id));
  }
  return order.map((id) => byId.get(id)!).filter(Boolean);
}

export function WorkflowStepEditor({
  organizationId,
  workflowKey,
  initialGraph,
  editable,
}: {
  organizationId: string;
  workflowKey: string;
  initialGraph: WorkflowGraph;
  editable: boolean;
}) {
  const [graph, setGraph] = useState<WorkflowGraph>(() =>
    structuredClone(initialGraph),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nodes = useMemo(() => orderedNodes(graph), [graph]);

  function updateNode(id: string, patch: Record<string, unknown>) {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== id) return n;
        return { ...n, config: { ...n.config, ...patch } } as WorkflowNode;
      }),
    }));
    setSaved(null);
  }

  function updateActionParam(id: string, key: string, value: string) {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => {
        if (n.id !== id || n.type !== "action") return n;
        return {
          ...n,
          config: {
            ...n.config,
            params: { ...(n.config.params ?? {}), [key]: value },
          },
        };
      }),
    }));
    setSaved(null);
  }

  function onSave() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      try {
        const result = await saveWorkflowGraph({
          organizationId,
          workflowKey,
          graph,
        });
        setSaved(`Saved as version ${result.version}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {nodes.map((node, i) => (
          <li
            key={node.id}
            className="rounded-lg border border-slate-200/80 bg-white px-3 py-2"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {i + 1}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {node.type}
              </span>
            </div>

            {node.type === "trigger" ? (
              <p className="text-xs text-slate-700">
                Event: {String(node.config.event ?? "")}
              </p>
            ) : null}

            {node.type === "condition" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="block text-xs text-slate-500">
                  Field
                  <input
                    disabled={!editable}
                    value={String(node.config.field ?? "")}
                    onChange={(e) => updateNode(node.id, { field: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Operator
                  <select
                    disabled={!editable}
                    value={String(node.config.op ?? "exists")}
                    onChange={(e) => updateNode(node.id, { op: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                  >
                    <option value="exists">exists</option>
                    <option value="eq">equals</option>
                    <option value="neq">not equals</option>
                    <option value="in">in list</option>
                  </select>
                </label>
                <label className="block text-xs text-slate-500">
                  Value
                  <input
                    disabled={!editable}
                    value={
                      Array.isArray(node.config.value)
                        ? (node.config.value as string[]).join(",")
                        : String(node.config.value ?? "")
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const op = String(node.config.op ?? "");
                      updateNode(
                        node.id,
                        op === "in"
                          ? {
                              value: raw
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : { value: raw },
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </label>
              </div>
            ) : null}

            {node.type === "delay" ? (
              <div className="flex flex-wrap gap-2">
                <label className="block text-xs text-slate-500">
                  Amount
                  <input
                    type="number"
                    min={1}
                    disabled={!editable}
                    value={Number(node.config.amount) || 1}
                    onChange={(e) =>
                      updateNode(node.id, {
                        amount: Number(e.target.value) || 1,
                      })
                    }
                    className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Unit
                  <select
                    disabled={!editable}
                    value={String(node.config.unit || "minutes")}
                    onChange={(e) => updateNode(node.id, { unit: e.target.value })}
                    className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </label>
              </div>
            ) : null}

            {node.type === "action" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-800">
                  {String(node.config.action ?? "action")}
                </p>
                {Object.entries(node.config.params ?? {}).map(([k, v]) => (
                  <label key={k} className="block text-xs text-slate-500">
                    {k}
                    <input
                      disabled={!editable}
                      value={String(v ?? "")}
                      onChange={(e) =>
                        updateActionParam(node.id, k, e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50"
                    />
                  </label>
                ))}
              </div>
            ) : null}

            {node.type === "branch" ? (
              <p className="text-xs text-slate-600">
                Branch on field: {String(node.config.field ?? "(value)")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {saved}
        </p>
      ) : null}

      {editable ? (
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save steps"}
        </button>
      ) : (
        <p className="text-[11px] text-slate-400">
          Turn the recipe on to edit and publish step changes.
        </p>
      )}
    </div>
  );
}
