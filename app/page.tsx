import Link from "next/link";

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
    <div className="min-h-full bg-[#F6F5F1]">
      <header className="border-b border-[#E1DFD6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-mono text-sm tracking-tight text-[#1B1D1F]">
            JNSystem
          </span>
          <Link
            href="/login"
            className="rounded-md border border-[#1F4D42] px-4 py-1.5 text-sm text-[#1F4D42] transition-colors hover:bg-[#1F4D42] hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="flex flex-col items-start gap-6 py-24">
          <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            For service businesses running lean
          </span>
          <h1 className="max-w-2xl text-4xl font-medium leading-tight text-[#1B1D1F] sm:text-5xl">
            Turn on the systems that run your business behind the scenes.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[#6B7069]">
            Email replies, lead sorting, booking sync — pick what you need,
            switch it on, and keep working with your VA the same way you
            always have.
          </p>
          <Link
            href="/login"
            className="rounded-md bg-[#1F4D42] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#163B33]"
          >
            Go to your dashboard
          </Link>
        </section>

        {/* Category overview */}
        <section className="grid grid-cols-1 gap-4 border-t border-[#E1DFD6] py-16 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <div
              key={category.name}
              className="rounded-lg border border-[#E1DFD6] bg-white p-5"
            >
              <h3 className="text-sm font-medium text-[#1B1D1F]">
                {category.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7069]">
                {category.detail}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-[#E1DFD6] px-6 py-8">
        <p className="mx-auto max-w-6xl text-xs text-[#8A8F87]">
          JNSystem — built and operated by your VA.
        </p>
      </footer>
    </div>
  );
}
