"use client";

import { useState, useTransition } from "react";
import {
  saveArketaLocation,
  deleteArketaLocation,
  testArketaLocation,
  syncArketaLocation,
} from "@/app/dashboard/integrations/arketa-actions";

export type ArketaLocationRow = {
  id: string;
  label: string;
  partner_id: string;
  google_calendar_id: string | null;
  last_synced_at: string | null;
  last_sync_status: string | null;
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

  const [label, setLabel] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [calendarId, setCalendarId] = useState("");

  function resetForm() {
    setLabel("");
    setPartnerId("");
    setApiKey("");
    setCalendarId("");
    setShowForm(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await saveArketaLocation({
          organizationId,
          label,
          partnerId,
          apiKey,
          googleCalendarId: calendarId,
        });
        setSuccess("Location saved and credentials verified.");
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await deleteArketaLocation(organizationId, id);
        setSuccess("Location removed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete");
      }
    });
  }

  function handleTest(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await testArketaLocation(organizationId, id);
        setSuccess(result.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Test failed");
      }
    });
  }

  function handleSync(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await syncArketaLocation(organizationId, id);
        setSuccess(
          `${result.label}: created ${result.created}, updated ${result.updated}, removed ${result.deleted}, skipped ${result.skipped}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
      }
    });
  }

  const connected = locations.length > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Arketa
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sync class schedules from Arketa into Google Calendar (one-way).
            Each location uses its own Partner API credentials and calendar.
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
                  <p className="text-sm font-medium text-zinc-900">{loc.label}</p>
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
                    Last sync:{" "}
                    {loc.last_synced_at
                      ? new Date(loc.last_synced_at).toLocaleString()
                      : "Never"}
                    {loc.last_sync_status ? ` · ${loc.last_sync_status}` : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isPending || !loc.google_calendar_id}
                      onClick={() => handleSync(loc.id)}
                      className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-700 disabled:opacity-40"
                    >
                      Sync now
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTest(loc.id)}
                      className="text-xs text-cyan-700 underline underline-offset-2 hover:text-cyan-800 disabled:opacity-50"
                    >
                      Test API
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(loc.id)}
                      className="text-xs text-red-600 underline underline-offset-2 hover:text-red-600 disabled:opacity-50"
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
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Add Arketa location
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. Upland)"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="Partner ID"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                required
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API key"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <input
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="Google Calendar ID"
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {isPending ? "Verifying…" : "Save location"}
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

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}