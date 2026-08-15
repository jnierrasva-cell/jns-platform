"use client";

import { LayoutDashboard, Layers, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Services", icon: Layers, href: "/dashboard/services" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-[#2c3140] bg-[#10131a] px-4 py-6">
      <div>
        <div className="px-2 pb-8">
          <span className="font-semibold text-[#edeae3] tracking-tight text-lg">
            JN<span className="text-[#d9a253]">System</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#a8a6a0] hover:bg-[#1b1f29] hover:text-[#edeae3] transition-colors"
            >
              <item.icon size={17} strokeWidth={1.75} />
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#a8a6a0] hover:bg-[#1b1f29] hover:text-[#edeae3] transition-colors">
        <LogOut size={17} strokeWidth={1.75} />
        Log out
      </button>
    </aside>
  );
}