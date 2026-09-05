"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Contact,
  Zap,
  Plug,
  Users,
  Shield,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export function DashboardShell({
  userEmail,
  isAdmin,
  isOrgCeo,
  orgName,
  children,
}: {
  userEmail: string;
  isAdmin: boolean;
  isOrgCeo: boolean;
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
    { label: "Automation", href: "/dashboard/automation", icon: Zap },
    { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  ];

  if (isOrgCeo) {
    navItems.push({ label: "Team", href: "/dashboard/team", icon: Users });
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-full bg-[#0B132B] text-[#F1F5F9]">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0B132B]">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <p className="mt-2 truncate text-xs text-[#64748B]">{orgName}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-[#2563EB]/15 font-medium text-[#93C5FD]"
                    : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-white/10" />
              <Link
                href="/admin"
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-[#2563EB]/15 font-medium text-[#93C5FD]"
                    : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Shield size={16} />
                Admin panel
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <p className="truncate px-3 text-xs text-[#64748B]">{userEmail}</p>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[#94A3B8] transition-all hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}