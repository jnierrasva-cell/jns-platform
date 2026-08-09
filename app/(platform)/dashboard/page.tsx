import QuickAction from "@/components/dashboard/quick-action";
import StatCard from "@/components/dashboard/stat-card";

export default function DashboardPage() {
  return (
    <main className="flex-1 p-8">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          JNS PLATFORM
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Good Morning, Pat 👋
        </h1>

        <p className="mt-3 max-w-xl text-slate-600">
          Build once. Improve continuously.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Clients"
          value="0"
          subtitle="No active clients yet"
        />

        <StatCard
          title="Projects"
          value="1"
          subtitle="JNS Platform"
        />

        <StatCard
          title="Automations"
          value="0"
          subtitle="Ready to build"
        />

        <StatCard
          title="Tasks Today"
          value="0"
          subtitle="Nothing scheduled"
        />
      </div>

      <div className="mt-12">
        <h2 className="mb-5 text-xl font-semibold">
          Quick Actions
        </h2>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            title="Inbox Automation"
            description="Manage email workflows"
          />

          <QuickAction
            title="CRM"
            description="Customer relationship management"
          />

          <QuickAction
            title="Lead Generation"
            description="Find and qualify prospects"
          />

          <QuickAction
            title="Analytics"
            description="View business insights"
          />
        </div>
      </div>
    </main>
  );
}