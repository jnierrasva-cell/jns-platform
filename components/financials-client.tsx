"use client";

import { useMemo, useState, useTransition, useCallback, useEffect } from "react";
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
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  toggleEntryPaid,
  updateEntryActual,
  updatePayableEntry,
  deletePayableEntry,
  logIncome,
  updateIncomeLog,
  deleteIncomeLog,
  addPayable,
  setFinancialMemberAccess,
  carryForwardRecurring,
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
  paymentMethod?: string | null;
  notes?: string | null;
};

type IncomeRow = {
  id: string;
  periodMonth: string;
  sourceLabel: string;
  amount: number;
  notes: string | null;
  loggedBy: string | null;
  createdAt: string;
  status: "paid" | "pending";
  paymentMethod?: string | null;
  contactId?: string | null;
  bookingId?: string | null;
  receivedAt?: string | null;
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

type Filter = "all" | "salary" | "utility" | "supplies" | "unpaid" | "overdue";

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

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Derived display status for payables */
function payableDisplayStatus(e: Entry): "paid" | "unpaid" | "overdue" {
  if (e.status === "paid") return "paid";
  if (e.dueDate && e.dueDate < todayISO()) return "overdue";
  return "unpaid";
}

function categoryLabel(c: string) {
  if (c === "salary") return "Salaries";
  if (c === "utility") return "Utilities";
  if (c === "rent") return "Rent";
  if (c === "supplies") return "Supplies";
  return "Other";
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
  const covered = committed > 0 ? Math.min(100, Math.round((income / committed) * 100)) : 100;
  const remaining = Math.max(0, committed - income);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden>
        <rect x={0} y={4} width={w} height={barH} rx={3} fill="#e2e8f0" />
        <rect x={0} y={4} width={incomeW} height={barH} rx={3} fill="#0ea5e9" />
        <rect x={0} y={4 + barH + gap} width={w} height={barH} rx={3} fill="#e2e8f0" />
        <rect x={0} y={4 + barH + gap} width={paidW} height={barH} rx={3} fill="#64748b" />
        <rect
          x={paidW}
          y={4 + barH + gap}
          width={unpaidW}
          height={barH}
          rx={3}
          fill="#f59e0b"
          opacity={0.85}
        />
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Collected {money(income)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" /> Paid spend {money(paidSpend)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Still due {money(unpaid)}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        {remaining > 0
          ? `${money(remaining)} more collected income needed to cover this month's obligations (${covered}% covered).`
          : `Collected income covers this month's obligations (${covered}%).`}
      </p>
    </div>
  );
}

