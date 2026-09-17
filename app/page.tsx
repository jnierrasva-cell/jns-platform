import Link from "next/link";
import { ArrowRight, CalendarDays, Mail, Plug, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const features = [
  {
    icon: Users,
    title: "Contacts & pipeline",
    body: "Track leads through booked, customer, and inactive. Notes, tags, and history stay on the contact.",
  },
  {
    icon: CalendarDays,
    title: "Bookings",
    body: "Share a booking page, keep the calendar current, and see what’s coming up this week.",
  },
  {
    icon: Mail,
    title: "Forms & follow-up",
    body: "Publish an intake form. New submissions land as contacts you can email or text from the same record.",
  },
  {
    icon: Plug,
    title: "Tools you already use",
    body: "Connect Google, Twilio, and studio software so reminders and syncs run on your accounts.",
  },
];

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.35)]">
      <div className="flex border-b border-zinc-200">
        <div className="hidden w-44 shrink-0 border-r border-zinc-200 bg-zinc-50 p-3 sm:block">
          <p className="px-2 text-[11px] font-medium text-zinc-400">Workspace</p>
          <div className="mt-3 space-y-1">
            {["Overview", "Contacts", "Bookings", "Automation"].map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 text-[13px] ${
                  i === 0 ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Overview</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">This week</p>
            </div>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
              3 tools connected
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["12", "Leads"],
              ["4", "Booked"],
              ["2", "Automations"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-md border border-zinc-200 px-3 py-2.5">
                <p className="text-lg font-semibold tracking-tight text-zinc-900">{value}</p>
                <p className="text-[11px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-zinc-200">
            {[
              ["Maya Chen", "Lead · intake form"],
              ["Jordan Hale", "Booked · Thu 10:00"],
              ["New lead acknowledgement", "Automation · on"],
            ].map(([title, meta], i) => (
              <div
                key={title}
                className={`flex items-center justify-between px-3 py-2.5 text-[13px] ${
                  i > 0 ? "border-t border-zinc-100" : ""
                }`}
              >
                <span className="font-medium text-zinc-800">{title}</span>
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
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <BrandMark />
          <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex" aria-label="Main">
            <a href="#product" className="hover:text-zinc-900">
              Product
            </a>
            <a href="#how" className="hover:text-zinc-900">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden px-3 py-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-900 sm:inline">
              Sign in
            </Link>
            <Link href="/login" className="jns-btn h-8 px-3">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-12 px-5 pb-16 pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:pt-20">
          <div>
            <p className="text-sm text-zinc-500">For studios, coaches, and service teams</p>
            <h1 className="mt-3 max-w-lg text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-5xl">
              Run the front of the business in one place.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-600">
              JNS is the workspace for contacts, bookings, intake, and the
              automations that follow them — without another stack of tabs.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="jns-btn h-10 px-4">
                Sign in
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#product" className="jns-btn-secondary h-10 px-4">
                See what’s included
              </a>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section id="product" className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
              What you actually use day to day
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Built around the work of getting someone from inquiry to booked to
              customer — then staying in touch.
            </p>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="bg-white p-6">
                    <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
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

        <section id="how" className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Set up in three steps
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ["1", "Create a workspace", "Sign in, name the business, and invite the people who need access."],
              ["2", "Connect accounts", "Link Google, SMS, and class software so data isn’t copied by hand."],
              ["3", "Turn on the boring work", "Enable the automations you want — replies, reminders, routing."],
            ].map(([n, title, body]) => (
              <li key={n}>
                <p className="text-xs font-medium text-zinc-400">{n}</p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                Ready when you are
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Use your existing JNS account, or create one from the sign-in page.
              </p>
            </div>
            <Link href="/login" className="jns-btn h-10 px-4">
              Go to sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Journey Network Systems</p>
          <p>Contacts, bookings, forms, and automations.</p>
        </div>
      </footer>
    </div>
  );
}
