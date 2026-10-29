import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Mail, Plug, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";

const features = [
  {
    icon: Users,
    title: "Contacts under your rules",
    body: "Pipeline, notes, and history on each person. Email rules and unmatched keep junk from becoming leads.",
  },
  {
    icon: CalendarDays,
    title: "Bookings on the calendar",
    body: "Share a booking page, keep the schedule current, and send reminders from accounts you connect.",
  },
  {
    icon: Mail,
    title: "Intake that lands in one place",
    body: "Forms become contacts you can act on — same record for follow-up, not another spreadsheet.",
  },
  {
    icon: Plug,
    title: "Connected tools",
    body: "Google, SMS, and class software when you need them — less copy-paste between tabs.",
  },
];

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$35",
    blurb: "Solo operators who need one place for clients and bookings.",
    cta: "Get started",
    highlighted: false,
    features: [
      "1 workspace, up to 2 users",
      "Contacts, pipeline, and notes",
      "Bookings and public booking page",
      "Forms (core fields) and CSV export",
      "SOPs for the owner",
      "Google Calendar connect",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$89",
    blurb: "Daily ops: inbox follow-up, team access, and process in one workspace.",
    cta: "Start with Pro",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Gmail connect, auto-reply, email rules and templates",
      "Unmatched inbox (not every email becomes a lead)",
      "Team invites and roles",
      "Custom forms, duplicate, and branding",
      "Team SOPs",
      "SMS reminders (usage billed separately)",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$179",
    blurb: "Growing teams that need more seats and a serious ops home.",
    cta: "Talk to us",
    highlighted: false,
    features: [
      "Everything in Pro",
      "More seats included",
      "Higher automation and form limits",
      "Priority onboarding support",
      "Specialty integrations (e.g. class software) as available",
    ],
  },
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_32px_80px_-32px_rgba(11,19,43,0.45)] ring-1 ring-black/[0.03]">
      <div className="flex border-b border-zinc-200">
        <div className="hidden w-44 shrink-0 border-r border-[#1e2a4a] bg-[#0B132B] p-3.5 sm:block">
          <p className="px-2 text-[11px] font-medium tracking-wide text-slate-500">
            Workspace
          </p>
          <div className="mt-3 space-y-1">
            {["Overview", "Contacts", "Bookings", "Automation"].map(
              (item, i) => (
                <div
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-[13px] ${
                    i === 0
                      ? "bg-[#111e3a] font-medium text-white"
                      : "text-slate-400"
                  }`}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Overview</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                This week
              </p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-600">
              Connected tools
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              ["12", "Contacts"],
              ["4", "Booked"],
              ["2", "Systems on"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5"
              >
                <p className="text-lg font-semibold tracking-tight text-zinc-900">
                  {value}
                </p>
                <p className="text-[11px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200/80">
            {[
              ["Maya Chen", "Lead · intake form"],
              ["Jordan Hale", "Booked · Thu 10:00"],
              ["Inquiry reply", "Automation · on"],
            ].map(([title, meta], i) => (
              <div
                key={title}
                className={`flex items-center justify-between px-3.5 py-2.5 text-[13px] ${
                  i > 0 ? "border-t border-zinc-100" : ""
                }`}
              >
                <span className="font-medium text-zinc-900">{title}</span>
                <span className="text-zinc-500">{meta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-[#1e2a4a]/80 bg-[#0B132B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <BrandMark />
          <nav
            className="hidden items-center gap-7 text-sm text-slate-400 md:flex"
            aria-label="Main"
          >
            <a href="#product" className="transition hover:text-white">
              Product
            </a>
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
            <a href="#google-data" className="transition hover:text-white">
              Google data
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-lg bg-white px-3.5 text-sm font-medium text-[#0B132B] transition hover:bg-slate-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:pt-24">
          <div>
            <p className="text-sm font-medium tracking-wide text-sky-800/80">
              For service businesses and the people who run them
            </p>
            <h1 className="mt-4 max-w-lg text-[2.25rem] font-semibold leading-[1.12] tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.1]">
              One workspace for clients, bookings, and follow-up
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-zinc-600">
              Journey Network Systems keeps contacts, intake, schedule, and
              team process in one place—so work doesn&apos;t scatter across
              inboxes and spreadsheets.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0B132B] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#111e3a]"
              >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                See pricing
              </a>
            </div>
            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Choose a plan at signup or anytime under Billing in your
              workspace.
            </p>
          </div>
          <ProductPreview />
        </section>

        <section id="product" className="border-t border-zinc-200/80 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              Built for how service work actually runs
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-600">
              Not another bloated marketing suite. A clear ops home for people,
              appointments, and follow-up you control.
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="bg-white p-7 transition hover:bg-zinc-50/50"
                  >
                    <Icon
                      className="h-4 w-4 text-sky-600"
                      aria-hidden="true"
                    />
                    <h3 className="mt-4 text-sm font-semibold text-zinc-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {feature.body}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="google-data"
          className="border-t border-zinc-200/80 bg-white"
        >
          <div className="mx-auto max-w-5xl px-5 py-20">
            <p className="text-sm font-medium tracking-wide text-sky-800/80">
              Google integrations
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              What JNS does with Google data
            </h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-zinc-600">
              Journey Network Systems (JNS) is a workspace for service
              businesses to manage contacts, bookings, intake forms, and
              customer follow-up. Connecting Google is optional and lets a
              workspace use the Google tools behind the features its
              administrators choose to enable.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <article className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Gmail for inbox follow-up
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  JNS uses the connected account&apos;s email address to identify
                  the account. When inbox automation is enabled, it checks new
                  incoming messages&apos; sender, subject, and message identifiers
                  to apply the workspace&apos;s email rules, link inquiries to
                  contacts, or place unmatched inquiries in a review inbox.
                  This workflow reads message headers, not message bodies.
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  If an administrator configures an auto-acknowledgment rule,
                  JNS uses Gmail&apos;s send access to reply to a matching sender
                  with the workspace&apos;s selected template. It does not send
                  automatic replies unless that rule is enabled.
                </p>
              </article>
              <article className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Google Calendar for bookings and class sync
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  When a workspace connects a calendar and uses booking or class
                  sync, JNS creates, updates, or removes the related events on
                  the calendar selected by the workspace. Event details can
                  include the title, date and time, description, and invitee
                  email addresses so the event reflects the booking or class.
                </p>
              </article>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-6 text-zinc-600">
              Google access is used to provide these features for the
              connecting workspace, not sold or used for advertising or
              generalized AI/model training. It is shared only as needed to
              provide JNS features, including with Google and our hosting or
              database providers. An administrator can disconnect Google in
              workspace Integrations.
              Read our{" "}
              <Link
                href="/privacy"
                className="font-medium text-zinc-900 underline underline-offset-2"
              >
                Privacy Policy
              </Link>{" "}
              for more about data handling, or contact{" "}
              <a
                href="mailto:support@jnsystem.app"
                className="font-medium text-zinc-900 underline underline-offset-2"
              >
                support@jnsystem.app
              </a>
              .
            </p>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
            How teams start
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              [
                "01",
                "Open a workspace",
                "Sign in, name the business, and invite the people who need access.",
              ],
              [
                "02",
                "Connect what you already use",
                "Link Google, SMS, and class software so data isn't retyped by hand.",
              ],
              [
                "03",
                "Turn on follow-up you control",
                "Templates, email rules, and reminders — on your terms, not every message as a lead.",
              ],
            ].map(([n, title, body]) => (
              <li key={n}>
                <p className="text-xs font-semibold tracking-wider text-sky-700">
                  {n}
                </p>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing" className="border-t border-zinc-200/80 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              Simple pricing
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-600">
              Monthly plans for solo operators through growing teams. SMS is
              usage-based. Subscribe from the homepage when signed in, or from
              Billing inside your workspace.
            </p>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex flex-col rounded-2xl border p-7 ${
                    plan.highlighted
                      ? "border-[#0B132B] bg-[#0B132B] text-white shadow-xl shadow-[#0B132B]/20"
                      : "border-zinc-200 bg-zinc-50/80 text-zinc-900"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        plan.highlighted ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    {plan.highlighted ? (
                      <span className="rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-[11px] font-medium text-cyan-200">
                        Most used
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">
                      {plan.price}
                    </span>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-slate-400" : "text-zinc-500"
                      }`}
                    >
                      / month
                    </span>
                  </p>
                  <p
                    className={`mt-2.5 text-sm leading-6 ${
                      plan.highlighted ? "text-slate-300" : "text-zinc-600"
                    }`}
                  >
                    {plan.blurb}
                  </p>
                  <ul className="mt-7 flex-1 space-y-2.5">
                    {plan.features.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-5">
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            plan.highlighted
                              ? "text-cyan-300"
                              : "text-sky-600"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={
                            plan.highlighted
                              ? "text-slate-200"
                              : "text-zinc-700"
                          }
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <PricingCheckoutButton
                    plan={plan.id}
                    label={plan.cta}
                    className={`mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition ${
                      plan.highlighted
                        ? "bg-white text-[#0B132B] hover:bg-slate-100"
                        : "bg-[#0B132B] text-white hover:bg-[#111e3a]"
                    }`}
                  />
                </article>
              ))}
            </div>

            <p className="mt-10 text-xs leading-5 text-zinc-500">
              Prices in USD, billed monthly. Card checkout via Lemon Squeezy.
              Specialty integrations and high SMS volume may be quoted
              separately. Philippines bank or e-wallet: pay manually, then we
              activate your plan.
            </p>
          </div>
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Ready to open a workspace
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Create an account, name your business, and subscribe when you
                need Pro tools—or start and upgrade from Billing anytime.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 shrink-0 items-center rounded-lg bg-white px-5 text-sm font-medium text-[#0B132B] transition hover:bg-slate-100"
            >
              Go to sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50 px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Journey Network Systems</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="#pricing"
              className="underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              Pricing
            </a>
            <Link
              href="/support"
              className="underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              Support
            </Link>
            <Link
              href="/terms"
              className="underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="underline-offset-2 hover:text-zinc-700 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}