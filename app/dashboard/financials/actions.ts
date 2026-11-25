"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { getFinancialAccess } from "@/lib/financials/access";

const PATH = "/dashboard/financials";

type PayableCategory = "salary" | "utility" | "rent" | "other" | "supplies";

function periodMonthValid(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

function dueDateForMonth(period: string, dueDay: number | null): string | null {
  if (!dueDay || dueDay < 1) return null;
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${period}-${String(day).padStart(2, "0")}`;
}

/** Schema CHECK only allows salary|utility|rent|other — map UI extras. */
function normalizeCategory(cat: string): "salary" | "utility" | "rent" | "other" {
  if (cat === "salary" || cat === "utility" || cat === "rent" || cat === "other") {
    return cat;
  }
  return "other";
}

async function requireFinancialContext(minEdit = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const active = await getActiveOrg();
  if (!active) throw new Error("No active workspace");

  const access = await getFinancialAccess(
    active.organizationId,
    user.id,
    active.role,
  );
  if (!access.allowed) throw new Error("Forbidden");
  if (minEdit && !access.canEdit) throw new Error("Forbidden: view only");

  return {
    user,
    organizationId: active.organizationId,
    access,
    admin: createAdminClient(),
  };
}

export async function ensurePeriodEntries(periodMonth: string) {
  if (!periodMonthValid(periodMonth)) throw new Error("Invalid period");

  const { organizationId, admin, access } =
    await requireFinancialContext(false);

  const { count } = await admin
    .from("financial_monthly_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("period_month", periodMonth);

  if ((count ?? 0) > 0) {
    return { generated: 0 };
  }

  if (!access.canEdit && !access.isCeo) {
    return { generated: 0 };
  }

  const { data: items } = await admin
    .from("financial_recurring_items")
    .select("id, name, category, default_amount, due_day, billing_cycle")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  const rows = (items ?? [])
    .filter((i) => i.billing_cycle !== "one_time")
    .map((i) => ({
      organization_id: organizationId,
      period_month: periodMonth,
      recurring_item_id: i.id,
      name: i.name,
      category: normalizeCategory(String(i.category)),
      expected_amount: i.default_amount,
      actual_amount: null,
      status: "unpaid" as const,
      due_date: dueDateForMonth(periodMonth, i.due_day as number | null),
    }));

  if (rows.length === 0) return { generated: 0 };

  const { error } = await admin.from("financial_monthly_entries").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  return { generated: rows.length };
}

/**
 * Add any active recurring items missing from this period
 * (does not wipe existing paid/unpaid rows).
 */
export async function carryForwardRecurring(periodMonth: string) {
  if (!periodMonthValid(periodMonth)) throw new Error("Invalid period");

  const { organizationId, admin } = await requireFinancialContext(true);

  const [{ data: items }, { data: existing }] = await Promise.all([
    admin
      .from("financial_recurring_items")
      .select("id, name, category, default_amount, due_day, billing_cycle")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    admin
      .from("financial_monthly_entries")
      .select("recurring_item_id")
      .eq("organization_id", organizationId)
      .eq("period_month", periodMonth),
  ]);

  const already = new Set(
    (existing ?? [])
      .map((e) => e.recurring_item_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  const rows = (items ?? [])
    .filter((i) => i.billing_cycle !== "one_time")
    .filter((i) => !already.has(i.id as string))
    .map((i) => ({
      organization_id: organizationId,
      period_month: periodMonth,
      recurring_item_id: i.id,
      name: i.name,
      category: normalizeCategory(String(i.category)),
      expected_amount: i.default_amount,
      actual_amount: null,
      status: "unpaid" as const,
      due_date: dueDateForMonth(periodMonth, i.due_day as number | null),
    }));

  if (rows.length === 0) return { generated: 0 };

  const { error } = await admin.from("financial_monthly_entries").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  return { generated: rows.length };
}

export async function toggleEntryPaid(input: {
  entryId: string;
  paid: boolean;
  actualAmount?: number | null;
}) {
  const { user, organizationId, admin } = await requireFinancialContext(true);

  const { data: existing } = await admin
    .from("financial_monthly_entries")
    .select("id, expected_amount, organization_id")
    .eq("id", input.entryId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!existing) throw new Error("Entry not found");

  const actual =
    input.actualAmount != null
      ? input.actualAmount
      : input.paid
        ? Number(existing.expected_amount)
        : null;

  const { error } = await admin
    .from("financial_monthly_entries")
    .update({
      status: input.paid ? "paid" : "unpaid",
      paid_at: input.paid ? new Date().toISOString() : null,
      paid_by_user_id: input.paid ? user.id : null,
      actual_amount: actual,
    })
    .eq("id", input.entryId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateEntryActual(input: {
  entryId: string;
  actualAmount: number;
}) {
  const { organizationId, admin } = await requireFinancialContext(true);

  const { error } = await admin
    .from("financial_monthly_entries")
    .update({ actual_amount: input.actualAmount })
    .eq("id", input.entryId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function updatePayableEntry(input: {
  entryId: string;
  name: string;
  category: PayableCategory;
  expectedAmount: number;
  dueDate?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}) {
  const { organizationId, admin } = await requireFinancialContext(true);

  if (!input.name.trim()) throw new Error("Name required");

  const { error } = await admin
    .from("financial_monthly_entries")
    .update({
      name: input.name.trim(),
      category: normalizeCategory(input.category),
      expected_amount: input.expectedAmount,
      due_date: input.dueDate || null,
    })
    .eq("id", input.entryId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function deletePayableEntry(entryId: string) {
  const { organizationId, admin } = await requireFinancialContext(true);

  const { error } = await admin
    .from("financial_monthly_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function logIncome(input: {
  periodMonth: string;
  sourceLabel: string;
  amount: number;
  notes?: string;
  status?: "paid" | "pending";
  paymentMethod?: string;
}) {
  if (!periodMonthValid(input.periodMonth)) throw new Error("Invalid period");
  if (!input.sourceLabel.trim()) throw new Error("Source label required");

  const { user, organizationId, admin } = await requireFinancialContext(true);

  const notesParts: string[] = [];
  if (input.notes?.trim()) notesParts.push(input.notes.trim());
  if (input.status && input.status !== "paid") {
    notesParts.push(`[status:${input.status}]`);
  }
  if (input.paymentMethod?.trim()) {
    notesParts.push(`[method:${input.paymentMethod.trim()}]`);
  }

  const { error } = await admin.from("financial_income_logs").insert({
    organization_id: organizationId,
    period_month: input.periodMonth,
    source_label: input.sourceLabel.trim(),
    amount: input.amount,
    notes: notesParts.length ? notesParts.join(" ") : null,
    logged_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateIncomeLog(input: {
  id: string;
  sourceLabel: string;
  amount: number;
  notes?: string | null;
  status?: "paid" | "pending";
  paymentMethod?: string | null;
}) {
  const { organizationId, admin } = await requireFinancialContext(true);

  if (!input.sourceLabel.trim()) throw new Error("Source label required");

  const notesParts: string[] = [];
  if (input.notes?.trim()) notesParts.push(input.notes.trim());
  if (input.status && input.status !== "paid") {
    notesParts.push(`[status:${input.status}]`);
  }
  if (input.paymentMethod?.trim()) {
    notesParts.push(`[method:${input.paymentMethod.trim()}]`);
  }

  const { error } = await admin
    .from("financial_income_logs")
    .update({
      source_label: input.sourceLabel.trim(),
      amount: input.amount,
      notes: notesParts.length ? notesParts.join(" ") : null,
    })
    .eq("id", input.id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteIncomeLog(id: string) {
  const { organizationId, admin } = await requireFinancialContext(true);

  const { error } = await admin
    .from("financial_income_logs")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function addPayable(input: {
  periodMonth: string;
  name: string;
  category: PayableCategory;
  amount: number;
  saveAsRecurring: boolean;
  billingCycle?: "monthly" | "biweekly" | "one_time";
  dueDay?: number | null;
  dueDate?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}) {
  if (!periodMonthValid(input.periodMonth)) throw new Error("Invalid period");
  if (!input.name.trim()) throw new Error("Name required");

  const { user, organizationId, admin } = await requireFinancialContext(true);
  const category = normalizeCategory(input.category);

  let recurringItemId: string | null = null;

  if (input.saveAsRecurring) {
    const cycle = input.billingCycle ?? "monthly";
    const { data: item, error: itemErr } = await admin
      .from("financial_recurring_items")
      .insert({
        organization_id: organizationId,
        name: input.name.trim(),
        category,
        default_amount: input.amount,
        billing_cycle: cycle,
        due_day: input.dueDay ?? null,
        is_active: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (itemErr) throw new Error(itemErr.message);
    recurringItemId = item.id as string;
  }

  const dueDate =
    input.dueDate ||
    dueDateForMonth(input.periodMonth, input.dueDay ?? null);

  const { error } = await admin.from("financial_monthly_entries").insert({
    organization_id: organizationId,
    period_month: input.periodMonth,
    recurring_item_id: recurringItemId,
    name: input.name.trim(),
    category,
    expected_amount: input.amount,
    actual_amount: null,
    status: "unpaid",
    due_date: dueDate,
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}

export async function setFinancialMemberAccess(input: {
  userId: string;
  role: "none" | "view" | "edit";
}) {
  const { user, organizationId, admin, access } =
    await requireFinancialContext(false);

  if (!access.isCeo) throw new Error("Only the workspace owner can manage access");

  if (input.userId === user.id) {
    return { ok: true };
  }

  const { data: member } = await admin
    .from("org_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!member) throw new Error("User is not a workspace member");

  if (input.role === "none") {
    await admin
      .from("workspace_financial_access")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", input.userId);
  } else {
    await admin.from("workspace_financial_access").upsert(
      {
        organization_id: organizationId,
        user_id: input.userId,
        role: input.role,
        granted_by: user.id,
      },
      { onConflict: "organization_id,user_id" },
    );
  }

  revalidatePath(PATH);
  return { ok: true };
}

export async function deactivateRecurringItem(id: string) {
  const { organizationId, admin } = await requireFinancialContext(true);

  const { error } = await admin
    .from("financial_recurring_items")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
  return { ok: true };
}
