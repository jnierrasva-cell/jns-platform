export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold">JNS</h1>

      <nav className="mt-10 space-y-2">
        <a href="/dashboard" className="block rounded-lg px-3 py-2 hover:bg-slate-800">
          Dashboard
        </a>

        <a href="#" className="block rounded-lg px-3 py-2 hover:bg-slate-800">
          Inbox Automation
        </a>

        <a href="#" className="block rounded-lg px-3 py-2 hover:bg-slate-800">
          CRM
        </a>

        <a href="#" className="block rounded-lg px-3 py-2 hover:bg-slate-800">
          Lead Generation
        </a>

        <a href="#" className="block rounded-lg px-3 py-2 hover:bg-slate-800">
          Settings
        </a>
      </nav>
    </aside>
  );
}