export function FinancialsClient({
  organizationId,
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<"month" | "6" | "12">("6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [showAddPayable, setShowAddPayable] = useState(false);
  const [showLogIncome, setShowLogIncome] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editIncome, setEditIncome] = useState<IncomeRow | null>(null);

  // Payable form
  const [payName, setPayName] = useState("");
  const [payCat, setPayCat] = useState<"salary" | "utility" | "rent" | "supplies" | "other">("other");
  const [payAmount, setPayAmount] = useState("");
  const [payDueDay, setPayDueDay] = useState("");
  const [payDueDate, setPayDueDate] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [addRecurring, setAddRecurring] = useState(false);

  // Income form
  const [incLabel, setIncLabel] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incNotes, setIncNotes] = useState("");
  const [incStatus, setIncStatus] = useState<"paid" | "pending">("paid");
  const [incMethod, setIncMethod] = useState("");

  useEffect(() => {
    setEntries(initialEntries);
    setIncome(initialIncome);
  }, [initialEntries, initialIncome]);

  const kpis = useMemo(() => {
    const collectedIncome = income
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + r.amount, 0);
    const pendingIncome = income
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + r.amount, 0);
    const paidSpend = entries
      .filter((e) => e.status === "paid")
      .reduce((s, e) => s + (e.actualAmount ?? e.expectedAmount), 0);
    const pendingPayables = entries
      .filter((e) => e.status === "unpaid")
      .reduce((s, e) => s + e.expectedAmount, 0);
    const overduePayables = entries
      .filter((e) => payableDisplayStatus(e) === "overdue")
      .reduce((s, e) => s + e.expectedAmount, 0);
    const committed = paidSpend + pendingPayables;
    const net = collectedIncome - committed;
    return {
      collectedIncome,
      pendingIncome,
      paidSpend,
      pendingPayables,
      overduePayables,
      committed,
      net,
    };
  }, [entries, income]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const ds = payableDisplayStatus(e);
      if (filter === "unpaid") return e.status === "unpaid";
      if (filter === "overdue") return ds === "overdue";
      if (filter === "salary") return e.category === "salary";
      if (filter === "utility") return e.category === "utility" || e.category === "rent";
      if (filter === "supplies") return e.category === "supplies";
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
    const optimisticActual = nextPaid
      ? entry.actualAmount ?? entry.expectedAmount
      : entry.actualAmount;
    const snapshot = entries;
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
        await toggleEntryPaid({
          entryId: entry.id,
          paid: nextPaid,
          actualAmount: optimisticActual,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
        setEntries(snapshot);
      }
    });
  };

  const saveActual = (entryId: string) => {
    const n = parseFloat(editValue);
    if (Number.isNaN(n) || n < 0) {
      setEditingId(null);
      return;
    }
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, actualAmount: n } : e)),
    );
    setEditingId(null);
    startTransition(async () => {
      try {
        await updateEntryActual({ entryId, actualAmount: n });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  const onDeleteEntry = (entry: Entry) => {
    if (!canEdit) return;
    if (!confirm(`Delete payable “${entry.name}”?`)) return;
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    startTransition(async () => {
      try {
        await deletePayableEntry(entry.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setEntries(snapshot);
      }
    });
  };

  const onSaveEditEntry = () => {
    if (!editEntry || !canEdit) return;
    startTransition(async () => {
      try {
        await updatePayableEntry({
          entryId: editEntry.id,
          name: editEntry.name,
          category: editEntry.category as
            | "salary"
            | "utility"
            | "rent"
            | "supplies"
            | "other",
          expectedAmount: editEntry.expectedAmount,
          dueDate: editEntry.dueDate,
          paymentMethod: editEntry.paymentMethod ?? null,
          notes: editEntry.notes ?? null,
        });
        setEntries((prev) =>
          prev.map((e) => (e.id === editEntry.id ? editEntry : e)),
        );
        setEditEntry(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save payable");
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
          status: incStatus,
          paymentMethod: incMethod.trim() || undefined,
        });
        setIncLabel("");
        setIncAmount("");
        setIncNotes("");
        setIncMethod("");
        setIncStatus("paid");
        setShowLogIncome(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to log income");
      }
    });
  };

  const onSaveEditIncome = () => {
    if (!editIncome || !canEdit) return;
    startTransition(async () => {
      try {
        await updateIncomeLog({
          id: editIncome.id,
          sourceLabel: editIncome.sourceLabel,
          amount: editIncome.amount,
          notes: editIncome.notes,
          status: editIncome.status,
          paymentMethod: editIncome.paymentMethod ?? null,
        });
        setIncome((prev) =>
          prev.map((r) => (r.id === editIncome.id ? editIncome : r)),
        );
        setEditIncome(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save income");
      }
    });
  };

  const onDeleteIncome = (row: IncomeRow) => {
    if (!canEdit) return;
    if (!confirm(`Delete income “${row.sourceLabel}”?`)) return;
    const snapshot = income;
    setIncome((prev) => prev.filter((r) => r.id !== row.id));
    startTransition(async () => {
      try {
        await deleteIncomeLog(row.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setIncome(snapshot);
      }
    });
  };

  const onAddPayable = () => {
    const amount = parseFloat(payAmount);
    if (!payName.trim() || Number.isNaN(amount)) return;
    const dueDay = payDueDay ? parseInt(payDueDay, 10) : null;
    startTransition(async () => {
      try {
        await addPayable({
          periodMonth: period,
          name: payName.trim(),
          category: payCat,
          amount,
          saveAsRecurring: addRecurring,
          dueDay: Number.isFinite(dueDay as number) ? dueDay : null,
          dueDate: payDueDate || null,
          paymentMethod: payMethod.trim() || null,
          notes: payNotes.trim() || null,
        });
        setPayName("");
        setPayAmount("");
        setPayDueDay("");
        setPayDueDate("");
        setPayMethod("");
        setPayNotes("");
        setAddRecurring(false);
        setShowAddPayable(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add payable");
      }
    });
  };

  const onCarryForward = () => {
    if (!canEdit) return;
    startTransition(async () => {
      try {
        const res = await carryForwardRecurring(period);
        setInfo(
          res.generated > 0
            ? `Added ${res.generated} recurring payable${res.generated === 1 ? "" : "s"} to ${labelPeriod(period)}.`
            : "All active recurring payables are already in this month.",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Carry-forward failed");
      }
    });
  };

  const exportCsv = () => {
    const header = [
      "Date",
      "Due date",
      "Type",
      "Category",
      "Description",
      "Client / reference",
      "Status",
      "Amount",
      "Payment method",
      "Notes",
    ];
    const lines: string[] = [header.join(",")];
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

    for (const e of entries) {
      const ds = payableDisplayStatus(e);
      const amount =
        e.status === "paid"
          ? e.actualAmount ?? e.expectedAmount
          : e.expectedAmount;
      lines.push(
        [
          e.paidAt ? e.paidAt.slice(0, 10) : period + "-01",
          e.dueDate ?? "",
          "payable",
          categoryLabel(e.category),
          esc(e.name),
          "",
          ds,
          amount,
          esc(e.paymentMethod ?? ""),
          esc(e.notes ?? ""),
        ].join(","),
      );
    }
    for (const r of income) {
      lines.push(
        [
          r.receivedAt || r.createdAt.slice(0, 10),
          "",
          "income",
          "",
          esc(r.sourceLabel),
          r.contactId || r.bookingId || "",
          r.status,
          r.amount,
          esc(r.paymentMethod ?? ""),
          esc(r.notes ?? ""),
        ].join(","),
      );
    }
    lines.push("");
    lines.push("Month,Collected income,Paid spend,Unpaid,Net,Margin %");
    for (const t of trend) {
      lines.push(
        [t.month, t.income, t.paidSpend, t.unpaid, t.net, t.margin.toFixed(1)].join(
          ",",
        ),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financials-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: "paid" | "unpaid" | "overdue" | "pending") => {
    if (status === "paid")
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    if (status === "overdue")
      return "bg-red-50 text-red-700 ring-1 ring-red-100";
    if (status === "pending")
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Financials</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Monthly cashflow for this workspace — income, payables, and break-even.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="rounded-l-xl p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[9rem] px-2 text-center text-sm font-medium text-slate-800">
              {labelPeriod(period)}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="rounded-r-xl p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download size={15} /> Export CSV
          </button>
          {isCeo && (
            <button
              type="button"
              onClick={() => setShowAccess(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Shield size={15} /> Access
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {info && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <span>{info}</span>
          <button type="button" onClick={() => setInfo(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPIs — all derived from the same period-scoped local state */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Collected income
            </p>
            <DollarSign size={14} className="text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {money(kpis.collectedIncome)}
          </p>
          {kpis.pendingIncome > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              +{money(kpis.pendingIncome)} pending
            </p>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowLogIncome(true)}
              className="mt-2 text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              + Log income
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Paid spend
            </p>
            <Check size={14} className="text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {money(kpis.paidSpend)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pending payables
            </p>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {money(kpis.pendingPayables)}
          </p>
          {kpis.overduePayables > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
              <AlertTriangle size={12} /> {money(kpis.overduePayables)} overdue
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Net (collected − obligations)
            </p>
            {kpis.net >= 0 ? (
              <TrendingUp size={14} className="text-emerald-500" />
            ) : (
              <TrendingDown size={14} className="text-red-500" />
            )}
          </div>
          <p
            className={`mt-2 text-2xl font-semibold tabular-nums ${
              kpis.net >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {money(kpis.net)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Break-even vs spend
            </h2>
            <span className="text-xs text-slate-400">{labelPeriod(period)}</span>
          </div>
          <BreakEvenChart
            income={kpis.collectedIncome}
            paidSpend={kpis.paidSpend}
            unpaid={kpis.pendingPayables}
          />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Spend vs gain (trend)
            </h2>
            <div className="flex rounded-lg border border-slate-200 text-xs">
              {(["month", "6", "12"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTrendMode(m)}
                  className={`px-2.5 py-1 ${
                    trendMode === m
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  } ${m === "month" ? "rounded-l-lg" : ""} ${m === "12" ? "rounded-r-lg" : ""}`}
                >
                  {m === "month" ? "Month" : m === "6" ? "6 mo" : "12 mo"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 text-right font-medium">Income</th>
                  <th className="pb-2 text-right font-medium">Paid</th>
                  <th className="pb-2 text-right font-medium">Unpaid</th>
                  <th className="pb-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {trendSlice.map((t) => (
                  <tr key={t.month} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-700">{shortMonth(t.month)}</td>
                    <td className="py-1.5 text-right text-slate-700">
                      {money(t.income)}
                    </td>
                    <td className="py-1.5 text-right text-slate-700">
                      {money(t.paidSpend)}
                    </td>
                    <td className="py-1.5 text-right text-slate-700">
                      {money(t.unpaid)}
                    </td>
                    <td
                      className={`py-1.5 text-right font-medium ${
                        t.net >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {money(t.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Income list */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Income — {labelPeriod(period)}
          </h2>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowLogIncome(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
            >
              <Plus size={14} /> Log income
            </button>
          )}
        </div>
        {income.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No income logged for this month.
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowLogIncome(true)}
                className="ml-1 font-medium text-sky-600 hover:text-sky-700"
              >
                Log the first entry
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {income.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {r.sourceLabel}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.receivedAt || r.createdAt.slice(0, 10)}
                    {r.paymentMethod ? ` · ${r.paymentMethod}` : ""}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(r.status)}`}
                >
                  {r.status}
                </span>
                <span className="text-sm font-medium tabular-nums text-slate-900">
                  {moneyExact(r.amount)}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditIncome({ ...r })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                      aria-label="Edit income"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteIncome(r)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete income"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payables */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Payables — {labelPeriod(period)}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["all", "All"],
                  ["unpaid", "Unpaid"],
                  ["overdue", "Overdue"],
                  ["salary", "Salaries"],
                  ["utility", "Rent/Utils"],
                  ["supplies", "Supplies"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    filter === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {canEdit && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onCarryForward}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  title="Copy missing recurring payables into this month"
                >
                  <RefreshCw size={13} /> Carry recurring
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPayable(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                >
                  <Plus size={14} /> Add payable
                </button>
              </>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No payables for {labelPeriod(period)}.
            {canEdit && (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={onCarryForward}
                  className="font-medium text-sky-600 hover:text-sky-700"
                >
                  Carry recurring from masters
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setShowAddPayable(true)}
                  className="font-medium text-sky-600 hover:text-sky-700"
                >
                  Add payable / employee
                </button>
              </div>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No payables match this filter.
            {filter === "unpaid" || filter === "overdue" ? (
              <p className="mt-1 text-xs text-slate-400">
                {entries.filter((e) => e.status === "paid").length} paid ·{" "}
                {entries.filter((e) => e.status === "unpaid").length} unpaid overall
                this month.
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => {
              const ds = payableDisplayStatus(e);
              const displayAmount =
                e.status === "paid"
                  ? e.actualAmount ?? e.expectedAmount
                  : e.expectedAmount;
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={e.status === "paid"}
                      disabled={!canEdit || pending}
                      onChange={() => onTogglePaid(e)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-medium ${
                          e.status === "paid"
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {e.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {categoryLabel(e.category)}
                        {e.dueDate ? ` · due ${e.dueDate}` : ""}
                        {e.paymentMethod ? ` · ${e.paymentMethod}` : ""}
                      </p>
                    </div>
                  </label>
                  <div className="flex items-center gap-2 tabular-nums">
                    {editingId === e.id ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(ev) => setEditValue(ev.target.value)}
                        onBlur={() => saveActual(e.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") saveActual(e.id);
                          if (ev.key === "Escape") setEditingId(null);
                        }}
                        className="w-24 rounded-lg border border-sky-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          if (!canEdit) return;
                          setEditingId(e.id);
                          setEditValue(
                            String(
                              e.actualAmount != null
                                ? e.actualAmount
                                : e.expectedAmount,
                            ),
                          );
                        }}
                        className={`text-sm font-medium ${
                          e.status === "paid" ? "text-slate-700" : "text-slate-900"
                        } ${canEdit ? "hover:text-sky-700" : ""}`}
                        title={canEdit ? "Click to edit amount" : undefined}
                      >
                        {moneyExact(displayAmount)}
                      </button>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(ds)}`}
                    >
                      {ds}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditEntry({ ...e })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Edit payable"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(e)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete payable"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Access modal */}
      {showAccess && isCeo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Financials access
              </h3>
              <button
                type="button"
                onClick={() => setShowAccess(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Owner always has full access. Grant view or edit to team members.
            </p>
            <ul className="mt-4 space-y-2">
              {team.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {m.email} · {m.role}
                    </p>
                  </div>
                  {m.role === "ceo" ? (
                    <span className="text-xs font-medium text-slate-500">Owner</span>
                  ) : (
                    <select
                      value={m.financialRole}
                      disabled={pending}
                      onChange={(e) => {
                        const role = e.target.value as "none" | "view" | "edit";
                        startTransition(async () => {
                          try {
                            await setFinancialMemberAccess({
                              userId: m.userId,
                              role,
                            });
                            router.refresh();
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Access update failed",
                            );
                          }
                        });
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="none">No access</option>
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Add payable modal */}
      {showAddPayable && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Add payable
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPayable(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Name</label>
                <input
                  value={payName}
                  onChange={(e) => setPayName(e.target.value)}
                  placeholder="e.g. Studio rent, Instructor pay"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Category
                  </label>
                  <select
                    value={payCat}
                    onChange={(e) =>
                      setPayCat(e.target.value as typeof payCat)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="salary">Salaries</option>
                    <option value="rent">Rent</option>
                    <option value="utility">Utilities</option>
                    <option value="supplies">Supplies</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={payDueDate}
                    onChange={(e) => setPayDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Due day (recurring)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={payDueDay}
                    onChange={(e) => setPayDueDay(e.target.value)}
                    placeholder="1–31"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Payment method (optional)
                </label>
                <input
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  placeholder="e.g. ACH, card, cash"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Notes (optional)
                </label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={addRecurring}
                  onChange={(e) => setAddRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600"
                />
                Save as recurring for future months
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={onAddPayable}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Add payable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log income modal */}
      {showLogIncome && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Log income
              </h3>
              <button
                type="button"
                onClick={() => setShowLogIncome(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Source</label>
                <input
                  value={incLabel}
                  onChange={(e) => setIncLabel(e.target.value)}
                  placeholder="e.g. Class packs, private sessions"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={incAmount}
                    onChange={(e) => setIncAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Status
                  </label>
                  <select
                    value={incStatus}
                    onChange={(e) =>
                      setIncStatus(e.target.value as "paid" | "pending")
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="paid">Collected</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Payment method (optional)
                </label>
                <input
                  value={incMethod}
                  onChange={(e) => setIncMethod(e.target.value)}
                  placeholder="e.g. Stripe, cash, transfer"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Notes (optional)
                </label>
                <input
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={onLogIncome}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Log income"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit payable modal */}
      {editEntry && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit payable
              </h3>
              <button
                type="button"
                onClick={() => setEditEntry(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Name</label>
                <input
                  value={editEntry.name}
                  onChange={(e) =>
                    setEditEntry({ ...editEntry, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Category
                  </label>
                  <select
                    value={editEntry.category}
                    onChange={(e) =>
                      setEditEntry({ ...editEntry, category: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="salary">Salaries</option>
                    <option value="rent">Rent</option>
                    <option value="utility">Utilities</option>
                    <option value="supplies">Supplies</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editEntry.expectedAmount}
                    onChange={(e) =>
                      setEditEntry({
                        ...editEntry,
                        expectedAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Due date
                </label>
                <input
                  type="date"
                  value={editEntry.dueDate ?? ""}
                  onChange={(e) =>
                    setEditEntry({
                      ...editEntry,
                      dueDate: e.target.value || null,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Payment method
                </label>
                <input
                  value={editEntry.paymentMethod ?? ""}
                  onChange={(e) =>
                    setEditEntry({
                      ...editEntry,
                      paymentMethod: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <input
                  value={editEntry.notes ?? ""}
                  onChange={(e) =>
                    setEditEntry({ ...editEntry, notes: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={onSaveEditEntry}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit income modal */}
      {editIncome && canEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Edit income
              </h3>
              <button
                type="button"
                onClick={() => setEditIncome(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Source</label>
                <input
                  value={editIncome.sourceLabel}
                  onChange={(e) =>
                    setEditIncome({
                      ...editIncome,
                      sourceLabel: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editIncome.amount}
                    onChange={(e) =>
                      setEditIncome({
                        ...editIncome,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Status
                  </label>
                  <select
                    value={editIncome.status}
                    onChange={(e) =>
                      setEditIncome({
                        ...editIncome,
                        status: e.target.value as "paid" | "pending",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="paid">Collected</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Payment method
                </label>
                <input
                  value={editIncome.paymentMethod ?? ""}
                  onChange={(e) =>
                    setEditIncome({
                      ...editIncome,
                      paymentMethod: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <input
                  value={editIncome.notes ?? ""}
                  onChange={(e) =>
                    setEditIncome({ ...editIncome, notes: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={onSaveEditIncome}
                className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
