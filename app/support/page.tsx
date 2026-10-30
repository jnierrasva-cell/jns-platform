import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Support | JNS Systems",
  description:
    "Get help with your JNS Systems account, workspace, bookings, integrations, or other product issues.",
  pathname: "/support",
});

export default function SupportPage() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-[#1e2a4a] bg-[#0B132B]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <BrandMark />
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Help
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Support</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Something broken, unclear, or blocking your workspace? Send a short
          note—we read these and use them to fix the product.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Email us</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Include your account email, workspace name if you have one, and what
            you expected vs what happened. Screenshots help.
          </p>
          <a
            href="mailto:support@jnsystem.app?subject=JNS%20support"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#0B132B] px-4 text-sm font-medium text-white hover:bg-[#111e3a]"
          >
            support@jnsystem.app
          </a>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            Before you write
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
            <li>Try another browser or a hard refresh</li>
            <li>Confirm you&apos;re on the correct workspace under My orgs</li>
            <li>
              Check your plan badge—some tools need Starter, Pro, or Business
            </li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-zinc-500">
          <Link href="/login" className="underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/terms" className="underline">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
        </p>
      </main>
    </div>
  );
}
