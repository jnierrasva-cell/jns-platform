"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Contact,
  Zap,
  Plug,
  Users,
  Shield,
  LogOut,
  Filter,
  CalendarDays,
  FileInput,
  Inbox,
  Kanban,
  Building2,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export function DashboardShell({
  userEmail,
  isPlatformAdmin,
  isOrgManager,
  orgName,
  children,
}: {
  userEmail: string;
  isPlatformAdmin: boolean;
  isOrgManager: boolean;
  orgName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems: NavItem[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Contacts", href: "/dashboard/contacts", icon: Contact },
    { label: "Unmatched", href: "/dashboard/unmatched", icon: Inbox },
    { label: "Pipeline", href: "/dashboard/pipeline", icon: Kanban },
    { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
    { label: "Forms", href: "/dashboard/forms", icon: FileInput },
    { label: "SOPs", href: "/dashboard/sops", icon: BookOpen },
    { label: "Automation", href: "/dashboard/automation", icon: Zap },
    { label: "Email rules", href: "/dashboard/email-rules", icon: Filter },
    { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  ];

  if (isOrgManager) {
    navItems.push({ label: "Team", href: "/dashboard/team", icon: Users });
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-full bg-[#0B132B] text-[#F1F5F9]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#1e2a4a] bg-[#080f22]">
        <div className="border-b border-[#1e2a4a] px-4 py-4">
          <BrandMark href="/dashboard" inverted />
          <p className="mt-2 truncate px-0.5 text-xs text-[#64748B]">{orgName}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition ${
                  active
                    ? "bg-[#111e3a] font-medium text-white"
                    : "text-[#94A3B8] hover:bg-[#111e3a] hover:text-white"
                }`}
              >
                <Icon
                  size={16}
                  className={active ? "text-[#3B82F6]" : "text-[#64748B]"}
                />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-[#1e2a4a]" />

          <Link
            href="/dashboard/orgs"
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition ${
              pathname.startsWith("/dashboard/orgs")
                ? "bg-[#111e3a] font-medium text-white"
                : "text-[#94A3B8] hover:bg-[#111e3a] hover:text-white"
            }`}
          >
            <Building2
              size={16}
              className={
                pathname.startsWith("/dashboard/orgs")
                  ? "text-[#3B82F6]"
                  : "text-[#64748B]"
              }
            />
            My orgs
          </Link>

          {isPlatformAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition ${
                pathname.startsWith("/admin")
                  ? "bg-[#111e3a] font-medium text-white"
                  : "text-[#94A3B8] hover:bg-[#111e3a] hover:text-white"
              }`}
            >
              <Shield size={16} className="text-[#64748B]" />
              JNS Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-[#1e2a4a] p-2">
          <p className="truncate px-2.5 text-xs text-[#64748B]">{userEmail}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-[#94A3B8] transition hover:bg-[#111e3a] hover:text-white"
          >
            <LogOut size={16} className="text-[#64748B]" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0B132B]">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}