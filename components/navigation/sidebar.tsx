import Link from "next/link";

const menu = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Inbox Automation", href: "/inbox" },
  { title: "CRM", href: "/crm" },
  { title: "Lead Generation", href: "/leads" },
  { title: "Analytics", href: "/analytics" },
  { title: "Settings", href: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-950 px-6 py-8 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">JNS</h1>

        <p className="mt-2 text-sm text-slate-400">
          Kaizen Platform
        </p>
      </div>

      <nav className="mt-10 flex flex-col gap-2">
        {menu.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            {item.title}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Version
        </p>

        <p className="mt-2 font-semibold">JNS v0.1.0</p>
      </div>
    </aside>
  );
}