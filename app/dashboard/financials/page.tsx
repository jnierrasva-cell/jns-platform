import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { getFinancialAccess } from "@/lib/financials/access";
import { FinancialsClient } from "@/components/financials-client";
import { ensurePeriodEntries } from "./actions";

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/account-type");

  const access = await getFinancialAccess(
    active.organizationId,
    user.id,
    active.role,
  );
  if (!access.allowed) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const period =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentPeriod();

  const orgId = active.organizationId;
  const admin = createAdminClient();

  await ensurePeriodEntries(period);

  const trendStart = shiftPeriod(period, -11);

  const [entriesRes, incomeRes, trendEntriesRes, trendIncomeRes, membersRes, grantsRes] =
    await Promise.all([
      admin
        .from("financial_monthly_entries")
        .select(
          "id, period_month, recurring_item_id, name, category, expected_amount, actual_amount, status, due_date, paid_at, paid_by_user_id",
        )
        .eq("organization_id", orgId)
        .eq("period_month", period)
        .order("category")
        .order("name"),
      admin
        .from("financial_income_logs")
        .select(
          "id, period_month, source_label, amount, notes, logged_by, created_at, status, payment_method",
        )
        .eq("organization_id", orgId)
        .eq("period_month", period)
        .order("created_at", { ascending: false }),
      admin
        .from("financial_monthly_entries")
        .select("period_month, expected_amount, actual_amount, status")
        .eq("organization_id", orgId)
        .gte("period_month", trendStart)
        .lte("period_month", period),
      admin
        .from("financial_income_logs")
        .select("period_month, amount, status")
        .eq("organization_id", orgId)
        .gte("period_month", trendStart)
        .lte("period_month", period),
      access.isCeo
        ? admin
            .from("org_members")
            .select("user_id, role")
            .eq("organization_id", orgId)
        : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
      access.isCeo
        ? admin
            .from("workspace_financial_access")
            .select("user_id, role")
            .eq("organization_id", orgId)
        : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
    ]);

  const entries = (entriesRes.data ?? []).map((e) => ({
    id: e.id as string,
    periodMonth: e.period_month as string,
    recurringItemId: (e.recurring_item_id as string | null) ?? null,
    name: e.name as string,
    category: e.category as string,
    expectedAmount: Number(e.expected_amount ?? 0),
    actualAmount:
      e.actual_amount != null ? Number(e.actual_amount) : null,
    status: e.status as "paid" | "unpaid",
    dueDate: (e.due_date as string | null) ?? null,
    paidAt: (e.paid_at as string | null) ?? null,
    paidByUserId: (e.paid_by_user_id as string | null) ?? null,
  }));

  const income = (incomeRes.data ?? []).map((r) => {
    const notes = (r.notes as string | null) ?? null;
    const colStatus = (r.status as string | null) ?? null;
    const legacyPending =
      !colStatus && notes != null && /\[status:pending\]/i.test(notes);
    const status =
      colStatus === "pending" || legacyPending
        ? ("pending" as const)
        : ("paid" as const);
    const colMethod = (r.payment_method as string | null) ?? null;
    const methodMatch = notes?.match(/\[method:([^\]]+)\]/i);
    const paymentMethod =
      colMethod || (methodMatch ? methodMatch[1].trim() : null);
    return {
      id: r.id as string,
      periodMonth: r.period_month as string,
      sourceLabel: r.source_label as string,
      amount: Number(r.amount ?? 0),
      notes,
      loggedBy: (r.logged_by as string | null) ?? null,
      createdAt: r.created_at as string,
      status,
      paymentMethod,
    };
  });

  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    months.push(shiftPeriod(period, -i));
  }

  type MonthAgg = {
    month: string;
    income: number;
    paidSpend: number;
    unpaid: number;
  };
  const byMonth = new Map<string, MonthAgg>();
  for (const m of months) {
    byMonth.set(m, { month: m, income: 0, paidSpend: 0, unpaid: 0 });
  }

  for (const row of trendIncomeRes.data ?? []) {
    const m = row.period_month as string;
    const agg = byMonth.get(m);
    if (!agg) continue;
    // Only collected (paid) income counts toward coverage KPIs
    const st = (row as { status?: string }).status;
    if (st === "pending") continue;
    agg.income += Number(row.amount ?? 0);
  }
  for (const row of trendEntriesRes.data ?? []) {
    const m = row.period_month as string;
    const agg = byMonth.get(m);
    if (!agg) continue;
    if (row.status === "paid") {
      agg.paidSpend += Number(
        row.actual_amount != null ? row.actual_amount : row.expected_amount ?? 0,
      );
    } else {
      agg.unpaid += Number(row.expected_amount ?? 0);
    }
  }

  const trend = months.map((m) => {
    const a = byMonth.get(m)!;
    const committed = a.paidSpend + a.unpaid;
    const net = a.income - committed;
    const margin = a.income > 0 ? (net / a.income) * 100 : 0;
    return {
      month: m,
      income: a.income,
      paidSpend: a.paidSpend,
      unpaid: a.unpaid,
      net,
      margin,
    };
  });

  let team: {
    userId: string;
    role: string;
    name: string;
    email: string | null;
    financialRole: "none" | "view" | "edit";
  }[] = [];

  if (access.isCeo) {
    const memberIds = (membersRes.data ?? []).map((m) => m.user_id as string);
    const grantMap = new Map(
      (grantsRes.data ?? []).map((g) => [
        g.user_id as string,
        (g.role === "edit" ? "edit" : "view") as "view" | "edit",
      ]),
    );

    const { data: profiles } =
      memberIds.length > 0
        ? await admin
            .from("profiles")
            .select("id, email, first_name, last_name, business_name")
            .in("id", memberIds)
        : { data: [] as {
            id: string;
            email: string | null;
            first_name: string | null;
            last_name: string | null;
            business_name: string | null;
          }[] };

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    team = (membersRes.data ?? []).map((m) => {
      const p = profileById.get(m.user_id);
      const name =
        [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
        p?.business_name ||
        p?.email ||
        "Team member";
      const isCeo = m.role === "ceo";
      return {
        userId: m.user_id as string,
        role: m.role as string,
        name,
        email: p?.email ?? null,
        financialRole: isCeo
          ? ("edit" as const)
          : grantMap.get(m.user_id as string) ?? ("none" as const),
      };
    });
  }

  return (
    <FinancialsClient
      organizationId={orgId}
      period={period}
      canEdit={access.canEdit}
      isCeo={access.isCeo}
      currentUserId={user.id}
      entries={entries}
      income={income}
      trend={trend}
      team={team}
    />
  );
}
