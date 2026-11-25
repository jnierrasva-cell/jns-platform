"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Download,
  Shield,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  toggleEntryPaid,
  updateEntryActual,
  logIncome,
  deleteIncomeLog,
  addPayable,
  setFinancialMemberAccess,
} from "@/app/dashboard/financials/actions";

type Entry = {
  id: string;
  periodMonth: string;
  recurringItemId: string | null;
  name: string;
  category: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: "paid" | "unpaid";
  dueDate: string | null;
  paidAt: string | null;
  paidByUserId: string | null;
};

type IncomeRow = {
  id: string;
  periodMonth: string;
  sourceLabel: string;
  amount: number;
  notes: string | null;
  loggedBy: string | null;
  createdAt: string;
};

type TrendRow = {
  month: string;
  income: number;
  paidSpend: number;
  unpaid: number;
  net: number;
  margin: number;
};

type TeamMember = {
  userId: string;
  role: string;
  name: string;
  email: string | null;
  financialRole: "none" | "view" | "edit";
};

type Filter = "all" | "salary" | "utility" | "unpaid";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const moneyExact = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shortMonth(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function BreakEvenChart({
  income,
  paidSpend,
  unpaid,
}: {
  income: number;
  paidSpend: number;
  unpaid: number;
}) {
  const committed = paidSpend + unpaid;
  const max = Math.max(income, committed, 1) * 1.15;
  const w = 100;
  const h = 56;
  const barH = 14;
  const gap = 8;
  const incomeW = (income / max) * w;
  const paidW = (paidSpend / max) * w;
  const unpaidW = (unpaid / max) * w;
  const targetX = (committed / max) * w;
  const remaining = committed - income;

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Break-even chart">
        <rect x={0} y={4} width={incomeW} height={barH} rx={3} fill="#0ea5e9" />
        <rect x={0} y={4 + barH + gap} width={paidW} height={barH} rx={3} fill="#64748b" />
        <rect x={paidW} y={4 + barH + gap} width={unpaidW} height={barH} rx={3} fill="#f59e0b" opacity={0.85} />
        <line x1={targetX} y1={0} x2={targetX} y2={h} stroke="#ef4444" strokeWidth={0.6} strokeDasharray="2 1.5" />
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sky-500" /> Income</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-slate-500" /> Paid</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Unpaid</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-0.5 bg-red-500" /> Break-even</span>
      </div>
      <p className="text-sm text-slate-600">
        {remaining > 0 ? (
          <><span className="font-semibold text-amber-700 tabular-nums">{money(remaining)}</span> needed to break even</>
        ) : (
          <><span className="font-semibold text-emerald-700 tabular-nums">{money(Math.abs(remaining))}</span> above break-even</>
        )}
      </p>
    </div>
  );
}

