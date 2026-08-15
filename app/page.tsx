const SERVICES = [
  {
    name: "Email First-Response",
    status: "live" as const,
    category: "INBOX",
    description:
      "Acknowledges new emails the moment they land, using a message you write and can edit anytime before it goes live.",
  },
  {
    name: "Lead Intake Sorter",
    status: "wip" as const,
    category: "INBOX",
    description:
      "Reads incoming inquiries and routes them by type, so nothing sits unsorted in a shared inbox.",
  },
  {
    name: "Follow-Up Scheduler",
    status: "wip" as const,
    category: "SCHEDULING",
    description:
      "Queues a follow-up automatically when a thread goes quiet for a set number of days.",
  },
];

const SCOPE = [
  {
    num: "01",
    title: "We talk about your business",
    body: "A short conversation about what's repetitive or slow in your day-to-day — that's where the right automation comes from.",
  },
  {
    num: "02",
    title: "You get portal access",
    body: "Log in, browse what's available, and activate the ones that fit. Each one shows exactly what it does before you turn it on.",
  },
  {
    num: "03",
    title: "You stay in control",
    body: "Edit the wording, pause it, or remove it entirely — anytime, without needing to ask.",
  },
];

export default function Home() {
  return (
    <div className="bg-[#10131a] text-[#edeae3] min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[#10131a]/90 backdrop-blur border-b border-[#2c3140]">
        <nav className="max-w-5xl mx-auto px-7 h-[68px] flex items-center justify-between">
          <div className="font-semibold text-lg tracking-tight">
            JN<span className="text-[#d9a253]">System</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#a8a6a0]">
            <a href="#about" className="hover:text-[#edeae3] transition-colors">About</a>
            <a href="#services" className="hover:text-[#edeae3] transition-colors">Services</a>
            <a href="#scope" className="hover:text-[#edeae3] transition-colors">Scope</a>
            <a href="#contact" className="hover:text-[#edeae3] transition-colors">Contact</a>
          </div>
          <a
            href="/login"
            className="rounded-md bg-[#d9a253] text-[#10131a] text-sm font-semibold px-5 py-2.5 hover:bg-[#e6b167] transition-colors"
          >
            Client Login
          </a>
        </nav>
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-7 py-24 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#d9a253] mb-4">
            Operations, automated
          </div>
          <h1 className="text-4xl md:text-5xl leading-tight font-semibold tracking-tight mb-6">
            Your business runs itself between the moments{" "}
            <span className="text-[#d9a253]">you</span> show up.
          </h1>
          <p className="text-[#a8a6a0] text-lg max-w-md mb-8">
            A client portal for the automations and tools built specifically
            for your operations — activate what you need, adjust it to sound
            like you, and switch it off just as easily.
          </p>
          <div className="flex gap-3.5">
            <a
              href="#services"
              className="rounded-md bg-[#d9a253] text-[#10131a] text-sm font-semibold px-5 py-2.5 hover:bg-[#e6b167] transition-colors"
            >
              View services
            </a>
            <a
              href="#contact"
              className="rounded-md border border-[#2c3140] text-sm font-medium px-5 py-2.5 hover:border-[#a8a6a0] transition-colors"
            >
              Get in touch
            </a>
          </div>
        </div>

        {/* Signature inbox mockup */}
        <div className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-5 shadow-2xl">
          <div className="flex justify-between items-center pb-3.5 mb-3.5 border-b border-[#2c3140]">
            <span className="text-xs font-mono text-[#a8a6a0]">
              inbox · hello@yourbusiness.com
            </span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2c3140]" />
              <div className="w-2 h-2 rounded-full bg-[#2c3140]" />
              <div className="w-2 h-2 rounded-full bg-[#2c3140]" />
            </div>
          </div>
          <div className="bg-[#232838] rounded-lg px-4 py-3.5 mb-2.5">
            <p className="text-sm font-medium mb-1">R. Delgado</p>
            <p className="text-sm text-[#a8a6a0]">
              Hi, I wanted to ask about pricing for the...
            </p>
          </div>
          <div className="border border-dashed border-[#2c3140] rounded-lg px-4 py-3.5">
            <p className="text-sm font-medium text-[#7fb88f] mb-1">
              Auto-acknowledged
            </p>
            <p className="text-sm text-[#a8a6a0]">
              Thanks for reaching out — we&apos;ve received your message and
              will get back to you shortly.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#7fb88f]/10 text-[#7fb88f] px-2.5 py-1 rounded-full mt-2.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7fb88f]" />
              sent in 0.4s
            </span>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-t border-[#2c3140] py-22">
        <div className="max-w-5xl mx-auto px-7 grid grid-cols-1 md:grid-cols-2 gap-14">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#d9a253] mb-3.5">
              About
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              One person, built to feel like a team.
            </h2>
            <p className="text-[#a8a6a0] mb-4">
              JNSystem is run independently — every automation in the catalog
              is built, tested, and supported by one person. No account
              managers, no hand-offs. What scales instead is the work itself:
              tools built once, refined with feedback, and handed to each
              client ready to run.
            </p>
            <p className="text-[#a8a6a0]">
              The portal exists so that growing the client list doesn&apos;t
              mean growing the overhead. You get direct access to the person
              who built the tool, and full control over how it behaves in
              your business.
            </p>
          </div>
          <div className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-7">
            <span className="block text-xs uppercase tracking-wide text-[#d9a253] mb-4 font-mono">
              How it&apos;s structured
            </span>
            {[
              ["Built and maintained by", "1 person"],
              ["Client control", "Full — edit or remove anytime"],
              ["Current integration", "Google Workspace"],
              ["Support", "Direct, no tickets"],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex justify-between py-3 border-b border-[#2c3140] last:border-none"
              >
                <span className="text-sm text-[#a8a6a0]">{label}</span>
                <span className="text-sm font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="border-t border-[#2c3140] py-22">
        <div className="max-w-5xl mx-auto px-7">
          <div className="max-w-lg mb-12">
            <div className="text-xs uppercase tracking-widest text-[#d9a253] mb-3.5">
              Services
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-3.5">
              Pick what your business needs.
            </h2>
            <p className="text-[#a8a6a0]">
              Every tool here started as something built for a real client.
              Once it&apos;s reliable, it gets added to the catalog for
              everyone.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-6.5 flex flex-col hover:border-[#3a4155] hover:-translate-y-0.5 transition-all"
              >
                <span
                  className={`self-start text-xs px-2.5 py-1 rounded-full mb-4 ${
                    s.status === "live"
                      ? "bg-[#7fb88f]/10 text-[#7fb88f]"
                      : "bg-[#d9a253]/10 text-[#d9a253]"
                  }`}
                >
                  {s.status === "live" ? "Live" : "In development"}
                </span>
                <h3 className="font-medium mb-2.5">{s.name}</h3>
                <p className="text-sm text-[#a8a6a0] flex-1">
                  {s.description}
                </p>
                <span className="mt-4 text-xs font-mono text-[#a8a6a0]">
                  CATEGORY · {s.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCOPE */}
      <section id="scope" className="border-t border-[#2c3140] py-22">
        <div className="max-w-5xl mx-auto px-7">
          <div className="max-w-lg mb-12">
            <div className="text-xs uppercase tracking-widest text-[#d9a253] mb-3.5">
              Scope
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">
              How working together looks.
            </h2>
          </div>
          <div className="flex flex-col">
            {SCOPE.map((step, i) => (
              <div
                key={step.num}
                className={`grid grid-cols-[70px_1fr] gap-6 py-7 ${
                  i !== SCOPE.length - 1 ? "border-b border-[#2c3140]" : ""
                } ${i === 0 ? "pt-0" : ""}`}
              >
                <span className="font-mono text-sm text-[#d9a253] pt-0.5">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-medium text-lg mb-2">{step.title}</h3>
                  <p className="text-[#a8a6a0] text-sm max-w-lg">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-[#2c3140] py-22">
        <div className="max-w-5xl mx-auto px-7">
          <div className="rounded-2xl border border-[#2c3140] bg-[#1b1f29] p-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight mb-3.5">
              Let&apos;s see what can run on its own.
            </h2>
            <p className="text-[#a8a6a0] max-w-md mx-auto mb-7">
              Reach out and we&apos;ll figure out which automation gets you
              the most time back first.
            </p>
            <a
              href="mailto:hello@jnsystem.co"
              className="inline-block rounded-md bg-[#d9a253] text-[#10131a] text-sm font-semibold px-5 py-2.5 hover:bg-[#e6b167] transition-colors"
            >
              hello@jnsystem.co
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2c3140] py-8">
        <div className="max-w-5xl mx-auto px-7 flex justify-between items-center">
          <span className="text-xs font-mono text-[#a8a6a0]">jnsystem</span>
          <span className="text-xs font-mono text-[#a8a6a0]">
            © 2026 · built independently
          </span>
        </div>
      </footer>
    </div>
  );
}