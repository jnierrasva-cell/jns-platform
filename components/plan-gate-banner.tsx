import Link from "next/link";

export function PlanGateBanner({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-amber-900/90">{body}</p>
      <Link
        href="/dashboard/billing"
        className="mt-2 inline-block text-sm font-medium text-[#0B132B] underline underline-offset-2"
      >
        Open Billing →
      </Link>
    </div>
  );
}