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
  CalendarDays,
  FileInput,
  Kanban,
  Building2,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  X,
  FileText,
  CreditCard,
  ImageIcon,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";
import Image from "next/image";
import { SupportBubble } from "@/components/support-bubble";
import { Badge } from "@/components/ui/badge";
import { BottomTabBar, type BottomTabItem } from "@/components/ui/bottom-tab-bar";
import { Sheet } from "@/components/ui/sheet";
import { Sidebar } from "@/components/ui/sidebar";

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
    return <div className="my-2 border-t border-[#1e2a4a]" />;
  }
  return (
    <p className="mb-1 mt-3 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 first:mt-0">
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

/** Day-to-day work available to every org member. */
const WORK_NAV: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/dashboard/contacts", icon: Contact },
  { label: "Journey", href: "/dashboard/pipeline", icon: Kanban },
  { label: "Schedule", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Intake forms", href: "/dashboard/forms", icon: FileInput },
  { label: "Playbooks", href: "/dashboard/sops", icon: BookOpen },
];

const AUTOPILOT_NAV: NavItem = {
  label: "Autopilot",
  href: "/dashboard/autopilot",
  icon: Zap,
  badge: "Pro",
};

const CONNECTIONS_NAV: NavItem = {
  label: "Connections",
  href: "/dashboard/integrations",
  icon: Plug,
};

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
  const [moreOpen, setMoreOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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

  const showLabels = !collapsed;

  const linkClass = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
      !showLabels ? "justify-center px-2" : ""
    } ${
      active
        ? "bg-accent-cyan/10 font-semibold text-foreground"
        : "text-text-secondary hover:bg-surface hover:text-foreground"
    }`;

  function renderNavItems(items: NavItem[], onNavigate?: () => void) {
    return items.map((item) => {
      const active = isActive(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(active)}
          title={!showLabels ? item.label : undefined}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon
            size={16}
            className={`shrink-0 ${active ? "text-accent-cyan" : "text-text-muted"}`}
          />
          {showLabels && (
            <>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="attention" className="min-h-6 px-2 text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Link>
      );
    });
  }

  const mobileItems: BottomTabItem[] = [
    {
      label: "Today",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: isActive("/dashboard"),
    },
    {
      label: "Clients",
      href: "/dashboard/contacts",
      icon: Contact,
      active: isActive("/dashboard/contacts"),
    },
    {
      label: "Schedule",
      href: "/dashboard/bookings",
      icon: CalendarDays,
      active: isActive("/dashboard/bookings"),
    },
    {
      label: isOrgManager ? "Autopilot" : "Journey",
      href: isOrgManager ? "/dashboard/autopilot" : "/dashboard/pipeline",
      icon: isOrgManager ? Zap : Kanban,
      active: isOrgManager
        ? isActive("/dashboard/autopilot")
        : isActive("/dashboard/pipeline"),
    },
  ];

  const moreNav: NavItem[] = [
    { label: "Journey", href: "/dashboard/pipeline", icon: Kanban },
    { label: "Intake forms", href: "/dashboard/forms", icon: FileInput },
    { label: "Playbooks", href: "/dashboard/sops", icon: BookOpen },
    { label: "My workspaces", href: "/dashboard/orgs", icon: Building2 },
    { label: "Support", href: "/support", icon: MessageCircle },
    { label: "Privacy", href: "/privacy", icon: FileText },
    { label: "Terms", href: "/terms", icon: FileText },
    ...(isOrgManager
      ? [
          CONNECTIONS_NAV,
          { label: "Team", href: "/dashboard/team", icon: Users },
          { label: "Workspace", href: "/dashboard/workspace", icon: ImageIcon },
          { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
        ]
      : []),
    ...(isPlatformAdmin
      ? [{ label: "JNS Admin", href: "/dashboard/admin", icon: Shield }]
      : []),
  ];

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
              <p className="truncate text-sm font-semibold text-foreground">
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
          className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-text-secondary transition hover:bg-surface hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {showLabels && <span className="text-[12px]">Collapse</span>}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <SectionLabel collapsed={!showLabels}>Work</SectionLabel>
        {renderNavItems(WORK_NAV.slice(0, 5))}
        {isOrgManager && renderNavItems([AUTOPILOT_NAV])}
        {renderNavItems([WORK_NAV[5]])}

        {isOrgManager && (
          <>
            <SectionLabel collapsed={!showLabels}>Connections</SectionLabel>
            {renderNavItems([CONNECTIONS_NAV])}
          </>
        )}

        <SectionLabel collapsed={!showLabels}>Settings</SectionLabel>
        {renderNavItems([
          { label: "My workspaces", href: "/dashboard/orgs", icon: Building2 },
        ])}
        {isOrgManager && (
          renderNavItems([
            { label: "Workspace", href: "/dashboard/workspace", icon: ImageIcon },
            { label: "Team", href: "/dashboard/team", icon: Users },
            { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
          ])
        )}

        {isPlatformAdmin && (
          renderNavItems([
            { label: "JNS Admin", href: "/dashboard/admin", icon: Shield },
          ])
        )}
      </nav>

      <div className="border-t border-border p-2">
        <Link href="/privacy" className={linkClass(pathname === "/privacy")}>
          <FileText size={16} className="shrink-0 text-text-muted" />
          {showLabels && "Privacy"}
        </Link>
        <Link href="/terms" className={linkClass(pathname === "/terms")}>
          <FileText size={16} className="shrink-0 text-text-muted" />
          {showLabels && "Terms"}
        </Link>
        {showLabels && (
          <p className="truncate px-3 py-1 text-xs text-text-muted">{userEmail}</p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className={linkClass(false)}
          title={!showLabels ? "Sign out" : undefined}
        >
          <LogOut size={16} className="shrink-0 text-text-muted" />
          {showLabels && "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-zinc-50 text-zinc-900">
      <Sidebar
        aria-label="Primary navigation"
        className={[
          "hidden md:flex md:static md:z-auto md:max-w-none",
          collapsed ? "md:w-[4.25rem]" : "md:w-64",
          ready ? "" : "md:opacity-0",
        ].join(" ")}
      >
        {sidebarInner}
      </Sidebar>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {orgName}
            </p>
            {isOrgManager ? (
              <Link
                href="/dashboard/billing"
                className="mt-0.5 inline-flex min-h-6 items-center"
                title="View plan and billing"
              >
                <span
                  className={`truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    planId === "none" ? "bg-muted text-text-secondary" : "bg-accent-cyan/10 text-accent-cyan"
                  }`}
                >
                  {planLabel}
                </span>
              </Link>
            ) : (
              <span
                className={`mt-0.5 inline-flex truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  planId === "none" ? "bg-muted text-text-secondary" : "bg-accent-cyan/10 text-accent-cyan"
                }`}
              >
                {planLabel}
              </span>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      <BottomTabBar
        items={mobileItems}
        onMore={() => setMoreOpen(true)}
        moreOpen={moreOpen}
      />

      <Sheet.Root
        open={moreOpen}
        onOpenChange={setMoreOpen}
        swipeDirection="down"
      >
        <Sheet.Portal>
          <Sheet.Backdrop />
          <Sheet.Viewport className="fixed inset-0 z-[70] flex items-end">
            <Sheet.Popup className="h-auto max-h-[86dvh] w-full rounded-l-none rounded-t-2xl border-l-0 border-r-0 border-b-0 p-0">
              <Sheet.Content className="mx-auto w-full max-w-lg overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <div className="mb-4 flex items-center justify-between">
                  <Sheet.Title>More</Sheet.Title>
                  <Sheet.Close
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-secondary hover:bg-muted hover:text-foreground"
                    aria-label="Close More menu"
                  >
                    <X size={18} aria-hidden />
                  </Sheet.Close>
                </div>
                <nav aria-label="More navigation" className="grid gap-1">
                  {renderNavItems(moreNav, () => setMoreOpen(false))}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setSupportOpen(true);
                    }}
                    className={linkClass(false)}
                  >
                    <MessageCircle size={16} className="shrink-0 text-text-muted" />
                    <span>Support chat</span>
                  </button>
                </nav>
              </Sheet.Content>
            </Sheet.Popup>
          </Sheet.Viewport>
        </Sheet.Portal>
      </Sheet.Root>

      <SupportBubble
        userEmail={userEmail}
        orgName={orgName}
        open={supportOpen}
        onOpenChange={setSupportOpen}
        hideTriggerOnMobile
      />
    </div>
  );
}