"use client";

import { useState, useSyncExternalStore } from "react";
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
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";
import Image from "next/image";
import { SupportBubble } from "@/components/support-bubble";

const STORAGE_KEY = "jns_sidebar_collapsed";
const SIDEBAR_CHANGE_EVENT = "jns-sidebar-preference-change";

function subscribeToSidebarPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, onChange);
  };
}

function getSidebarCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed: boolean;
}) {
  if (collapsed) {
    return <div className="my-2 border-t border-slate-200" />;
  }
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 first:mt-0">
      {children}
    </p>
  );
}

function subscribeToHydration() {
  return () => {};
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
};

/** Day-to-day work — every org member */
const WORK_NAV: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/dashboard/contacts", icon: Contact },
  { label: "Journey", href: "/dashboard/pipeline", icon: Kanban },
  { label: "Schedule", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Forms", href: "/dashboard/forms", icon: FileInput },
  { label: "Playbooks", href: "/dashboard/sops", icon: BookOpen },
];

/**
 * Inbox ops + workspace setup — ceo / admin only.
 * Unmatched lives here so assistants are not dropped into email triage by default.
 */
const SETUP_NAV: NavItem[] = [
  { label: "Workspace", href: "/dashboard/workspace", icon: ImageIcon },
  { label: "Unmatched email", href: "/dashboard/unmatched", icon: Inbox },
  { label: "Autopilot", href: "/dashboard/automation", icon: Zap, badge: "Pro" },
  { label: "Who gets replies", href: "/dashboard/email-rules", icon: Filter },
  { label: "Reply templates", href: "/dashboard/templates", icon: FileText },
  { label: "Connections", href: "/dashboard/integrations", icon: Plug },
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

  const collapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarCollapsed,
    () => false,
  );
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null);
  const mobileOpen = mobileOpenPath === pathname;

  function toggleCollapsed() {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
      window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
    } catch {
      // Keep navigation usable when browser storage is unavailable.
    }
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
    `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition min-h-[44px] ${
      !showLabels ? "justify-center px-2" : ""
    } ${
      active
        ? "bg-sky-50 font-medium text-sky-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          onClick={() => setMobileOpenPath(null)}
        >
          <Icon
            size={18}
            className={`shrink-0 ${
              active ? "text-sky-600" : "text-slate-400"
            }`}
          />
          {showLabels && (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {item.badge}
                </span>
              )}
            </span>
          )}
        </Link>
      );
    });
  }

  const planBadgeClass =
    planId === "none"
      ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      : planId === "business"
        ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
        : planId === "pro"
          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

  const sidebarInner = (
    <>
      <div
        className={`border-b border-slate-100 ${
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
            <span className="text-sm font-semibold tracking-tight text-slate-900">
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
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setMobileOpenPath(null)}
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
            <div className="mt-3 flex items-center gap-2 px-0.5">
              <p className="truncate text-sm font-semibold text-slate-900">
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
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 px-0.5"
              onClick={() => setMobileOpenPath(null)}
              title="View plan and billing"
            >
              <span
                className={`truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${planBadgeClass}`}
              >
                {planLabel}
              </span>
            </Link>
          </>
        )}
      </div>

      <div className="hidden border-b border-slate-100 p-2 md:block">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 min-h-[44px]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {showLabels && <span className="text-[12px]">Collapse</span>}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <SectionLabel collapsed={!showLabels}>Work</SectionLabel>
        {renderNavItems(WORK_NAV)}

        {isOrgManager && (
          <>
            <SectionLabel collapsed={!showLabels}>Setup</SectionLabel>
            {renderNavItems(SETUP_NAV)}
          </>
        )}

        <SectionLabel collapsed={!showLabels}>Account</SectionLabel>
        <Link
          href="/dashboard/orgs"
          className={linkClass(pathname.startsWith("/dashboard/orgs"))}
          title={!showLabels ? "My workspaces" : undefined}
          onClick={() => setMobileOpenPath(null)}
        >
          <Building2
            size={18}
            className={`shrink-0 ${
              pathname.startsWith("/dashboard/orgs")
                ? "text-sky-600"
                : "text-slate-400"
            }`}
          />
          {showLabels && "My workspaces"}
        </Link>

        {isOrgManager && (
          <Link
            href="/dashboard/billing"
            className={linkClass(pathname.startsWith("/dashboard/billing"))}
            title={!showLabels ? "Billing" : undefined}
            onClick={() => setMobileOpenPath(null)}
          >
            <CreditCard
              size={18}
              className={`shrink-0 ${
                pathname.startsWith("/dashboard/billing")
                  ? "text-sky-600"
                  : "text-slate-400"
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
            onClick={() => setMobileOpenPath(null)}
          >
            <Shield
              size={18}
              className={`shrink-0 ${
                pathname.startsWith("/dashboard/admin")
                  ? "text-sky-600"
                  : "text-slate-400"
              }`}
            />
            {showLabels && "JNS Admin"}
          </Link>
        )}
      </nav>

      <div className="border-t border-slate-100 p-2">
        <Link
          href="/privacy"
          className={linkClass(pathname === "/privacy")}
          title={!showLabels ? "Privacy Policy" : undefined}
          onClick={() => setMobileOpenPath(null)}
        >
          <FileText size={18} className="shrink-0 text-slate-400" />
          {showLabels && "Privacy Policy"}
        </Link>
        {showLabels && (
          <p className="truncate px-3 text-xs text-slate-400">{userEmail}</p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className={linkClass(false)}
          title={!showLabels ? "Sign out" : undefined}
        >
          <LogOut size={18} className="shrink-0 text-slate-400" />
          {showLabels && "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#F4F6FB] text-slate-900">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpenPath(null)}
        />
      )}

      <aside
        className={[
          "flex flex-col border-r border-slate-200/80 bg-white",
          "fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] transition-transform duration-200 ease-out md:static md:z-auto md:max-w-none md:translate-x-0",
          collapsed ? "md:w-[4.25rem]" : "md:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ready ? "" : "md:opacity-0",
        ].join(" ")}
      >
        {sidebarInner}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpenPath(pathname)}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {orgName}
            </p>
            {isOrgManager ? (
              <Link
                href="/dashboard/billing"
                className="mt-0.5 inline-flex"
                title="View plan and billing"
              >
                <span
                  className={`truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    planId === "none"
                      ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                  }`}
                >
                  {planLabel}
                </span>
              </Link>
            ) : (
              <span
                className={`mt-0.5 inline-flex truncate rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  planId === "none"
                    ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                }`}
              >
                {planLabel}
              </span>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto bg-[#F4F6FB]">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      <SupportBubble userEmail={userEmail} orgName={orgName} />
    </div>
  );
}
