"use client";

import { useState, useTransition } from "react";
import {
  saveArketaLocation,
  deleteArketaLocation,
  testArketaLocation,
  syncArketaLocation,
  clearAndResyncArketaLocationAction,
} from "@/app/dashboard/integrations/arketa-actions";

export type ArketaLocationRow = {
  id: string;
  label: string;
  partner_id: string;
  google_calendar_id: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error?: string | null;
  consecutive_failures?: number | null;
  timezone?: string | null;
  instructor_email_map_text?: string;
  instructor_count?: number;
};

function statusBadge(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (s === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (s === "error") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-slate-200/80 bg-slate-50 text-slate-500";
}

export function ArketaConnectCard({
  organizationId,
  canManage,
  locations,
  googleConnectedEmail,
}: {
  organizationId: string;
  canManage: boolean;
  locations: ArketaLocationRow[];
  googleConnectedEmail?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [instructorMap, setInstructorMap] = useState("");

  function resetForm() {
    setLabel("");
    setPartnerId("");
    setApiKey("");
    setCalendarId("");
    setTimezone("America/Los_Angeles");
    setInstructorMap("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(loc: ArketaLocationRow) {
    setEditingId(loc.id);
    setLabel(loc.label);
    setPartnerId(loc.partner_id);
    setApiKey("");
    setCalendarId(loc.google_calendar_id ?? "");
    setTimezone(loc.timezone || "America/Los_Angeles");
    setInstructorMap(loc.instructor_email_map_text ?? "");
    setShowForm(true);
    setError(null);
    setSuccess(null);
  }

  function startAdd() {
    resetForm();
    setShowForm(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveArketaLocation({
        organizationId,
        id: editingId ?? undefined,
        label,
        partnerId,
        apiKey,
        googleCalendarId: calendarId,
        instructorEmailMapText: instructorMap,
        timezone,
      });
      if (result.ok) {
        window.location.href = "/dashboard/integrations";
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteArketaLocation(organizationId, id);
      if (result.ok) {
        window.location.href = "/dashboard/integrations";
      } else {
        setError(result.error);
      }
    });
  }

  function handleTest(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await testArketaLocation(organizationId, id);
      if (result.ok) {
        setSuccess(result.message);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSync(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await syncArketaLocation(organizationId, id);
      if (result.ok) {
        setSuccess(
          `${result.label}: created ${result.created}, updated ${result.updated}, removed ${result.deleted}, skipped ${result.skipped}`,
        );
        window.setTimeout(() => {
          window.location.href = "/dashboard/integrations";
        }, 1200);
      } else {
        setError(result.error);
      }
    });
  }

  function handleClearResync(loc: ArketaLocationRow) {
    setError(null);
    setSuccess(null);
    const cal = loc.google_calendar_id || "(no calendar id)";
    const google = googleConnectedEmail || "(Google not connected)";
    const ok = window.confirm(
      [
        `Clear JNS/Arketa events on this calendar (~next 3 weeks), then sync once.`,
        "",
        `Location: ${loc.label}`,
        `Calendar ID: ${cal}`,
        `Google account: ${google}`,
        "",
        "This deletes matching events on that calendar only. Continue?",
      ].join("\n"),
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await clearAndResyncArketaLocationAction(
        organizationId,
        loc.id,
      );
      if (result.ok) {
        setSuccess(
          `${result.label}: cleaned ${result.cleaned}, created ${result.created}, updated ${result.updated}, removed ${result.deleted}, skipped ${result.skipped}`,
        );
        window.setTimeout(() => {
          window.location.href = "/dashboard/integrations";
        }, 1200);
      } else {
        setError(result.error);
      }
    });
  }

  const connected = locations.length > 0;
  const anyError = locations.some(
    (l) =>
      (l.last_sync_status || "").toLowerCase() === "error" ||
      (l.consecutive_failures ?? 0) > 0,
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Arketa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sync class schedules from Arketa into Google Calendar (one-way).
            Each location uses its own Partner API credentials and calendar.
            Use Edit to set instructor name → email so guests get notified.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
            anyError
              ? "border-red-200 bg-red-50 text-red-700"
              : connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200/80 bg-slate-50 text-slate-500"
          }`}
        >
          {anyError
            ? "Needs attention"
            : connected
              ? `${locations.length} location(s)`
              : "Not connected"}
        </span>
      </div>

      {locations.length > 0 && (
        <div className="mt-5 space-y-3">
          {locations.map((loc) => {
            const status = (loc.last_sync_status || "").toLowerCase();
            const isBad = status === "error" || status === "partial";
            return (
              <div
                key={loc.id}
                className={`rounded-2xl border p-4 ${
                  status === "error"
                    ? "border-red-200 bg-red-50/40"
                    : status === "partial"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-slate-200/80 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {loc.label}
                      </p>
                      {loc.last_sync_status && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadge(
                            loc.last_sync_status,
                          )}`}
                        >
                          {loc.last_sync_status}
                          {(loc.consecutive_failures ?? 0) > 1
                            ? ` · ${loc.consecutive_failures} failures`
                            : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Partner ID: {loc.partner_id}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Calendar:{" "}
                      {loc.google_calendar_id
                        ? loc.google_calendar_id
                        : "Not set — required for sync"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Timezone: {loc.timezone || "America/Los_Angeles"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Instructor emails mapped: {loc.instructor_count ?? 0}
                      {(loc.instructor_count ?? 0) === 0
                        ? " — Edit to add guests"
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Last sync:{" "}
                      {loc.last_synced_at
                        ? new Date(loc.last_synced_at).toLocaleString()
                        : "Never"}
                    </p>
                    {isBad && loc.last_sync_error && (
                      <p
                        className="mt-2 rounded-lg border border-red-200/80 bg-white/80 px-2.5 py-1.5 text-xs text-red-700"
                        role="alert"
                      >
                        {loc.last_sync_error}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => startEdit(loc)}
                        className="rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleTest(loc.id)}
                        className="rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !loc.google_calendar_id}
                        onClick={() => handleSync(loc.id)}
                        className="rounded-2xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Sync now
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !loc.google_calendar_id}
                        onClick={() => handleClearResync(loc)}
                        className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                      >
                        Clear & resync
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(loc.id)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canManage ? (
        <div className="mt-5">
          {!showForm ? (
            <button
              type="button"
              onClick={startAdd}
              className="rounded-2xl border border-slate-200/80 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add Arketa location
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <p className="text-sm font-medium text-slate-800">
                {editingId ? "Edit location" : "Add location"}
              </p>
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. Rancho)"
                className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <input
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Partner ID"
                className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  editingId
                    ? "API key (leave blank to keep current)"
                    : "API key"
                }
                required={!editingId}
                className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="Google Calendar ID"
                className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <p className="text-[11px] text-slate-500">
                Calendar ID is verified against the connected Google account on
                save.
              </p>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Timezone (IANA)
                </label>
                <input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Los_Angeles"
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Used for Google Calendar event times. Examples:
                  America/Los_Angeles, America/Denver.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Instructor emails
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  One per line: Name = email@studio.com — must match Arketa
                  instructor_name for invites.
                </p>
                <textarea
                  value={instructorMap}
                  onChange={(e) => setInstructorMap(e.target.value)}
                  rows={4}
                  placeholder={
                    "Jane Smith = jane@studio.com\nJohn Doe = john@studio.com"
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {isPending
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Save location"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200/80 px-4 py-2.5 text-sm text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Ask your organization owner for Admin access to connect Arketa and
          run sync.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-emerald-600">{success}</p>
      )}
    </div>
  );
}
