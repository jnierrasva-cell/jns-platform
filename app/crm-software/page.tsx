import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Inbox,
  Users,
  Waypoints,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "CRM Software for Service Businesses | JNS Systems",
  description:
    "CRM software built for service teams: Clients, Journey stages, forms, bookings, and controlled email intake in one JNS workspace—not a bloated sales suite.",
  pathname: "/crm-software",
});

const workflowSteps = [
  {
    number: "01",
    title: "Capture the person",
    description:
      "Add a contact manually, publish an intake form, or let a public booking create or update a client record. Source and status stay on the same record.",
  },
  {
    number: "02",
    title: "Track progress on Journey",
    description:
      "Move contacts through stages you define. Notes, tags, and stage history live on the client so the next person who opens the record knows where things stand.",
  },
  {
    number: "03",
    title: "Act without inventing a second system",
    description:
      "Book appointments, run email rules or optional auto-replies, and keep Needs review for mail that should not become a lead. Everything ties back to Clients.",
  },
];

const faqs = [
  {
    question: "Is JNS a full CRM?",
    answer:
      "JNS provides the CRM core service businesses actually use: client records, notes, tags, Journey (pipeline) stages, and activity context. It also includes bookings, intake forms, email rules, and Needs review in the same workspace—without enterprise sales theater.",
  },
  {
    question: "What is Journey in JNS?",
    answer:
      "Journey is the pipeline board. You define stages (for example Lead → Booked → Client). Each contact has a stage; the board and the contact detail stay in sync so the team shares one view of progress.",
  },
  {
    question: "Does every email become a contact?",
    answer:
      "No. Email rules and the Needs review (unmatched) inbox let you convert only the messages that should become clients. Auto-creating contacts from all inbound mail is intentionally controlled.",
  },
  {
    question: "How do forms and bookings connect to the CRM?",
    answer:
      "Published forms and the public booking page can create or update the same client records you manage under Clients. Submissions and bookings stay linked for follow-up instead of living in a separate spreadsheet.",
  },
  {
    question: "Who is this CRM for?",
    answer:
      "Solo service operators and small teams—studios, coaches, agencies, clinics, home services—who need people, appointments, and follow-up in one ops workspace rather than a marketing-heavy CRM.",
  },
];

export default function CrmSoftwarePage() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-[#1e2a4a] bg-[#0B132B]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <BrandMark />
          <nav
            aria-label="Main"
            className="flex items-center gap-4 text-sm text-slate-300"
          >
            <Link href="/#pricing" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="/support" className="transition hover:text-white">
              Support
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-lg bg-white px-3.5 font-medium text-[#0B132B] transition hover:bg-slate-100"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <p className="text-sm font-medium tracking-wide text-sky-800/80">
              CRM software for service businesses
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              A practical CRM: Clients, Journey, and the work around them
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              JNS Systems is CRM software built around how service work runs.
              Client records, Journey stages, Forms, Bookings, and controlled
              email intake live in one workspace—so follow-up is not scattered
              across inboxes and spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0B132B] px-5 text-sm font-medium text-white transition hover:bg-[#111e3a]"
              >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                Explore plans
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              When CRM means a second system, teams stop using it
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Contacts in one tool, bookings in another, and inquiry emails in a
              third make status hard to trust. A CRM for service businesses
              should hold the people and the operational steps next to them—not
              only a sales pipeline.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Records without context",
                body: "Clients hold details, notes, tags, source, and Journey stage so the next action is visible on the same record.",
              },
              {
                title: "Pipeline that ignores bookings",
                body: "Journey stages sit next to Forms and Bookings. An appointment is part of the same client story, not a separate calendar island.",
              },
              {
                title: "Every email as a lead",
                body: "Email rules and Needs review keep noise out of the client list so the CRM stays useful.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-zinc-200 bg-white p-6"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                The same areas you use after login
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                These map directly to the dashboard: Clients, Journey, Forms,
                Bookings, Needs review, Email rules, and Connections. No invented
                product surface for SEO.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Clients",
                  body: "Contact details, notes, tags, source, and status in one list. Open a person and see bookings, form activity, and history in the same place.",
                },
                {
                  icon: Waypoints,
                  title: "Journey stages",
                  body: "Define the stages your team uses. Move contacts on the board or from the contact detail; both stay in sync.",
                },
                {
                  icon: ClipboardList,
                  title: "Forms → client records",
                  body: "Publish intake forms. Submissions create or update contacts and stay attached for follow-up—not stranded in email.",
                },
                {
                  icon: CalendarDays,
                  title: "Bookings linked to clients",
                  body: "Share a public booking page. Bookings associate with a client record and can sync to a connected Google Calendar.",
                },
                {
                  icon: Inbox,
                  title: "Needs review",
                  body: "Unmatched inbound mail can land in Needs review. Convert, ignore, or tighten rules so the client list stays clean.",
                },
                {
                  icon: Users,
                  title: "Team and process",
                  body: "Invite teammates with roles. Shared Docs (SOPs) and configurable email rules support how your team already works.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6"
                  >
                    <Icon
                      className="h-5 w-5 text-sky-700"
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {item.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How the CRM workflow fits together
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Use the pieces that match your business. A real enquiry becomes a
              client, moves through Journey, gets a booking when needed, and
              receives only the follow-up you configure.
            </p>
          </div>
          <ol className="mt-9 space-y-0">
            {workflowSteps.map((step) => (
              <li
                key={step.number}
                className="grid gap-3 border-t border-zinc-200 py-6 sm:grid-cols-[4rem_1fr] sm:gap-6"
              >
                <span className="text-sm font-semibold tracking-wide text-sky-800">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-16 sm:py-20 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Built for service ops, not sales theater
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Studios, coaches, agencies, clinics, and home-service teams need
                clear client context and next steps more than a marketing CRM.
                JNS keeps people, appointments, and follow-up in one place.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
              <h3 className="font-semibold">A practical fit when you need to</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
                <li>Keep client details, notes, and Journey stages together.</li>
                <li>Turn form and booking activity into the same client records.</li>
                <li>Stop treating every inbound email as a lead.</li>
                <li>
                  Connect Google for calendar and configurable email workflows
                  when you are ready.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            CRM software questions
          </h2>
          <div className="mt-7 divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((faq) => (
              <article key={faq.question} className="py-5">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-zinc-600">
            Related:{" "}
            <Link
              href="/client-management-software"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              client management software
            </Link>
            ,{" "}
            <Link
              href="/enquiry-management-system"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              enquiry management system
            </Link>
            , and{" "}
            <Link
              href="/business-workflow-automation"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              business workflow automation
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Put clients and Journey in one workspace
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Start free, invite your team, and run CRM the way service work
                actually runs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-medium text-[#0B132B] transition hover:bg-slate-100"
              >
                Get started
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex h-11 items-center rounded-lg border border-slate-500 px-5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50 px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-sm text-zinc-600">
          <Link href="/" className="font-medium text-zinc-900 hover:underline">
            JNS Systems
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/support" className="hover:text-zinc-900 hover:underline">
              Support
            </Link>
            <Link href="/privacy" className="hover:text-zinc-900 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-900 hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
