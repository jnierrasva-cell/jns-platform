import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Mail,
  Users,
  Workflow,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Business Workflow Automation Software | JNS Systems",
  description:
    "Organize client inquiries, forms, bookings, and follow-ups with JNS Systems. Bring everyday business workflows together in one workspace.",
  pathname: "/business-workflow-automation",
});

const workflowSteps = [
  {
    title: "Capture an inquiry",
    description:
      "A team member can add a client, or an inquiry can arrive through a published intake form, booking page, or configured Gmail rule.",
  },
  {
    title: "Keep the work connected",
    description:
      "Client details, notes, tags, and Journey stage provide context for the next interaction. Forms and bookings can create or update the same client record.",
  },
  {
    title: "Handle the next step",
    description:
      "Review the client and follow your team's process. Send a message directly, or enable supported email rules and booking reminders when they fit.",
  },
];

const faqs = [
  {
    question: "What workflow automation does JNS provide?",
    answer:
      "JNS provides configurable Gmail email rules for matching incoming messages, optional template-based auto-replies, and SMS reminders for scheduled bookings. It also brings Clients, Journey stages, forms, bookings, and team procedures into one workspace.",
  },
  {
    question: "Does JNS have a visual automation builder?",
    answer:
      "No. JNS does not currently provide a visual workflow canvas, AI agents, or advanced branching builder on the public product surface described here. Email rules have specific supported matching fields and actions, and booking reminders use configurable timing and message text. (A workflow engine exists in-product for internal automation; this page describes the day-to-day tools teams configure.)",
  },
  {
    question: "What can an email rule do?",
    answer:
      "A rule can match based on sender email, sender domain, subject text, and optionally whether the sender is a new contact. Supported actions include an auto-reply using a template, contact-only handling, or skipping the message. Gmail connection and plan requirements apply to automated replies.",
  },
  {
    question: "Can JNS send booking reminders?",
    answer:
      "Yes. SMS reminders can be enabled for scheduled bookings when the workspace has Twilio connected, a suitable plan, and a phone number on the contact. The workspace can configure how many hours before the booking to send the reminder and edit the message template.",
  },
  {
    question: "How do forms and bookings fit into a workflow?",
    answer:
      "Published intake forms collect information and associate submissions with client records. Public bookings create or update clients, can move Journey progress, and can sync to a connected Google Calendar.",
  },
  {
    question: "Who may benefit from JNS workflow tools?",
    answer:
      "Solo service providers and small service-business teams may find JNS useful when they want client inquiries, appointment activity, and follow-up processes organized together rather than spread across separate tools.",
  },
];

export default function BusinessWorkflowAutomationPage() {
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
              Everyday workflows for service businesses
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Bring everyday business workflows into one workspace
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              JNS Systems helps small service businesses organize the work
              around client inquiries: collecting details, tracking Journey
              progress, coordinating bookings, and handling follow-ups.
              Configure the available rules and reminders where they suit your
              process, while keeping your team in control of the next step.
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
              Replace scattered handoffs with a workflow your team can follow
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              A new inquiry may arrive by email, a booking request, or an intake
              form. When client details, appointment notes, and follow-up
              reminders live in different places, routine work can depend on
              someone remembering each handoff. JNS connects several of those
              steps through a shared client record and workspace tools.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Re-entering the same information",
                body: "Use form submissions and booking details to create or update a client record.",
              },
              {
                title: "Unclear inquiry progress",
                body: "Keep the client with a Journey stage so your team can review where it stands.",
              },
              {
                title: "Routine follow-up steps",
                body: "Configure supported email rules or booking reminders for specific, repeatable tasks.",
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
                Connect inquiry, client, and appointment work
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                These map to the same dashboard areas after login: Clients,
                Journey, Forms, Bookings, Email rules, Needs review, and
                Connections. Teams decide which tools to use and what still
                needs a person.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Clients and Journey",
                  body: "Organize clients with details, status, source, tags, notes, and Journey stages your workspace defines.",
                },
                {
                  icon: ClipboardList,
                  title: "Intake forms",
                  body: "Publish forms to collect information. Submissions are associated with a client and can add context for follow-up.",
                },
                {
                  icon: CalendarDays,
                  title: "Bookings and reminders",
                  body: "Public bookings create or update client records and can sync with Google Calendar. Optional SMS reminders can be scheduled before a booking through connected Twilio.",
                },
                {
                  icon: Mail,
                  title: "Gmail rules and replies",
                  body: "Match incoming email using supported sender and subject conditions, then choose a supported rule action. Template-based auto-replies require connected Google and an enabled rule. Needs review holds unmatched mail so not every message becomes a client.",
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
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Keep follow-ups and team processes consistent
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                A client record gives teammates context; notes, activity, and
                Journey stages help them decide what comes next. For defined
                cases, managers can configure Gmail rules, and teams can enable
                SMS reminders for upcoming bookings.
              </p>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Shared team procedures (SOPs), workspace roles, and invitations
                help a team document and coordinate how work is handled. They
                support a process; they do not automatically execute every step.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <Workflow
                  className="h-5 w-5 text-sky-700"
                  aria-hidden="true"
                />
                <h3 className="font-semibold">A simple daily routine</h3>
              </div>
              <ol className="mt-5 space-y-4">
                {workflowSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="text-sm font-semibold text-sky-800">
                      0{index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-16 sm:py-20 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Useful for small service-business operations
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Solo operators and small teams that manage appointments,
                inquiries, and ongoing client relationships may benefit from
                bringing these tasks into one workspace. JNS can support a
                process where staff review incoming work, maintain client
                records, coordinate bookings, and apply the follow-up practices
                that fit their business.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
              <h3 className="font-semibold">Available integrations</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
                <li>Gmail for configured inbox rules and template replies.</li>
                <li>Google Calendar for connected booking event sync.</li>
                <li>Twilio for enabled booking SMS reminders and messaging.</li>
              </ul>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Connections and some automation features require setup and may
                depend on the workspace plan.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Business workflow software questions
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
            Learn more about{" "}
            <Link
              href="/client-management-software"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              client management
            </Link>
            ,{" "}
            <Link
              href="/crm-software"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              CRM and Journey
            </Link>
            , and{" "}
            <Link
              href="/enquiry-management-system"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              enquiry management
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Organize the work around your client relationships
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Start setting up your JNS workspace or compare plans for your
                team.
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
