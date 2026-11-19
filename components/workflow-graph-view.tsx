"use client";

import type { WorkflowGraph } from "@/lib/workflows/types";

export function WorkflowGraphView({
  graph,
  title = "Workflow steps",
}: {
  graph: WorkflowGraph;
  title?: string;
}) {
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

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <ol className="space-y-2">
        {order.map((id, i) => {
          const node = byId.get(id);
          if (!node) return null;
          const label =
            node.type === "trigger"
              ? `Trigger · ${String(node.config.event ?? "event")}`
              : node.type === "condition"
                ? `Condition · ${String(node.config.field ?? "")} ${String(node.config.op ?? "")}`
                : node.type === "delay"
                  ? `Wait · ${String(node.config.amount ?? "")} ${String(node.config.unit ?? "minutes")}`
                  : node.type === "action"
                    ? `Action · ${String(node.config.action ?? "action")}`
                    : node.type;
          return (
            <li key={id} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-lg border border-slate-200/80 bg-white px-3 py-2">
                <p className="text-xs font-medium text-slate-800">{label}</p>
                <p className="text-[10px] text-slate-400">{node.type}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
