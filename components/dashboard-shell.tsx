"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
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
    <div className="flex min-h-full bg-[#F6F5F1]">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-[#E1DFD6] bg-white">
        <div className="border-b border-[#E1DFD6] px-5 py-4">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
          <p className="mt-1 truncate text-xs text-[#8A8F87]">{orgName}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#EAF1EE] font-medium text-[#1F4D42]"
                    : "text-[#6B7069] hover:bg-[#F6F5F1]"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-[#E1DFD6]" />
              <Link
                href="/admin"
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-[#EAF1EE] font-medium text-[#1F4D42]"
                    : "text-[#6B7069] hover:bg-[#F6F5F1]"
                }`}
              >
                <Shield size={16} />
                Admin panel
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-[#E1DFD6] p-3">
          <p className="truncate px-3 text-xs text-[#8A8F87]">{userEmail}</p>
          <button
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[#6B7069] hover:bg-[#F6F5F1]"
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