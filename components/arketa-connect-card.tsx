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
  instructor_email_map_text?: string;
  instructor_count?: number;
};

export function ArketaConnectCard({
  organizationId,
  canManage,
  locations,
}: {
  organizationId: string;
  canManage: boolean;
  locations: ArketaLocationRow[];
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
  const [instructorMap, setInstructorMap] = useState("");

  function resetForm() {
    setLabel("");
    setPartnerId("");
    setApiKey("");
    setCalendarId("");
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
      } else {
        setError(result.error);
      }
    });
  }

  function handleClearResync(id: string) {
    setError(null);
    setSuccess(null);
    if (
      !window.confirm(
        "Clear old JNS/Arketa events on this calendar (next ~3 weeks), then sync once. Continue?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await clearAndResyncArketaLocationAction(
        organizationId,
        id,
      );
      if (result.ok) {
        setSuccess(
          `${result.label}: cleaned ${result.cleaned}, created ${result.created}, updated ${result.updated}, removed ${result.deleted}, skipped ${result.skipped}`,
        );
      } else {
        setError(result.error);
      }
    });
  }

  const connected = locations.length > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Arketa</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sync class schedules from Arketa into Google Calendar (one-way).
            Each location uses its own Partner API credentials and calendar.
            Use Edit to set instructor name → email so guests get notified.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          {connected ? `${locations.length} location(s)` : "Not connected"}
        </span>
      </div>

      {locations.length > 0 && (
        <div className="mt-5 space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {loc.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Partner ID: {loc.partner_id}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Calendar:{" "}
                    {loc.google_calendar_id
                      ? loc.google_calendar_id
                      : "Not set — required for sync"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Instructor emails mapped: {loc.instructor_count ?? 0}
                    {(loc.instructor_count ?? 0) === 0
                      ? " — Edit to add guests"
                      : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Last sync:{" "}
                    {loc.last_synced_at
                      ? new Date(loc.last_synced_at).toLocaleString()
                      : "Never"}
                    {loc.last_sync_status
                      ? ` · ${loc.last_sync_status}`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startEdit(loc)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTest(loc.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !loc.google_calendar_id}
                      onClick={() => handleSync(loc.id)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Sync now
                    </button>
                    <button
                      type="button"
                      disabled={isPending || !loc.google_calendar_id}
                      onClick={() => handleClearResync(loc.id)}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                    >
                      Clear & resync
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(loc.id)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage ? (
        <div className="mt-5">
          {!showForm ? (
            <button
              type="button"
              onClick={startAdd}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Add Arketa location
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <p className="text-sm font-medium text-zinc-800">
                {editingId ? "Edit location" : "Add location"}
              </p>
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. Rancho)"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Partner ID"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
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
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="Google Calendar ID"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <div>
                <label className="text-xs font-medium text-zinc-600">
                  Instructor emails
                </label>
                <p className="mt-0.5 text-[11px] text-zinc-500">
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
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
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
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
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
