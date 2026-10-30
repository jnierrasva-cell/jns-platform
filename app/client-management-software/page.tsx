import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Users,
  Workflow,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Client Management Software for Service Businesses | JNS Systems",
  description:
    "Organize client records, inquiries, bookings, forms, and follow-ups with JNS Systems. Keep your service business workflows in one workspace.",
  pathname: "/client-management-software",
});

const workflowSteps = [
  {
    number: "01",
    title: "Capture an inquiry",
    description:
      "Add a contact, receive an inquiry through a published intake form, or let a booking create or update a client record.",
  },
  {
    number: "02",
    title: "Keep the client record current",
    description:
      "Use contact details, notes, tags, and pipeline stages to keep client context and progress together.",
  },
  {
    number: "03",
    title: "Follow up with your process",
    description:
      "Use email rules, optional auto-replies, reminders, and shared procedures where they fit your team's workflow.",
  },
];

const faqs = [
  {
    question: "What does client management software help organize?",
    answer:
      "It keeps client details and interaction context organized so a team can manage inquiries, track progress, coordinate bookings, and follow up. JNS includes contact records, notes, pipeline stages, forms, bookings, and workflow tools in one workspace.",
  },
  {
    question: "Is JNS a CRM?",
    answer:
      "JNS provides CRM-style tools for service businesses, including contact records, notes, tags, and a pipeline. It also brings bookings, intake forms, team procedures, and optional follow-up workflows into the same workspace.",
  },
  {
    question: "Can clients book appointments and submit intake forms?",
    answer:
      "Yes. Workspaces can share a public booking page and publish intake forms. A booking or form submission can create or update the related contact record; form submissions can also be tracked with that contact.",
  },
  {
    question: "Does JNS send automatic follow-ups?",
    answer:
      "Teams can configure email rules and optional Gmail auto-replies. SMS reminders are available when the required plan and connected service are in place. These workflows are configurable rather than automatic for every inquiry.",
  },
  {
    question: "Who is JNS best suited for?",
    answer:
      "JNS is designed for solo service operators and growing service-business teams that want to organize client information, bookings, intake, and follow-up in one workspace.",
  },
];

export default function ClientManagementSoftwarePage() {
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
              Client management for service businesses
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Keep client details, bookings, and follow-ups connected
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              JNS Systems brings client records and pipeline activity together
              with bookings, intake forms, and configurable follow-up workflows.
              Give your service business one workspace for the steps between a
              first inquiry and the next appointment.
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
              When client information is scattered, follow-up is harder to
              manage
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Contact details in one place, appointment notes in another, and
              new inquiries waiting in an inbox can make it difficult to see
              what needs attention. JNS gives service teams a shared workspace
              for client context and the operational steps around it.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Scattered client context",
                body: "Bring contact details, notes, tags, and pipeline progress together in a client record.",
              },
              {
                title: "Unclear next steps",
                body: "Use pipeline stages and team procedures to make work easier to follow across a workspace.",
              },
              {
                title: "Disconnected intake and booking",
                body: "Connect published forms and public booking pages to the client records your team uses.",
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
                Client records that connect to everyday work
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                JNS combines the core pieces of client management with tools to
                handle incoming work. Teams can keep contact and pipeline
                details together, collect information through forms, and connect
                bookings to client records.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Client records and pipeline",
                  body: "Store contact details, notes, and tags with pipeline stages that help show where an inquiry or client stands.",
                },
                {
                  icon: CalendarDays,
                  title: "Bookings linked to clients",
                  body: "Share a public booking page. Booking details are associated with a client record, and Google Calendar can be connected for event sync.",
                },
                {
                  icon: ClipboardList,
                  title: "Intake forms that create context",
                  body: "Publish forms to collect client details and responses. Submissions are tracked with the related contact for follow-up.",
                },
                {
                  icon: Workflow,
                  title: "Follow-up and team processes",
                  body: "Set email rules, optional Gmail auto-replies, reminders, and shared SOPs to support the steps your team chooses to automate.",
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
              How the client-management workflow fits together
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Use the parts that fit your business. A new inquiry can become a
              contact, move through your pipeline, receive an appointment, and
              get a configured follow-up—without treating every message as a
              lead.
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
                Made for service businesses that want an organized workspace
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                JNS is designed for solo operators and growing teams who manage
                client relationships alongside appointments, intake, and
                follow-up. Workspace roles and plans support different team
                sizes and workflows.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
              <h3 className="font-semibold">A practical fit when you need to</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
                <li>Keep contact information, notes, and pipeline activity together.</li>
                <li>Collect inquiries through forms and share booking pages.</li>
                <li>Coordinate team procedures and configurable follow-up.</li>
                <li>
                  Connect Google Calendar for booking events and use configured
                  email or SMS workflows where enabled.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Client management software questions
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
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Bring your client workflow into one workspace
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Explore JNS plans or start by creating an account and setting up
                your workspace.
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
