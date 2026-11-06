import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Mail, Plug, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";
import { createPublicMetadata, PRODUCTION_SITE_URL } from "@/lib/seo";

export const metadata = createPublicMetadata({
  title: "JNS – Simple CRM for Service Businesses | Inbox & Bookings",
  description:
    "Stop losing inquiries in your inbox. JNS turns them into a clean client list — bookings, forms, and follow-up without the bloated marketing suite.",
  pathname: "/",
});

const features = [
  {
    icon: Users,
    title: "Client records and pipeline",
    body: "Keep contact details, notes, and pipeline history together. Email rules route inquiries, while unmatched messages stay in a review inbox.",
  },
  {
    icon: CalendarDays,
    title: "Bookings and reminders",
    body: "Share a public booking page, manage appointments, and connect Google Calendar. SMS reminders are available with eligible plans and connected services.",
  },
  {
    icon: Mail,
    title: "Intake forms into contacts",
    body: "Collect inquiries through published forms and turn submissions into contact records for follow-up.",
  },
  {
    icon: Plug,
    title: "Follow-up and team workflows",
    body: "Configure email rules and optional auto-replies, share team procedures, and connect the tools your workflows use.",
  },
];

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$35",
    blurb: "Solo operators who need one place for clients and bookings.",
    cta: "Start free",
    highlighted: false,
    features: [
      "1 workspace · team invites up to 2 users",
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
      "More seats (up to 10) and roles",
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
    cta: "Start with Business",
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

/** Always-on product preview — no external image dependency. */
function ProductPreview() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-500/25 via-transparent to-indigo-500/15 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        <div className="flex min-h-[280px]">
          {/* Sidebar */}
          <div className="hidden w-[9.5rem] shrink-0 border-r border-slate-200 bg-slate-50/90 p-3 sm:block">
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0B132B] text-[10px] font-bold text-white">
                J
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-800">
                  Harbor Studio
                </p>
                <p className="text-[9px] text-slate-500">Pro trial</p>
              </div>
            </div>
            <p className="mt-4 px-1 text-[9px] font-medium uppercase tracking-wider text-slate-400">
              Work
            </p>
            <div className="mt-1.5 space-y-0.5">
              {[
                ["Today", true],
                ["Clients", false],
                ["Schedule", false],
                ["Forms", false],
              ].map(([label, active]) => (
                <div
                  key={String(label)}
                  className={`rounded-md px-2 py-1.5 text-[11px] ${
                    active
                      ? "bg-sky-100 font-medium text-sky-900"
                      : "text-slate-500"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-4 px-1 text-[9px] font-medium uppercase tracking-wider text-slate-400">
              Setup
            </p>
            <div className="mt-1.5 space-y-0.5">
              {["Autopilot", "Connections", "Team"].map((label) => (
                <div
                  key={label}
                  className="rounded-md px-2 py-1.5 text-[11px] text-slate-500"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Today
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  Harbor Wellness Studio
                </p>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                Pro trial
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 px-3.5 py-3">
              <p className="text-[11px] font-semibold text-slate-900">
                Get your first inquiry handled automatically
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Connect Google → add a rule → turn on auto-reply
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full w-2/3 rounded-full bg-sky-500" />
              </div>
              <p className="mt-1 text-right text-[9px] text-slate-400">2/3</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["24", "Clients"],
                ["6", "Booked"],
                ["On", "Autopilot"],
                ["3", "Unmatched"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                >
                  <p className="text-base font-semibold tracking-tight text-slate-900">
                    {value}
                  </p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
              {[
                ["Maya Chen", "Lead · intake form"],
                ["Jordan Hale", "Booked · Thu 10:00"],
                ["Inquiry reply", "Rule matched · sent"],
              ].map(([title, meta], i) => (
                <div
                  key={title}
                  className={`flex items-center justify-between px-3 py-2 text-[11px] ${
                    i > 0 ? "border-t border-slate-50" : ""
                  }`}
                >
                  <span className="font-medium text-slate-800">{title}</span>
                  <span className="text-slate-500">{meta}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${PRODUCTION_SITE_URL.href}#organization`,
        name: "Journey Network Systems",
        alternateName: "JNS Systems",
        url: PRODUCTION_SITE_URL.href,
        logo: new URL("/jns-logo.png", PRODUCTION_SITE_URL).href,
      },
      {
        "@type": "WebSite",
        "@id": `${PRODUCTION_SITE_URL.href}#website`,
        name: "JNS Systems",
        url: PRODUCTION_SITE_URL.href,
        publisher: {
          "@id": `${PRODUCTION_SITE_URL.href}#organization`,
        },
        inLanguage: "en",
      },
    ],
  };

  return (
    <div className="min-h-full bg-zinc-50">
      <link rel="canonical" href={PRODUCTION_SITE_URL.href} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="sticky top-0 z-40 border-b border-[#1e2a4a]/80 bg-[#0B132B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
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
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:text-white sm:inline"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-full bg-sky-500 px-3.5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Start 14-day trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#060b18]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(99,102,241,0.15),_transparent_50%)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10 lg:pb-28 lg:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                Inbox · bookings · follow-up — without the suite bloat
              </p>
              <h1 className="mt-6 max-w-xl text-[2.35rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                The simple ops workspace for service businesses
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-300">
                Turn inquiries into a clean client list. Bookings, forms, and
                email rules you control — not another bloated marketing platform.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-sky-500 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400"
                >
                  Start 14-day free trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex h-11 items-center rounded-full border border-white/20 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  See pricing
                </a>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-400">
                No card required. Full Pro for 14 days, then Free forever for
                contacts, bookings, and email rules — upgrade only when you need
                more seats or SMS.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="product" className="border-t border-zinc-200/80 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
              Client management and business workflows, together
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-600">
              Bring client records and pipeline activity together with bookings,
              intake forms, and follow-ups. Connect the tools and team processes
              you already use to organize everyday business operations.
            </p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="bg-white p-7 transition hover:bg-zinc-50/50"
                  >
                    <Icon className="h-4 w-4 text-sky-600" aria-hidden="true" />
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

        <section id="how" className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
            How teams start
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              [
                "01",
                "Open a workspace",
                "Sign in, name the business, and get a 14-day Pro trial with no card.",
              ],
              [
                "02",
                "Connect what you already use",
                "Link Google and optional SMS so data is not retyped by hand.",
              ],
              [
                "03",
                "Turn on follow-up you control",
                "Email rules and reminders — on your terms, not every message as a lead.",
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
              14-day Pro trial on every new workspace (no card). Then Free for
              contacts, bookings, and email rules — or subscribe monthly. SMS uses
              your own Twilio account.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    plan.highlighted
                      ? "border-[#0B132B] bg-[#0B132B] text-white shadow-lg"
                      : "border-zinc-200 bg-white"
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
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`mt-3 text-3xl font-semibold tracking-tight ${
                      plan.highlighted ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {plan.price}
                    <span
                      className={`text-sm font-normal ${
                        plan.highlighted ? "text-slate-300" : "text-zinc-500"
                      }`}
                    >
                      /mo
                    </span>
                  </p>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      plan.highlighted ? "text-slate-300" : "text-zinc-600"
                    }`}
                  >
                    {plan.blurb}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm">
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            plan.highlighted ? "text-sky-300" : "text-sky-600"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={
                            plan.highlighted ? "text-slate-200" : "text-zinc-700"
                          }
                        >
                          {f}
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
              Philippines bank or e-wallet: pay manually, then we activate your
              plan.
            </p>
          </div>
        </section>

        <section className="border-t border-[#1e2a4a] bg-[#0B132B]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Ready to try Pro free for 14 days
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                No card. Keep Free features after the trial; upgrade when you need
                more seats or SMS.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 shrink-0 items-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Start 14-day trial
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
