"use client";

import { useEffect, useState } from "react";
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

const STORAGE_KEY = "jns_sidebar_collapsed";

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

  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

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

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition ${
      collapsed ? "justify-center px-2" : ""
    } ${
      active
        ? "bg-[#111e3a] font-medium text-white"
        : "text-slate-400 hover:bg-[#111e3a] hover:text-white"
    }`;

  return (
    <div className="flex min-h-full bg-zinc-50 text-zinc-900">
      <aside
        className={`flex shrink-0 flex-col border-r border-[#1e2a4a] bg-[#0B132B] transition-[width] duration-200 ease-out ${
          collapsed ? "w-[4.25rem]" : "w-56"
        } ${ready ? "" : "opacity-0"}`}
      >
        <div
          className={`border-b border-[#1e2a4a] ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}
        >
          {collapsed ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center py-1"
              aria-label="JNS home"
              title="JNS"
            >
              <span className="text-sm font-semibold tracking-tight text-white">
                JNS
              </span>
            </Link>
          ) : (
            <>
              <BrandMark href="/dashboard" />
              <p className="mt-2 truncate px-0.5 text-xs text-slate-400">
                {orgName}
              </p>
            </>
          )}
        </div>

        <div className={`border-b border-[#1e2a4a] p-2 ${collapsed ? "" : ""}`}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-slate-400 transition hover:bg-[#111e3a] hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && (
              <span className="text-[12px]">Collapse</span>
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(active)}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  className={`shrink-0 ${active ? "text-sky-400" : "text-slate-500"}`}
                />
                {!collapsed && item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-[#1e2a4a]" />

          <Link
            href="/dashboard/orgs"
            className={linkClass(pathname.startsWith("/dashboard/orgs"))}
            title={collapsed ? "My orgs" : undefined}
          >
            <Building2
              size={16}
              className={`shrink-0 ${
                pathname.startsWith("/dashboard/orgs")
                  ? "text-sky-400"
                  : "text-slate-500"
              }`}
            />
            {!collapsed && "My orgs"}
          </Link>

          {isPlatformAdmin && (
            <Link
              href="/dashboard/admin"
              className={linkClass(pathname.startsWith("/dashboard/admin"))}
              title={collapsed ? "JNS Admin" : undefined}
            >
              <Shield size={16} className="shrink-0 text-slate-500" />
              {!collapsed && "JNS Admin"}
            </Link>
          )}
        </nav>

        <div className="border-t border-[#1e2a4a] p-2">
          {!collapsed && (
            <p className="truncate px-2.5 text-xs text-slate-500">{userEmail}</p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={linkClass(false)}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut size={16} className="shrink-0 text-slate-500" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