export function FinancialsClient({
  organizationId: _organizationId,
  period,
  canEdit,
  isCeo,
  currentUserId,
  entries: initialEntries,
  income: initialIncome,
  trend,
  team,
}: {
  organizationId: string;
  period: string;
  canEdit: boolean;
  isCeo: boolean;
  currentUserId: string;
  entries: Entry[];
  income: IncomeRow[];
  trend: TrendRow[];
  team: TeamMember[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entries, setEntries] = useState(initialEntries);
  const [income, setIncome] = useState(initialIncome);
  const [filter, setFilter] = useState<Filter>("all");
  const [trendMode, setTrendMode] = useState<"month" | "6" | "12">("month");
  const [showAccess, setShowAccess] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showLogIncome, setShowLogIncome] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<"salary" | "utility" | "rent" | "other">("other");
  const [addAmount, setAddAmount] = useState("");
  const [addRecurring, setAddRecurring] = useState(false);
  const [incLabel, setIncLabel] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incNotes, setIncNotes] = useState("");

  const kpis = useMemo(() => {
    const monthlyIncome = income.reduce((s, r) => s + r.amount, 0);
    const paidSpend = entries
      .filter((e) => e.status === "paid")
      .reduce((s, e) => s + (e.actualAmount != null ? e.actualAmount : e.expectedAmount), 0);
    const pendingPayables = entries
      .filter((e) => e.status === "unpaid")
      .reduce((s, e) => s + e.expectedAmount, 0);
    const committed = paidSpend + pendingPayables;
    const net = monthlyIncome - committed;
    return { monthlyIncome, paidSpend, pendingPayables, committed, net };
  }, [entries, income]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter === "unpaid") return e.status === "unpaid";
      if (filter === "salary") return e.category === "salary";
      if (filter === "utility") return e.category === "utility" || e.category === "rent";
      return true;
    });
  }, [entries, filter]);

  const trendSlice = useMemo(() => {
    if (trendMode === "month") return trend.slice(-1);
    if (trendMode === "6") return trend.slice(-6);
    return trend;
  }, [trend, trendMode]);

  const goMonth = useCallback(
    (delta: number) => {
      router.push(`/dashboard/financials?month=${shiftPeriod(period, delta)}`);
    },
    [period, router],
  );

  const onTogglePaid = (entry: Entry) => {
    if (!canEdit) return;
    const nextPaid = entry.status !== "paid";
    const optimisticActual = nextPaid ? entry.actualAmount ?? entry.expectedAmount : entry.actualAmount;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              status: nextPaid ? "paid" : "unpaid",
              actualAmount: optimisticActual,
              paidAt: nextPaid ? new Date().toISOString() : null,
              paidByUserId: nextPaid ? currentUserId : null,
            }
          : e,
      ),
    );
    startTransition(async () => {
      try {
        await toggleEntryPaid({ entryId: entry.id, paid: nextPaid, actualAmount: optimisticActual });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
        setEntries(initialEntries);
      }
    });
  };

  const saveActual = (entryId: string) => {
    const n = parseFloat(editValue);
    if (Number.isNaN(n) || n < 0) {
      setEditingId(null);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, actualAmount: n } : e)));
    setEditingId(null);
    startTransition(async () => {
      try {
        await updateEntryActual({ entryId, actualAmount: n });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  const onLogIncome = () => {
    const amount = parseFloat(incAmount);
    if (!incLabel.trim() || Number.isNaN(amount)) return;
    startTransition(async () => {
      try {
        await logIncome({
          periodMonth: period,
          sourceLabel: incLabel.trim(),
          amount,
          notes: incNotes.trim() || undefined,
        });
        setShowLogIncome(false);
        setIncLabel("");
        setIncAmount("");
        setIncNotes("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to log income");
      }
    });
  };

  const onAddPayable = () => {
    const amount = parseFloat(addAmount);
    if (!addName.trim() || Number.isNaN(amount)) return;
    startTransition(async () => {
      try {
        await addPayable({
          periodMonth: period,
          name: addName.trim(),
          category: addCategory,
          amount,
          saveAsRecurring: addRecurring,
          billingCycle: addRecurring ? "monthly" : "one_time",
        });
        setShowAdd(false);
        setAddName("");
        setAddAmount("");
        setAddRecurring(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add payable");
      }
    });
  };

  const exportCsv = () => {
    const lines: string[] = ["Type,Name,Category,Expected,Actual,Status,Due Date"];
    for (const e of entries) {
      lines.push(
        ["payable", `"${e.name.replace(/"/g, '""')}"`, e.category, e.expectedAmount, e.actualAmount ?? "", e.status, e.dueDate ?? ""].join(","),
      );
    }
    for (const r of income) {
      lines.push(["income", `"${r.sourceLabel.replace(/"/g, '""')}"`, "", "", r.amount, "received", ""].join(","));
    }
    lines.push("");
    lines.push("Month,Income,Paid Spend,Unpaid,Net,Margin %");
    for (const t of trend) {
      lines.push([t.month, t.income, t.paidSpend, t.unpaid, t.net, t.margin.toFixed(1)].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financials-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryLabel = (c: string) => {
    if (c === "salary") return "Salary";
    if (c === "utility") return "Utility";
    if (c === "rent") return "Rent";
    return "Other";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Financials</h1>
          <p className="mt-0.5 text-sm text-slate-500">Cashflow checklist & spend vs. gain for this workspace</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => goMonth(-1)} className="flex h-10 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[9.5rem] px-2 text-center text-sm font-medium tabular-nums text-slate-800">{labelPeriod(period)}</span>
            <button type="button" onClick={() => goMonth(1)} className="flex h-10 w-10 items-center justify-center text-slate-500 hover:bg-slate-50" aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          {isCeo && (
            <button type="button" onClick={() => setShowAccess(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Shield size={15} /> Manage access
            </button>
          )}
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Monthly income</p>
            <DollarSign size={14} className="text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{money(kpis.monthlyIncome)}</p>
          {canEdit && (
            <button type="button" onClick={() => setShowLogIncome(true)} className="mt-2 text-xs font-medium text-sky-600 hover:text-sky-700">+ Log income</button>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Paid spend</p>
            <Check size={14} className="text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{money(kpis.paidSpend)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pending payables</p>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{money(kpis.pendingPayables)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Net gain / loss</p>
            {kpis.net >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
          </div>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${kpis.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>{money(kpis.net)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Break-even vs. spend</h2>
          <p className="mt-0.5 text-xs text-slate-500">Target line = paid + unpaid obligations this month</p>
          <div className="mt-4">
            <BreakEvenChart income={kpis.monthlyIncome} paidSpend={kpis.paidSpend} unpaid={kpis.pendingPayables} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Spend vs. gain</h2>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs">
              {([["month", "This month"], ["6", "6 mo"], ["12", "12 mo"]] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTrendMode(id)} className={`rounded-md px-2.5 py-1 font-medium ${trendMode === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-2 font-medium">Month</th>
                  <th className="pb-2 pr-2 text-right font-medium">Income</th>
                  <th className="pb-2 pr-2 text-right font-medium">Paid</th>
                  <th className="pb-2 pr-2 text-right font-medium">Unpaid</th>
                  <th className="pb-2 pr-2 text-right font-medium">Net</th>
                  <th className="pb-2 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {trendSlice.map((t) => (
                  <tr key={t.month} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 pr-2 font-medium text-slate-700">{shortMonth(t.month)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-slate-700">{money(t.income)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-slate-600">{money(t.paidSpend)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-amber-700">{money(t.unpaid)}</td>
                    <td className={`py-2 pr-2 text-right tabular-nums font-medium ${t.net >= 0 ? "text-emerald-700" : "text-red-600"}`}>{money(t.net)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">{t.margin.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Salaries, utilities & payables</h2>
            <p className="text-xs text-slate-500">Toggle paid for instant KPI updates</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {([["all", "All"], ["salary", "Salaries"], ["utility", "Utilities"], ["unpaid", "Unpaid only"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === id ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
            ))}
            {canEdit && (
              <button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">
                <Plus size={14} /> Add payable
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No payables this month</p>
            <p className="mt-1 text-sm text-slate-500">Add salaries, rent, or one-time expenses to start tracking.</p>
            {canEdit && (
              <button type="button" onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
                <Plus size={16} /> Add payable / employee
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => {
              const displayAmount = e.status === "paid" ? e.actualAmount ?? e.expectedAmount : e.expectedAmount;
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={e.status === "paid"} disabled={!canEdit || pending} onChange={() => onTogglePaid(e)} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${e.status === "paid" ? "text-slate-400 line-through" : "text-slate-900"}`}>{e.name}</p>
                      <p className="text-xs text-slate-400">{categoryLabel(e.category)}{e.dueDate ? ` · due ${e.dueDate}` : ""}</p>
                    </div>
                  </label>
                  <div className="flex items-center gap-2 tabular-nums">
                    {editingId === e.id ? (
                      <input autoFocus type="number" step="0.01" value={editValue} onChange={(ev) => setEditValue(ev.target.value)} onBlur={() => saveActual(e.id)} onKeyDown={(ev) => { if (ev.key === "Enter") saveActual(e.id); if (ev.key === "Escape") setEditingId(null); }} className="w-24 rounded-lg border border-sky-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    ) : (
                      <button type="button" disabled={!canEdit} onClick={() => { if (!canEdit) return; setEditingId(e.id); setEditValue(String(e.actualAmount != null ? e.actualAmount : e.expectedAmount)); }} className={`text-sm font-medium ${e.status === "paid" ? "text-slate-700" : "text-slate-900"} ${canEdit ? "hover:text-sky-700" : ""}`} title={canEdit ? "Click to edit amount" : undefined}>
                        {moneyExact(displayAmount)}
                      </button>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${e.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{e.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {income.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Income logged this month</h2>
          <ul className="mt-3 divide-y divide-slate-50">
            {income.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{r.sourceLabel}</p>
                  {r.notes && <p className="truncate text-xs text-slate-400">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-medium text-emerald-700">{moneyExact(r.amount)}</span>
                  {canEdit && (
                    <button type="button" onClick={() => { startTransition(async () => { try { await deleteIncomeLog(r.id); setIncome((prev) => prev.filter((x) => x.id !== r.id)); } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); } }); }} className="text-slate-300 hover:text-red-500" aria-label="Delete income log"><X size={14} /></button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAccess && isCeo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Financials access</h3>
                <p className="text-xs text-slate-500">Only you (owner) and granted members can open this tab</p>
              </div>
              <button type="button" onClick={() => setShowAccess(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X size={18} /></button>
            </div>
            <ul className="divide-y divide-slate-50 p-2">
              {team.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{m.name}{m.role === "ceo" && <span className="ml-1.5 text-[10px] font-semibold uppercase text-sky-600">Owner</span>}</p>
                    <p className="truncate text-xs text-slate-400">{m.email}</p>
                  </div>
                  {m.role === "ceo" ? (
                    <span className="text-xs font-medium text-slate-400">Full access</span>
                  ) : (
                    <select value={m.financialRole} onChange={(ev) => { const role = ev.target.value as "none" | "view" | "edit"; startTransition(async () => { try { await setFinancialMemberAccess({ userId: m.userId, role }); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Access update failed"); } }); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700">
                      <option value="none">None</option>
                      <option value="view">View only</option>
                      <option value="edit">Can edit</option>
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showAdd && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Add payable / employee</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Name</label>
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Studio rent, Jane Doe" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Category</label>
                  <select value={addCategory} onChange={(e) => setAddCategory(e.target.value as "salary" | "utility" | "rent" | "other")} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                    <option value="salary">Salary</option>
                    <option value="utility">Utility</option>
                    <option value="rent">Rent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Amount</label>
                  <input type="number" step="0.01" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={addRecurring} onChange={(e) => setAddRecurring(e.target.checked)} className="rounded border-slate-300 text-sky-600" />
                Save to recurring list for future months
              </label>
              <button type="button" disabled={pending} onClick={onAddPayable} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
                {pending ? "Saving…" : "Add payable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogIncome && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Log income</h3>
              <button type="button" onClick={() => setShowLogIncome(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X size={18} /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Source</label>
                <input value={incLabel} onChange={(e) => setIncLabel(e.target.value)} placeholder="e.g. Monthly studio revenue" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Amount</label>
                <input type="number" step="0.01" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Notes (optional)</label>
                <input value={incNotes} onChange={(e) => setIncNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
              </div>
              <button type="button" disabled={pending} onClick={onLogIncome} className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
                {pending ? "Saving…" : "Log income"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
