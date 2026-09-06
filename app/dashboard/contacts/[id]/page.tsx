import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at",
    )
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!contact) notFound();

  const { data: activity } = await supabase
    .from("email_activity")
    .select(
      "id, direction, subject, from_email, to_email, status, rule_id, created_at",
    )
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const displayName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email ||
    "Unknown";

  return (
    <div>
      <Link
        href="/dashboard/contacts"
        className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
      >
        ← Back to Contacts
      </Link>

      <span className="mt-4 block font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Contact
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        {displayName}
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">{contact.email}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs capitalize text-[#E2E8F0]">
          {contact.status}
        </span>
        {(contact.tags ?? []).map((tag: string) => (
          <span
            key={tag}
            className="inline-flex rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-2.5 py-0.5 text-xs text-[#93C5FD]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Email activity
        </h2>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {(activity ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No email activity logged for this contact yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {(activity ?? []).map((row) => (
                <li key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {row.subject || "(no subject)"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        {row.direction === "inbound" ? "Received from" : "Sent to"}{" "}
                        {row.direction === "inbound"
                          ? row.from_email
                          : row.to_email}
                        {" · "}
                        {row.status}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-[#64748B]">
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}