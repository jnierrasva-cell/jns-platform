import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Terms of Service | JNS Systems",
  description:
    "Review the terms governing access to and use of the JNS Systems website, workspace software, and related services.",
  pathname: "/terms",
});

export default function TermsPage() {
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
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Last updated: October 24, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-6 text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              1. Agreement
            </h2>
            <p className="mt-2">
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of Journey Network Systems (&quot;JNS,&quot;
              &quot;we,&quot; &quot;us&quot;), including our website, workspace
              software, and related services (the &quot;Service&quot;). By
              creating an account or using the Service, you agree to these
              Terms. If you use the Service on behalf of a business, you
              represent that you have authority to bind that business.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              2. The Service
            </h2>
            <p className="mt-2">
              JNS provides tools for managing contacts, bookings, forms, team
              collaboration, integrations, and related business operations. We
              may change, improve, or discontinue features with reasonable
              notice when practical. The Service is provided on a subscription
              or access basis as described at the time of purchase or grant.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              3. Accounts and workspaces
            </h2>
            <p className="mt-2">
              You are responsible for your account credentials and for activity
              under your account and workspaces. You must provide accurate
              registration information and keep it updated. Workspace owners
              and admins control member access and are responsible for how
              their organization uses the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              4. Acceptable use
            </h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Violate any applicable law or third-party rights</li>
              <li>
                Abuse, disrupt, or attempt unauthorized access to the Service
                or other users&apos; data
              </li>
              <li>
                Send spam, unlawful messages, or content through connected
                email or SMS integrations
              </li>
              <li>
                Reverse engineer or resell the Service except as we expressly
                allow
              </li>
              <li>Upload malware or interfere with platform integrity</li>
            </ul>
            <p className="mt-2">
              We may suspend or terminate access for violations or risk to the
              platform or other users.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              5. Your data
            </h2>
            <p className="mt-2">
              You retain ownership of content and data you submit to the
              Service (&quot;Customer Data&quot;). You grant us a limited
              license to host, process, and display Customer Data only as
              needed to operate and improve the Service and as described in our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              . You are responsible for having the rights to upload and process
              Customer Data, including contacts and communications.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              6. Integrations and third parties
            </h2>
            <p className="mt-2">
              The Service may connect to third-party products (for example
              Google, SMS providers, class or scheduling software, and payment
              processors). Those services are governed by their own terms. We
              are not responsible for third-party outages, policy changes, or
              data handling outside our control. You authorize us to access
              connected accounts as needed to provide features you enable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              7. Fees and subscriptions
            </h2>
            <p className="mt-2">
              Paid plans are billed according to the pricing and billing
              provider shown at checkout (including Lemon Squeezy or other
              processors we designate). Fees are generally non-refundable
              except where required by law or where we expressly agree.
              Failure to pay may result in limited or suspended access. Seat
              limits and feature limits apply by plan.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              8. Disclaimer
            </h2>
            <p className="mt-2">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
              DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT. We do not guarantee uninterrupted
              or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              9. Limitation of liability
            </h2>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, JNS AND ITS OPERATORS
              WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR
              BUSINESS. OUR TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE
              IN ANY TWELVE-MONTH PERIOD WILL NOT EXCEED THE AMOUNTS YOU PAID
              US FOR THE SERVICE IN THAT PERIOD (OR USD $100 IF YOU HAVE NOT
              PAID).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              10. Termination
            </h2>
            <p className="mt-2">
              You may stop using the Service at any time. We may suspend or
              terminate access for breach of these Terms, non-payment, or
              platform risk. Upon termination, your right to use the Service
              ends. Provisions that by nature should survive (including
              ownership, disclaimers, and limitations) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              11. Changes
            </h2>
            <p className="mt-2">
              We may update these Terms from time to time. We will post the
              updated version on this page and update the &quot;Last
              updated&quot; date. Continued use after changes become effective
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              12. Contact
            </h2>
            <p className="mt-2">
              Questions about these Terms:{" "}
              <a href="mailto:support@jnsystem.app" className="underline">
                support@jnsystem.app
              </a>
              .
            </p>
            <p className="mt-2 text-zinc-500">
              These Terms are a practical baseline for operating the Service.
              They are not a substitute for advice from a licensed attorney in
              your jurisdiction.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}