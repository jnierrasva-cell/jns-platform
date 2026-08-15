import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "@/components/navigation/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickAction } from "@/components/dashboard/quick-action";
import { Mail, ListChecks, Clock, Plus } from "lucide-react";

const SERVICES = [
  {
    name: "Email First-Response",
    status: "live" as const,
    category: "Inbox",
    description:
      "Acknowledges new emails the moment they land, using a message you write and control.",
    active: true,
  },
  {
    name: "Lead Intake Sorter",
    status: "wip" as const,
    category: "Inbox",
    description:
      "Reads incoming inquiries and routes them by type automatically.",
    active: false,
  },
  {
    name: "Follow-Up Scheduler",
    status: "wip" as const,
    category: "Scheduling",
    description:
      "Queues a follow-up automatically when a thread goes quiet.",
    active: false,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-[#10131a]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar
          title="Overview"
          subtitle="Here's what's running for your account."
        />

        <main className="flex-1 px-6 py-8 space-y-10">
          {/* Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Active automations" value="1" hint="of 3 available" />
            <StatCard label="Emails acknowledged" value="—" hint="tracking starts on activation" />
            <StatCard label="Avg. response time" value="0.4s" />
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="text-sm font-semibold text-[#edeae3] mb-3">
              Quick actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <QuickAction
                label="Edit email template"
                description="Change the wording clients see"
                icon={Mail}
              />
              <QuickAction
                label="Review activated services"
                description="See what's running right now"
                icon={ListChecks}
              />
              <QuickAction
                label="Request a new automation"
                description="Tell us what to build next"
                icon={Plus}
              />
            </div>
          </section>

          {/* Catalog */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#edeae3]">
                Service catalog
              </h2>
              <span className="text-xs text-[#a8a6a0] font-mono">
                {SERVICES.length} available
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SERVICES.map((service) => (
                <div
                  key={service.name}
                  className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-5 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        service.status === "live"
                          ? "bg-[#7fb88f]/10 text-[#7fb88f]"
                          : "bg-[#d9a253]/10 text-[#d9a253]"
                      }`}
                    >
                      {service.status === "live" ? "Live" : "In development"}
                    </span>
                    {service.active && (
                      <span className="flex items-center gap-1.5 text-xs text-[#7fb88f]">
                        <Clock size={12} /> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-[#edeae3] font-medium mb-1.5">
                    {service.name}
                  </h3>
                  <p className="text-sm text-[#a8a6a0] flex-1">
                    {service.description}
                  </p>
                  <button
                    disabled={service.status !== "live"}
                    className={`mt-4 w-full rounded-md py-2 text-sm font-medium transition-colors ${
                      service.active
                        ? "border border-[#2c3140] text-[#a8a6a0] hover:text-[#edeae3] hover:border-[#3a4155]"
                        : service.status === "live"
                        ? "bg-[#d9a253] text-[#10131a] hover:bg-[#e6b167]"
                        : "bg-[#232838] text-[#5a5f6e] cursor-not-allowed"
                    }`}
                  >
                    {service.active
                      ? "Manage"
                      : service.status === "live"
                      ? "Activate"
                      : "Coming soon"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}