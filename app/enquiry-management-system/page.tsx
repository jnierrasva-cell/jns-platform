import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Inbox,
  Mail,
  Users,
  Waypoints,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "Enquiry Management System for Service Businesses | JNS Systems",
  description:
    "Capture inquiries, filter noise, and turn real enquiries into client records with pipeline stages, intake forms, and email rules in one JNS workspace.",
  pathname: "/enquiry-management-system",
});

const workflowSteps = [
  {
    number: "01",
    title: "Capture the enquiry",
    description:
      "Receive interest through a published intake form, a public booking page, or by adding a contact manually. Submissions can create or update a client record in your workspace.",
  },
  {
    number: "02",
    title: "Separate signal from noise",
    description:
      "Connect Gmail and use email rules plus the Needs review inbox so not every message becomes a lead. Route or ignore unmatched mail before it clutters your client list.",
  },
  {
    number: "03",
    title: "Move real opportunities through your Journey",
    description:
      "Assign pipeline stages on each contact, add notes, and keep status and source visible so your team knows what needs follow-up next.",
  },
];

const faqs = [
  {
    question: "What is an enquiry management system?",
    answer:
      "It is software that helps a business capture incoming interest, organize who is a real prospect, and track follow-up. In JNS that means intake forms, client records, Journey (pipeline) stages, email rules, and an unmatched inbox—not a separate marketing suite.",
  },
  {
    question: "How does JNS handle enquiry vs inquiry spelling?",
    answer:
      "Searchers use both. This page is the primary enquiry management system page. The same product features apply whether your team says enquiry or inquiry: forms, clients, pipeline stages, and configurable email workflows.",
  },
  {
    question: "Does every email automatically become a client?",
    answer:
      "No. JNS is designed so auto-creating contacts from all inbound mail is controlled. Email rules and the Needs review (unmatched) inbox help you convert only the messages that should become clients.",
  },
  {
    question: "Can I track enquiry progress after capture?",
    answer:
      "Yes. Contacts live under Clients with status, source, notes, and Journey stages you define. You can move someone through stages as the relationship progresses.",
  },
  {
    question: "What else connects to enquiry handling?",
    answer:
      "Published forms, public booking pages, optional Gmail auto-reply, templates, and team Docs (SOPs). SMS reminders are available when Twilio is connected and your plan allows it.",
  },
];

export default function EnquiryManagementSystemPage() {
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
              Enquiry management for service businesses
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Turn enquiries into tracked clients—without treating every email as
              a lead
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              JNS Systems is an enquiry management system built around how
              service work actually runs: intake forms and bookings create client
              records, email rules and Needs review keep noise out, and Journey
              stages show what to do next.
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
              When enquiries scatter, follow-up stalls
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Form replies in one inbox, booking requests in another, and
              random emails mixed with real interest make it hard to know who is
              a prospect. An enquiry management workspace should capture the
              good ones and keep the rest from flooding your client list.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Mixed inboxes",
                body: "Email rules and Needs review help you decide what becomes a client—and what stays unmatched.",
              },
              {
                title: "No shared status",
                body: "Clients and Journey stages give every real enquiry a place in the pipeline your team can see.",
              },
              {
                title: "Intake that never lands",
                body: "Published forms and booking pages write into the same contact record you use for notes and follow-up.",
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
                Features that match the JNS dashboard
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Nothing below is a marketing invention—these are the same areas
                you use after you sign in: Clients, Journey, Forms, Bookings,
                Needs review, Email rules, Templates, and Connections.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: ClipboardList,
                  title: "Forms → client records",
                  body: "Publish intake forms so responses create or update contacts. Track submissions with the same person your team follows up with.",
                },
                {
                  icon: Inbox,
                  title: "Needs review (unmatched)",
                  body: "Inbound mail that does not match a rule or contact can land in Needs review. Convert, ignore, or refine rules instead of auto-creating every contact.",
                },
                {
                  icon: Mail,
                  title: "Email rules and optional auto-reply",
                  body: "Connect Gmail in Connections. Configure rules and optional auto-replies so routine enquiry handling is consistent—not one-off inbox chaos.",
                },
                {
                  icon: Waypoints,
                  title: "Journey stages",
                  body: "Move contacts through stages you define (Lead → Booked → Client, or your own labels). Stage changes stay on the contact and the Journey board.",
                },
                {
                  icon: Users,
                  title: "Clients list with source and status",
                  body: "Filter by stage, search name or email, and keep source tags so you know whether someone came from a form, booking, or manual add.",
                },
                {
                  icon: Mail,
                  title: "Templates for replies",
                  body: "Save reply templates for common enquiry answers. Use them when sending from a connected Google account.",
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
              Enquiry workflow from first message to next step
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              Use the path that matches how you already work. JNS does not force
              every message into a lead; you choose what becomes a client and
              how stages are labeled.
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
                Built for service teams, not enterprise sales theater
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Studios, coaches, agencies, clinics, and home-service operators
                need a clear enquiry path more than a bloated marketing CRM. JNS
                keeps people, appointments, and follow-up in one ops workspace.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
              <h3 className="font-semibold">A practical fit when you need to</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
                <li>Publish forms without losing submissions in email threads.</li>
                <li>Stop auto-creating contacts from every inbound message.</li>
                <li>See enquiry progress on a Journey board your team shares.</li>
                <li>
                  Connect Google for calendar events and configurable email
                  workflows when you are ready.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Enquiry management system questions
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
              href="/crm-software"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              CRM software
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
                Put enquiry handling in one workspace
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Start free, connect the tools you use, and run enquiries through
                Clients and Journey the way your team already works.
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
