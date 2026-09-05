"use client";

type Contact = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

function displayName(c: Contact) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email || "Unknown";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        CRM
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Contacts
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">
        {contacts.length} people in your workspace
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-[#64748B]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Last contacted</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[#94A3B8]"
                >
                  No contacts yet. When someone emails your connected Gmail,
                  they’ll show up here.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {displayName(c)}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs capitalize text-[#E2E8F0]">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8]">{c.source ?? "—"}</td>
                  <td className="px-4 py-3 text-[#94A3B8]">
                    {formatDate(c.last_contacted_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}