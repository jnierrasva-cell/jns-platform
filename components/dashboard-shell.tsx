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
  Menu,
  X,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

const STORAGE_KEY = "jns_sidebar_collapsed";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

/** Day-to-day work — every org member */
const MEMBER_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/dashboard/contacts", icon: Contact },
  { label: "Unmatched", href: "/dashboard/unmatched", icon: Inbox },
  { label: "Pipeline", href: "/dashboard/pipeline", icon: Kanban },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Forms", href: "/dashboard/forms", icon: FileInput },
  { label: "SOPs", href: "/dashboard/sops", icon: BookOpen },
];

/** Workspace setup & automation — ceo / admin only */
const MANAGER_NAV: NavItem[] = [
  { label: "Automation", href: "/dashboard/automation", icon: Zap },
  { label: "Email rules", href: "/dashboard/email-rules", icon: Filter },
  { label: "Templates", href: "/dashboard/templates", icon: FileText },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Team", href: "/dashboard/team", icon: Users },
];

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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  const navItems: NavItem[] = isOrgManager
    ? [...MEMBER_NAV, ...MANAGER_NAV]
    : [...MEMBER_NAV];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const showLabels = mobileOpen || !collapsed;

  const linkClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition ${
      !showLabels ? "justify-center px-2" : ""
    } ${
      active
        ? "bg-[#111e3a] font-medium text-white"
        : "text-slate-400 hover:bg-[#111e3a] hover:text-white"
    }`;

  const sidebarInner = (
    <>
      <div
        className={`border-b border-[#1e2a4a] ${
          !showLabels ? "px-2 py-3" : "px-4 py-4"
        }`}
      >
        {!showLabels ? (
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
            <div className="flex items-center justify-between gap-2">
              <BrandMark href="/dashboard" />
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:bg-[#111e3a] hover:text-white md:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 truncate px-0.5 text-xs text-slate-400">
              {orgName}
            </p>
          </>
        )}
      </div>

      <div className="hidden border-b border-[#1e2a4a] p-2 md:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-slate-400 transition hover:bg-[#111e3a] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {showLabels && <span className="text-[12px]">Collapse</span>}
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
              title={!showLabels ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon
                size={16}
                className={`shrink-0 ${
                  active ? "text-sky-400" : "text-slate-500"
                }`}
              />
              {showLabels && item.label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-[#1e2a4a]" />

        <Link
          href="/dashboard/orgs"
          className={linkClass(pathname.startsWith("/dashboard/orgs"))}
          title={!showLabels ? "My orgs" : undefined}
          onClick={() => setMobileOpen(false)}
        >
          <Building2
            size={16}
            className={`shrink-0 ${
              pathname.startsWith("/dashboard/orgs")
                ? "text-sky-400"
                : "text-slate-500"
            }`}
          />
          {showLabels && "My orgs"}
        </Link>

        {isPlatformAdmin && (
          <Link
            href="/dashboard/admin"
            className={linkClass(pathname.startsWith("/dashboard/admin"))}
            title={!showLabels ? "JNS Admin" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <Shield size={16} className="shrink-0 text-slate-500" />
            {showLabels && "JNS Admin"}
          </Link>
        )}
      </nav>

      <div className="border-t border-[#1e2a4a] p-2">
        {showLabels && (
          <p className="truncate px-2.5 text-xs text-slate-500">{userEmail}</p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className={linkClass(false)}
          title={!showLabels ? "Sign out" : undefined}
        >
          <LogOut size={16} className="shrink-0 text-slate-500" />
          {showLabels && "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-zinc-50 text-zinc-900">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={[
          "flex flex-col border-r border-[#1e2a4a] bg-[#0B132B]",
          "fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] transition-transform duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0",
          collapsed ? "md:w-[4.25rem]" : "md:w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ready ? "" : "md:opacity-0",
        ].join(" ")}
      >
        {sidebarInner}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {orgName}
            </p>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-zinc-50">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
