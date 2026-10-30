import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  MessageSquareText,
  Users,
  Waypoints,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { createPublicMetadata } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "CRM Software for Small Businesses | JNS Systems",
  description:
    "Organize customer records, track inquiries, and manage follow-ups with JNS Systems. Keep essential client information and workflows connected in one workspace.",
  pathname: "/crm-software",
});

const dailySteps = [
  {
    title: "Add or receive a contact",
    description:
      "Create a record yourself, or collect an inquiry through a published intake form or booking page.",
  },
  {
    title: "Record the context",
    description:
      "Keep contact details, source, status, tags, and notes together so your team can understand the relationship.",
  },
  {
    title: "Review progress and follow up",
    description:
      "Move the contact through your pipeline stages and record outreach. Send email or SMS from a contact record when the relevant account or service is connected.",
  },
];

const faqs = [
  {
    question: "What CRM features does JNS include?",
    answer:
      "JNS includes organization-scoped contact records, contact status and source, tags, notes, pipeline stages, and contact history. Bookings and intake form submissions can also create or update contact records.",
  },
  {
    question: "Can I track inquiries through a sales pipeline?",
    answer:
      "Yes. You can organize contacts in pipeline stages and move a contact to a stage as its status changes. Stages are managed by your organization; the pipeline is for tracking progress, not sales forecasting.",
  },
  {
    question: "Does JNS automatically follow up with every inquiry?",
    answer:
      "No. Teams can send email or SMS from a contact record when the required account or service is connected. Separate email rules, optional auto-replies, and reminders can be configured where available, but are not enabled for every inquiry by default.",
  },
  {
    question: "Can I use JNS if my business works by appointment?",
    answer:
      "Yes. You can share a public booking page and connect bookings with contact records. Intake forms can collect information before or alongside an appointment.",
  },
  {
    question: "Who is JNS CRM software designed for?",
    answer:
      "JNS is built for solo operators and small service-business teams that want to organize customer information, track inquiries, and coordinate bookings and follow-up in one workspace.",
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
              Customer relationship management for small businesses
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              A practical CRM for keeping customer relationships organized
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              JNS Systems helps small service businesses keep customer
              information, inquiry progress, and follow-up context together.
              Use contact records and a flexible pipeline alongside the booking
              and intake workflows your business already needs.
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
              Bring scattered contacts and untracked inquiries into view
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              When customer details sit in separate lists, messages, and
              appointment notes, it can be hard to remember where an inquiry
              came from or what should happen next. A shared CRM workspace gives
              your team one place to review the contact and its progress.
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Contact details in different places",
                body: "Keep names, email addresses, phone numbers, notes, and tags with the customer record.",
              },
              {
                title: "Inquiries without a clear status",
                body: "Use contact status and pipeline stages to see how your team is organizing incoming opportunities.",
              },
              {
                title: "Follow-up context gets lost",
                body: "Review notes and contact history before deciding what action makes sense next.",
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
                Customer records with the details your team needs
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                Each contact belongs to your workspace and can include contact
                information, status, source, tags, notes, and pipeline stage.
                Use those fields to keep useful context close without
                overcomplicating your daily customer-management routine.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "A place for each contact",
                  body: "Create a customer record manually or let a booking or intake form add or update the contact.",
                },
                {
                  icon: ClipboardList,
                  title: "Useful context, not guesswork",
                  body: "Record notes and use available status, source, and tags to distinguish contacts and inquiries.",
                },
                {
                  icon: Waypoints,
                  title: "Stages your organization defines",
                  body: "Set up pipeline stages to reflect how your team tracks inquiry or client progress, then update contacts as work moves along.",
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
                Pipeline visibility for the next step
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                A pipeline gives your team a way to group contacts by progress.
                JNS supports organization-managed stages and lets team members
                assign a contact to a stage. That makes it easier to review
                inquiries in context and agree on what needs attention.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-600">
                Stages are a shared tracking tool: they do not automatically
                predict revenue or replace your own review of customer
                relationships.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
              <h3 className="font-semibold">Use your pipeline to</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                <li className="flex gap-3">
                  <Waypoints
                    className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                    aria-hidden="true"
                  />
                  See the stage assigned to each contact.
                </li>
                <li className="flex gap-3">
                  <MessageSquareText
                    className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                    aria-hidden="true"
                  />
                  Review notes and contact history before following up.
                </li>
                <li className="flex gap-3">
                  <Users
                    className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                    aria-hidden="true"
                  />
                  Keep contact progress visible to authorized workspace members.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Follow-up that fits your customer-management process
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-600">
                JNS gives teams options for contacting customers and handling
                incoming messages. A team member can send email or SMS from a
                contact record when the corresponding service is connected.
                Eligible plans also support configurable email rules, optional
                auto-replies, and SMS reminders. Your team chooses which
                workflows to configure and enable.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <article className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6">
                <h3 className="font-semibold">Bookings and intake</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  A public booking page and published intake forms can help
                  gather information at the start of a customer relationship.
                  Their submissions connect with the associated contact record.
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6">
                <h3 className="font-semibold">A repeatable team routine</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Review new contacts, update their pipeline stage, add notes,
                  then follow up using the method and timing that fits your
                  business. Shared procedures can help teammates follow the same
                  process.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              A CRM for small service-business teams
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              JNS may suit independent service providers and small teams who
              manage ongoing customer relationships, receive inquiries, or
              coordinate appointments. It brings customer records together with
              relevant booking, intake, and workflow tools in the same
              workspace.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-zinc-600">
              It is a practical option when you want a clear place to organize
              contacts and track progress—not a promise that every customer
              interaction will be automated.
            </p>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              A realistic daily CRM routine
            </h2>
            <ol className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
              {dailySteps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr] sm:gap-5"
                >
                  <span className="text-sm font-semibold text-sky-800">
                    0{index + 1}
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
            Looking for an overview of JNS&apos;s broader client-management
            features?{" "}
            <Link
              href="/client-management-software"
              className="font-medium text-sky-800 underline underline-offset-4 hover:text-sky-950"
            >
              Explore client management software
            </Link>
            .
          </p>
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Organize customer relationships in one workspace
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Get started with JNS or compare plans to find the workflow that
                fits your business.
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
