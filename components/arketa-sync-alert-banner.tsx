import Link from "next/link";

export type ArketaSyncIssue = {
  id: string;
  label: string;
  last_sync_status: string | null;
  last_sync_error: string | null;
  consecutive_failures: number;
};

export function ArketaSyncAlertBanner({
  issues,
}: {
  issues: ArketaSyncIssue[];
}) {
  if (!issues.length) return null;

  const labels = issues.map((i) => i.label).join(", ");
  const firstError = issues.find((i) => i.last_sync_error)?.last_sync_error;

  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
      <p className="font-medium">Arketa sync needs attention</p>
      <p className="mt-1 text-red-900/90">
        {issues.length === 1
          ? `Location “${labels}” failed to sync.`
          : `${issues.length} locations need a look: ${labels}.`}
        {firstError ? ` ${firstError.slice(0, 160)}` : ""}
      </p>
      <Link
        href="/dashboard/integrations"
        className="mt-2 inline-block text-sm font-medium text-red-800 underline underline-offset-2"
      >
        Open Integrations →
      </Link>
    </div>
  );
}
