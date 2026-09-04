import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
  {
    name: "Email",
    detail: "Instant acknowledgments, timed follow-ups.",
  },
  {
    name: "Lead management",
    detail: "New inquiries sorted and routed automatically.",
  },
  {
    name: "Calendar",
    detail: "Bookings and staff schedules kept in sync.",
  },
  {
    name: "Social media",
    detail: "Posts queued, common questions answered.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-[#0B132B] text-[#F1F5F9]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0B132B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={160}
              height={60}
              className="h-11 w-auto"
              priority
            />
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-[#2563EB]/40 bg-[#2563EB]/10 px-4 py-1.5 text-sm font-medium text-[#93C5FD] transition-all hover:bg-[#2563EB]/20 hover:border-[#2563EB]/60"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="relative flex flex-col items-start gap-6 py-24 sm:py-28">
          {/* Soft ambient glows */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-[#2563EB]/12 blur-[100px]" />
            <div className="absolute -left-32 bottom-10 h-[320px] w-[320px] rounded-full bg-[#06B6D4]/10 blur-[90px]" />
          </div>

          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#06B6D4]">
            For service businesses running lean
          </span>

          <h1 className="max-w-3xl font-[family-name:var(--font-poppins)] text-4xl font-semibold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            Turn on the systems that run your business behind the scenes.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-[#94A3B8] sm:text-lg">
            Email replies, lead sorting, booking sync — pick what you need,
            switch it on, and keep working with your VA the same way you
            always have.
          </p>

          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#1D4ED8] hover:shadow-[#2563EB]/40"
          >
            Go to your dashboard
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </section>

        {/* Category overview */}
        <section className="grid grid-cols-1 gap-5 border-t border-white/10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-200 hover:border-[#2563EB]/35 hover:bg-white/[0.055]"
            >
              <h3 className="font-[family-name:var(--font-poppins)] text-[15px] font-semibold text-white">
                {category.name}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#94A3B8]">
                {category.detail}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <p className="mx-auto max-w-6xl text-xs text-[#64748B]">
          JNS Platform — built and operated by your VA.
        </p>
      </footer>
    </div>
  );
}