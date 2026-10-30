import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Privacy Policy | JNS Systems",
  description:
    "Read how JNS Systems handles account, workspace, customer, and integration information.",
  pathname: "/privacy",
});

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Last updated: October 30, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-6 text-zinc-700">
          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              1. Who we are
            </h2>
            <p className="mt-2">
              Journey Network Systems (&quot;JNS,&quot; &quot;we,&quot;
              &quot;us&quot;) operates the JNS workspace platform. This Privacy
              Policy explains how we collect, use, and share information when
              you use our website and Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              2. Information we collect
            </h2>
            <p className="mt-2">We may collect:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Account data:</strong> name, email, password (hashed
                by our auth provider), business/workspace details
              </li>
              <li>
                <strong>Customer Data you upload:</strong> contacts, notes,
                bookings, form responses, SOPs, team information, and similar
                content
              </li>
              <li>
                <strong>Integration data:</strong> when you connect Google,
                SMS, calendar, or other tools—tokens and data needed to run
                features you enable. For Google, this includes the connected
                account email and OAuth tokens; Gmail message header
                information used by inbox rules; and Google Calendar event
                information and event identifiers used for bookings or class
                sync.
              </li>
              <li>
                <strong>Billing data:</strong> handled primarily by our payment
                provider (e.g. Lemon Squeezy); we store plan status and related
                identifiers
              </li>
              <li>
                <strong>Usage and technical data:</strong> logs, device/browser
                type, IP address, and approximate location for security and
                reliability
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              3. How we use information
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Provide, maintain, and improve the Service</li>
              <li>Authenticate users and secure accounts</li>
              <li>Process subscriptions and support requests</li>
              <li>Operate automations and integrations you turn on</li>
              <li>Monitor abuse, prevent fraud, and debug issues</li>
              <li>
                Communicate about the Service (transactional and, where
                allowed, product updates)
              </li>
            </ul>
            <h3 className="mt-5 text-sm font-semibold text-zinc-900">
              Google data we access and how we use it
            </h3>
            <p className="mt-2">
              When you connect Google, we access the Google account email to
              identify the connected account. If Gmail inbox automation is
              enabled, JNS checks new incoming messages and reads message
              headers, including sender name and email address, subject, and
              message and thread identifiers. We use this information to apply
              workspace email rules, link inquiries to contacts, and show
              unmatched inquiries for review; this workflow does not read
              message bodies. If an administrator enables an
              auto-acknowledgment rule, JNS sends the configured template reply
              to a matching sender using Gmail.
            </p>
            <p className="mt-2">
              For Google Calendar features, JNS accesses the calendar events
              needed to find and manage events created by JNS. We use event
              titles, dates, times, descriptions, invitee email addresses, and
              event identifiers to create, update, identify, or remove booking
              and class events that the workspace chooses to sync.
            </p>
            <h3 className="mt-5 text-sm font-semibold text-zinc-900">
              Google data storage, sharing, and protection
            </h3>
            <p className="mt-2">
              We store Google OAuth access and refresh tokens, the connected
              account email, and granted scopes in the workspace&apos;s
              connection record so JNS can provide enabled integrations.
              Processed Gmail header information (such as sender, subject, and
              message identifiers) may be stored in workspace contact,
              unmatched-inquiry, and email-activity records. Calendar event
              identifiers may be stored with the corresponding synced class
              record. We do not store Gmail message bodies through the inbox
              automation workflow described above.
            </p>
            <p className="mt-2">
              Google data is processed by Google when JNS makes the API
              requests needed to provide these features. It may also be
              processed or stored by our hosting and database providers on
              JNS&apos;s instructions, and is available to workspace members
              according to their organization&apos;s access settings. We do not
              sell Google user data or disclose it for advertising. We do not
              use Google Workspace API data to develop, improve, or train
              generalized or non-personalized AI or machine-learning models.
              We do not transfer Google user data for purposes unrelated to
              providing or improving user-facing JNS features, except where
              required by law.
            </p>
            <p className="mt-2">
              We protect Google data using HTTPS in transit, server-side
              handling of OAuth tokens, and access controls, together with the
              security features of our hosting and database providers. We
              retain OAuth tokens while the Google connection is active.
              Disconnecting Google removes JNS&apos;s stored connection record
              and stops JNS from using those tokens; it does not delete Gmail
              activity or workspace records already created. Those records are
              retained with the workspace while it is active and may be
              deleted by request, subject to limited backup retention and legal
              requirements. To revoke the app&apos;s authorization in Google,
              also remove JNS from your Google Account&apos;s third-party
              connections. Contact{" "}
              <a href="mailto:support@jnsystem.app" className="underline">
                support@jnsystem.app
              </a>{" "}
              to request access, correction, or deletion of personal data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              4. How we share information
            </h2>
            <p className="mt-2">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Infrastructure providers</strong> (hosting, database,
                authentication) that process data on our instructions
              </li>
              <li>
                <strong>Payment processors</strong> for checkout and
                subscription management
              </li>
              <li>
                <strong>Integration providers</strong> you connect (Google,
                Twilio, etc.) as needed for those features
              </li>
              <li>
                <strong>Professional advisors or authorities</strong> when
                required by law or to protect rights and safety
              </li>
            </ul>
            <p className="mt-2">
              Workspace admins control member access to Customer Data inside
              their organization.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              5. International processing
            </h2>
            <p className="mt-2">
              We may process and store information on servers in regions where
              our providers operate (including outside your home country). By
              using the Service, you understand that information may be
              transferred internationally with safeguards used by our providers
              where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              6. Retention
            </h2>
            <p className="mt-2">
              We retain account and Customer Data while your account and
              workspaces remain active and as needed for legitimate business,
              legal, and security purposes. You may request deletion of your
              account; residual copies may remain in backups for a limited
              period.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              7. Security
            </h2>
            <p className="mt-2">
              We use industry-standard measures such as encrypted transport
              (HTTPS), access controls, and provider security features. No
              method of transmission or storage is fully secure.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              8. Your choices
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Update profile and workspace settings in the product</li>
              <li>Disconnect integrations at any time</li>
              <li>
                Request access, correction, or deletion of personal data by
                contacting us
              </li>
              <li>
                Manage marketing preferences where applicable (transactional
                mail may still be sent)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              9. Children
            </h2>
            <p className="mt-2">
              The Service is directed at businesses and adults. We do not
              knowingly collect personal information from children under 16.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              10. Changes
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will post
              the new version on this page and revise the &quot;Last
              updated&quot; date. If we change how we access, use, store, or
              share Google user data, we will update this policy and notify
              affected users through the Service or their account email.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900">
              11. Contact
            </h2>
            <p className="mt-2">
              Privacy requests:{" "}
              <a href="mailto:support@jnsystem.app" className="underline">
                support@jnsystem.app
              </a>
              .
            </p>
            <p className="mt-2 text-zinc-500">
              This policy is a practical description of our practices. For
              regulated industries or specific jurisdictions, consult a
              qualified advisor.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}