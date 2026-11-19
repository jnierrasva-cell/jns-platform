"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  CalendarDays,
  Plus,
  Search,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  createTask,
  updateTask,
  setTaskAssignees,
  deleteTask,
  addTaskComment,
  sendTaskFollowUp,
} from "@/app/dashboard/tasks/actions";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_PRIORITIES,
  isOverdue,
  overdueDays,
  isActiveStatus,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/tasks/types";

type TeamMember = {
  userId: string;
  role: string;
  name: string;
  email: string | null;
};

type ContactOpt = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  contactId: string | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  externalUrl: string | null;
  projectName: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastFollowUpAt: string | null;
  assigneeIds: string[];
};

type CommentRow = {
  id: string;
  task_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
};

const inputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

function contactLabel(c?: ContactOpt | TaskRow["contact"] | null) {
  if (!c) return "—";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "—";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "in_progress":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "on_hold":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function priorityBadgeClass(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-100";
    case "low":
      return "bg-slate-50 text-slate-600 ring-slate-200";
    default:
      return "bg-amber-50 text-amber-800 ring-amber-100";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + (d.includes("T") ? "" : "T12:00:00")).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric", year: "numeric" },
    );
  } catch {
    return d;
  }
}

export function TasksClient({
  organizationId,
  isManager,
  currentUserId,
  tasks,
  team,
  contacts,
  comments,
  activity,
  focusTaskId,
  defaultView,
}: {
  organizationId: string;
  isManager: boolean;
  currentUserId: string;
  tasks: TaskRow[];
  team: TeamMember[];
  contacts: ContactOpt[];
  comments: CommentRow[];
  activity: ActivityRow[];
  focusTaskId: string | null;
  defaultView: "all" | "my" | "calendar";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "my" | "calendar">(defaultView);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(focusTaskId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const teamById = useMemo(() => {
    const m = new Map<string, TeamMember>();
    team.forEach((t) => m.set(t.userId, t));
    return m;
  }, [team]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (view === "my") {
      list = list.filter(
        (t) =>
          t.assigneeIds.includes(currentUserId) || t.createdBy === currentUserId,
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.projectName ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (assigneeFilter) list = list.filter((t) => t.assigneeIds.includes(assigneeFilter));
    return list;
  }, [tasks, view, currentUserId, search, statusFilter, priorityFilter, assigneeFilter]);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter((t) => isActiveStatus(t.status)).length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    TASK_STATUSES.forEach((s) => (byStatus[s] = 0));
    TASK_PRIORITIES.forEach((p) => (byPriority[p] = 0));
    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    });
    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, active, completed, overdue, byStatus, byPriority, completionPct };
  }, [tasks]);

  const detailTask = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;

  const calendarCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date, day: d });
    }
    return cells;
  }, [calMonth]);

  const tasksByDue = useMemo(() => {
    const m = new Map<string, TaskRow[]>();
    filtered.forEach((t) => {
      if (!t.dueDate) return;
      const list = m.get(t.dueDate) ?? [];
      list.push(t);
      m.set(t.dueDate, list);
    });
    return m;
  }, [filtered]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => isActiveStatus(t.status) && t.dueDate)
        .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
        .slice(0, 5),
    [tasks],
  );

  const overdueList = useMemo(
    () =>
      tasks
        .filter((t) => isOverdue(t.dueDate, t.status))
        .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
        .slice(0, 8),
    [tasks],
  );

  function resetCreate() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("not_started");
    setStartDate("");
    setDueDate("");
    setContactId("");
    setExternalUrl("");
    setProjectName("");
    setAssigneeIds([]);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createTask({
        organizationId,
        title,
        description: description || undefined,
        priority,
        status,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        contactId: contactId || undefined,
        externalUrl: externalUrl || undefined,
        projectName: projectName || undefined,
        assigneeIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Task created.");
      resetCreate();
      setShowCreate(false);
      router.refresh();
    });
  }

  function handleStatusChange(taskId: string, next: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateTask({ organizationId, taskId, status: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Status updated.");
      router.refresh();
    });
  }

  function handleDelete(taskId: string) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTask({ organizationId, taskId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetailId(null);
      setSuccess("Task deleted.");
      router.refresh();
    });
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!detailId) return;
    setError(null);
    startTransition(async () => {
      const result = await addTaskComment({
        organizationId,
        taskId: detailId,
        body: commentBody,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCommentBody("");
      setSuccess("Update added.");
      router.refresh();
    });
  }

  function handleFollowUp(taskId: string) {
    setError(null);
    startTransition(async () => {
      const result = await sendTaskFollowUp({ organizationId, taskId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Follow-up sent.");
      router.refresh();
    });
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function saveAssignees(taskId: string, ids: string[]) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskAssignees({
        organizationId,
        taskId,
        assigneeIds: ids,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Assignees updated.");
      router.refresh();
    });
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Work</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Tasks</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">
            Create, assign, and track work across your team.
          </p>
        </div>
        <button type="button" className={primaryBtn} onClick={() => { setShowCreate((v) => !v); setError(null); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          {showCreate ? "Close" : "New task"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p role="status" className="mt-4 text-sm font-medium text-emerald-700">{success}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: metrics.total },
          { label: "Active", value: metrics.active },
          { label: "Completed", value: metrics.completed },
          { label: "Overdue", value: metrics.overdue, alert: metrics.overdue > 0 },
        ].map((m) => (
          <div key={m.label} className={`rounded-2xl border bg-white px-4 py-3 shadow-sm ${m.alert ? "border-amber-200 bg-amber-50/40" : "border-slate-200/80"}`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{m.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{m.value}</p>
          </div>
        ))}
      </div>

      {metrics.total > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Completion</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{metrics.completionPct}%</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${metrics.completionPct}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Priority mix</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {TASK_PRIORITIES.map((p) => (
                <span key={p} className={`rounded-full px-2.5 py-0.5 font-medium ring-1 ${priorityBadgeClass(p)}`}>
                  {PRIORITY_LABELS[p]}: {metrics.byPriority[p] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <form onSubmit={handleCreate} className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">New task</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Title <span className="text-red-500">*</span></label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="What needs to be done?" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} min-h-0`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputClass}>
                {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={inputClass}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Related client</label>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{contactLabel(c)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Project (optional)</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputClass} placeholder="e.g. Onboarding" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">External link</label>
              <input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} className={inputClass} placeholder="https://" />
            </div>
            {isManager ? (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Assignees</label>
                <div className="flex flex-wrap gap-2">
                  {team.map((m) => {
                    const on = assigneeIds.includes(m.userId);
                    return (
                      <button key={m.userId} type="button" onClick={() => toggleAssignee(m.userId)} className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${on ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={isPending} className={primaryBtn}>{isPending ? "Saving…" : "Create task"}</button>
            <button type="button" className={secondaryBtn} onClick={() => { setShowCreate(false); resetCreate(); }}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {([["all", "All tasks"], ["my", "My tasks"], ["calendar", "Calendar"]] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${view === key ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>
        {view !== "calendar" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className={`${inputClass} min-h-[40px] pl-9 sm:w-48`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputClass} min-h-[40px] sm:w-36`}>
              <option value="">All statuses</option>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={`${inputClass} min-h-[40px] sm:w-32`}>
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
            {isManager ? (
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className={`${inputClass} min-h-[40px] sm:w-40`}>
                <option value="">All assignees</option>
                {team.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            ) : null}
          </div>
        ) : null}
      </div>

      {overdueList.length > 0 && view !== "calendar" ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-950">{overdueList.length} overdue task{overdueList.length === 1 ? "" : "s"}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-amber-900/90">
                {overdueList.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => setDetailId(t.id)}>{t.title}</button>
                    <span className="text-amber-800/80"> · {overdueDays(t.dueDate!)}d overdue · due {formatDate(t.dueDate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" className={secondaryBtn} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>Previous</button>
            <p className="text-sm font-semibold text-slate-900">{calMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
            <button type="button" className={secondaryBtn} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>Next</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => {
              const dayTasks = cell.date ? tasksByDue.get(cell.date) ?? [] : [];
              return (
                <div key={i} className={`min-h-[72px] rounded-lg border p-1.5 sm:min-h-[88px] ${cell.date ? "border-slate-100 bg-slate-50/50" : "border-transparent"}`}>
                  {cell.day ? <p className="text-[11px] font-medium text-slate-500">{cell.day}</p> : null}
                  <div className="mt-0.5 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <button key={t.id} type="button" onClick={() => setDetailId(t.id)} className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${isOverdue(t.dueDate, t.status) ? "bg-amber-100 text-amber-900" : t.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>
                        {t.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 ? <p className="text-[10px] text-slate-400">+{dayTasks.length - 3} more</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view !== "calendar" ? (
        filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={CheckSquare}
              title={tasks.length === 0 ? "No tasks yet" : "No matching tasks"}
              description={tasks.length === 0 ? "Create your first task to assign work, set deadlines, and track progress." : "Try clearing filters or switching to All tasks."}
              actionLabel={tasks.length === 0 ? "New task" : undefined}
              onAction={tasks.length === 0 ? () => setShowCreate(true) : undefined}
            />
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3 md:hidden">
              {filtered.map((t) => (
                <li key={t.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <button type="button" className="w-full text-left" onClick={() => setDetailId(t.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusBadgeClass(t.status)}`}>
                        {STATUS_LABELS[t.status as TaskStatus] ?? t.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${priorityBadgeClass(t.priority)}`}>
                        {PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority}
                      </span>
                      {isOverdue(t.dueDate, t.status) ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">Overdue</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Due {formatDate(t.dueDate)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t.assigneeIds.length === 0 ? "Unassigned" : t.assigneeIds.map((id) => teamById.get(id)?.name ?? "Member").join(", ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Assignees</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3.5">
                        <button type="button" className="text-left font-medium text-slate-900 hover:text-sky-700" onClick={() => setDetailId(t.id)}>{t.title}</button>
                        {t.projectName ? <p className="text-xs text-slate-400">{t.projectName}</p> : null}
                        {t.contact ? (
                          <p className="text-xs text-slate-500">
                            <Link href={`/dashboard/contacts/${t.contact.id}`} className="hover:text-sky-700 hover:underline">{contactLabel(t.contact)}</Link>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {t.assigneeIds.length === 0 ? "—" : t.assigneeIds.map((id) => teamById.get(id)?.name ?? "?").join(", ")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${priorityBadgeClass(t.priority)}`}>
                          {PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusBadgeClass(t.status)}`}>
                          {STATUS_LABELS[t.status as TaskStatus] ?? t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className={isOverdue(t.dueDate, t.status) ? "font-medium text-amber-700" : ""}>{formatDate(t.dueDate)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {isActiveStatus(t.status) ? (
                            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" value={t.status} disabled={isPending} onChange={(e) => handleStatusChange(t.id, e.target.value)}>
                              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                          ) : null}
                          <button type="button" className={secondaryBtn} onClick={() => setDetailId(t.id)}>Open</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : null}

      {upcoming.length > 0 && view === "all" ? (
        <div className="mt-8">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Upcoming</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((t) => (
              <button key={t.id} type="button" onClick={() => setDetailId(t.id)} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-sky-200">
                <p className="truncate text-sm font-medium text-slate-900">{t.title}</p>
                <p className="mt-1 text-xs text-slate-500">Due {formatDate(t.dueDate)} · {PRIORITY_LABELS[t.priority as TaskPriority] ?? t.priority}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {detailTask ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label="Close" onClick={() => setDetailId(null)} />
          <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Task</p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{detailTask.title}</h2>
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" onClick={() => setDetailId(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusBadgeClass(detailTask.status)}`}>
                  {STATUS_LABELS[detailTask.status as TaskStatus] ?? detailTask.status}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${priorityBadgeClass(detailTask.priority)}`}>
                  {PRIORITY_LABELS[detailTask.priority as TaskPriority] ?? detailTask.priority}
                </span>
                {isOverdue(detailTask.dueDate, detailTask.status) ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">{overdueDays(detailTask.dueDate!)}d overdue</span>
                ) : null}
              </div>
              {detailTask.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{detailTask.description}</p>
              ) : (
                <p className="text-sm text-slate-400">No description</p>
              )}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-400">Due</dt><dd className="font-medium text-slate-800">{formatDate(detailTask.dueDate)}</dd></div>
                <div><dt className="text-xs text-slate-400">Start</dt><dd className="font-medium text-slate-800">{formatDate(detailTask.startDate)}</dd></div>
                <div><dt className="text-xs text-slate-400">Project</dt><dd className="font-medium text-slate-800">{detailTask.projectName || "—"}</dd></div>
                <div>
                  <dt className="text-xs text-slate-400">Client</dt>
                  <dd className="font-medium text-slate-800">
                    {detailTask.contact ? (
                      <Link href={`/dashboard/contacts/${detailTask.contact.id}`} className="text-sky-700 hover:underline">{contactLabel(detailTask.contact)}</Link>
                    ) : "—"}
                  </dd>
                </div>
              </dl>
              {detailTask.externalUrl ? (
                <a href={detailTask.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline">
                  Open link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Assignees</p>
                <p className="mt-1 text-sm text-slate-700">
                  {detailTask.assigneeIds.length === 0 ? "Unassigned" : detailTask.assigneeIds.map((id) => teamById.get(id)?.name ?? "Member").join(", ")}
                </p>
                {isManager ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {team.map((m) => {
                      const on = detailTask.assigneeIds.includes(m.userId);
                      return (
                        <button key={m.userId} type="button" disabled={isPending} onClick={() => {
                          const next = on ? detailTask.assigneeIds.filter((id) => id !== m.userId) : [...detailTask.assigneeIds, m.userId];
                          saveAssignees(detailTask.id, next);
                        }} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${on ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-white text-slate-500 ring-slate-200"}`}>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {isActiveStatus(detailTask.status) ? (
                <div>
                  <label className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Update status</label>
                  <select className={`${inputClass} mt-1`} value={editStatus || detailTask.status} disabled={isPending} onChange={(e) => { setEditStatus(e.target.value); handleStatusChange(detailTask.id, e.target.value); }}>
                    {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              ) : null}
              {isManager && isActiveStatus(detailTask.status) ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={isPending} className={secondaryBtn} onClick={() => handleFollowUp(detailTask.id)}>Send follow-up</button>
                  {detailTask.lastFollowUpAt ? (
                    <p className="self-center text-xs text-slate-400">Last follow-up {new Date(detailTask.lastFollowUpAt).toLocaleString()}</p>
                  ) : null}
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Progress updates</p>
                <ul className="mt-2 space-y-2">
                  {comments.filter((c) => c.task_id === detailTask.id).map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap">{c.body}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{teamById.get(c.created_by ?? "")?.name ?? "Someone"} · {new Date(c.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
                <form onSubmit={handleComment} className="mt-3 space-y-2">
                  <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} rows={2} placeholder="Add a progress update…" className={`${inputClass} min-h-0`} />
                  <button type="submit" disabled={isPending || !commentBody.trim()} className={secondaryBtn}>Add update</button>
                </form>
              </div>
              {activity.filter((a) => a.task_id === detailTask.id).length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Activity</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
                    {activity.filter((a) => a.task_id === detailTask.id).map((a) => (
                      <li key={a.id}><span className="font-medium text-slate-700">{a.action.replace(/_/g, " ")}</span> · {new Date(a.created_at).toLocaleString()}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {isManager ? (
                <button type="button" disabled={isPending} className="w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50" onClick={() => handleDelete(detailTask.id)}>
                  Delete task
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
