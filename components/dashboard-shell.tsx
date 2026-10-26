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
  CreditCard,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";
import Image from "next/image";

const STORAGE_KEY = "jns_sidebar_collapsed";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

/** Day-to-day work — every org member */
const WORK_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contacts", href: "/dashboard/contacts", icon: Contact },
  { label: "Pipeline", href: "/dashboard/pipeline", icon: Kanban },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Forms", href: "/dashboard/forms", icon: FileInput },
  { label: "SOPs", href: "/dashboard/sops", icon: BookOpen },
];

/**
 * Inbox ops + workspace setup — ceo / admin only.
 * Unmatched lives here so assistants are not dropped into email triage by default.
 */
const SETUP_NAV: NavItem[] = [
  { label: "Workspace", href: "/dashboard/workspace", icon: ImageIcon },
  { label: "Unmatched email", href: "/dashboard/unmatched", icon: Inbox },
  { label: "Automation", href: "/dashboard/automation", icon: Zap },
  { label: "Who gets replies", href: "/dashboard/email-rules", icon: Filter },
  { label: "Reply templates", href: "/dashboard/templates", icon: FileText },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Team", href: "/dashboard/team", icon: Users },
];

export function DashboardShell({
  userEmail,
  isPlatformAdmin,
  isOrgManager,
  orgName,
  orgKind,
  orgLogoUrl,
  planLabel = "No plan",
  planId = "none",
  children,
}: {
  userEmail: string;
  isPlatformAdmin: boolean;
  isOrgManager: boolean;
  orgName: string;
  orgKind?: "personal" | "business" | null;
  orgLogoUrl?: string | null;
  planLabel?: string;
  planId?: string;
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

  function renderNavItems(items: NavItem[]) {
    return items.map((item) => {
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
    });
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    if (!showLabels) {
      return <div className="my-2 border-t border-[#1e2a4a]" />;
    }
    return (
      <p className="mb-1 mt-3 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 first:mt-0">
        {children}
      </p>
    );
  }

  const planBadgeClass =
    planId === "none"
      ? "bg-slate-700/80 text-slate-300"
      : planId === "business"
        ? "bg-cyan-500/20 text-cyan-300"
        : planId === "pro"
          ? "bg-sky-500/20 text-sky-300"
          : "bg-emerald-500/15 text-emerald-300";

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
              <div className="origin-left scale-90">
                <BrandMark href="/dashboard" />
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:bg-[#111e3a] hover:text-white md:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            {orgLogoUrl && (
              <div className="mt-3 flex h-10 items-center px-0.5">
                <Image
                  src={orgLogoUrl}
                  alt={`${orgName} logo`}
                  width={160}
                  height={40}
                  unoptimized
                  className="max-h-10 w-auto max-w-full object-contain object-left"
                />
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 px-0.5">
              <p className="truncate text-sm font-semibold text-white">
                {orgName}
              </p>
              {orgKind === "business" && (
                <span className="shrink-0 text-[10px] font-medium text-slate-400">
                  Business
                </span>
              )}
            </div>
            <Link
              href="/dashboard/billing"
              className="mt-1 inline-flex max-w-full items-center gap-1.5 px-0.5"
              onClick={() => setMobileOpen(false)}
              title="View plan and billing"
            >
              <span
                className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${planBadgeClass}`}
              >
                {planLabel}
              </span>
            </Link>
          </>
        )}
      </div>

      <div className="hidden border-b border-[#1e2a4a] p-2 md:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-slate-400 transition hover:bg-[#111e3a] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {showLabels && <span className="text-[12px]">Collapse</span>}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <SectionLabel>Work</SectionLabel>
        {renderNavItems(WORK_NAV)}

        {isOrgManager && (
          <>
            <SectionLabel>Setup</SectionLabel>
            {renderNavItems(SETUP_NAV)}
          </>
        )}

        <SectionLabel>Account</SectionLabel>
        <Link
          href="/dashboard/orgs"
          className={linkClass(pathname.startsWith("/dashboard/orgs"))}
          title={!showLabels ? "My workspaces" : undefined}
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
          {showLabels && "My workspaces"}
        </Link>

        {isOrgManager && (
          <Link
            href="/dashboard/billing"
            className={linkClass(pathname.startsWith("/dashboard/billing"))}
            title={!showLabels ? "Billing" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <CreditCard
              size={16}
              className={`shrink-0 ${
                pathname.startsWith("/dashboard/billing")
                  ? "text-sky-400"
                  : "text-slate-500"
              }`}
            />
            {showLabels && "Billing"}
          </Link>
        )}

        {isPlatformAdmin && (
          <Link
            href="/dashboard/admin"
            className={linkClass(pathname.startsWith("/dashboard/admin"))}
            title={!showLabels ? "JNS Admin" : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <Shield
              size={16}
              className={`shrink-0 ${
                pathname.startsWith("/dashboard/admin")
                  ? "text-sky-400"
                  : "text-slate-500"
              }`}
            />
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
            {isOrgManager ? (
              <Link
                href="/dashboard/billing"
                className="mt-0.5 inline-flex"
                title="View plan and billing"
              >
                <span
                  className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    planId === "none"
                      ? "bg-zinc-100 text-zinc-600"
                      : "bg-[#0B132B] text-white"
                  }`}
                >
                  {planLabel}
                </span>
              </Link>
            ) : (
              <span
                className={`mt-0.5 inline-flex truncate rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  planId === "none"
                    ? "bg-zinc-100 text-zinc-600"
                    : "bg-[#0B132B] text-white"
                }`}
              >
                {planLabel}
              </span>
            )}
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