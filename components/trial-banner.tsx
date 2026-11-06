import Link from "next/link";

export function TrialBanner({
  daysLeft,
  endsLabel,
}: {
  daysLeft: number;
  endsLabel: string | null;
}) {
  const urgent = daysLeft <= 3;

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        urgent
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <p className="font-medium">
        {daysLeft <= 0
          ? "Your Pro trial has ended"
          : daysLeft === 1
            ? "Pro trial · 1 day left"
            : `Pro trial · ${daysLeft} days left`}
      </p>
      <p className={`mt-1 ${urgent ? "text-amber-900/90" : "text-sky-900/80"}`}>
        {daysLeft <= 0
          ? "This workspace is back on Free: contacts, bookings, email rules, and auto-reply still work. Team invites, custom forms, and SMS need a paid plan."
          : `Full Pro features are unlocked until ${endsLabel || "the trial ends"} — no card required. Subscribe under Billing to keep Pro after the trial.`}
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-2 inline-block text-sm font-medium text-sky-700 underline underline-offset-2"
      >
        {daysLeft <= 0 ? "Choose a plan →" : "View trial & plans →"}
      </Link>
    </div>
  );
}
