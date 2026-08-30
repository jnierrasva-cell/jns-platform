export type ServiceStatus = "active" | "available" | "coming_soon";

export type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ServiceStatus;
};

// Placeholder catalog. Real data will come from Supabase once auth (Step 2)
// and per-client activation records are wired up.
export const mockServices: Service[] = [
  {
    id: "email-auto-ack",
    name: "Auto-Acknowledgment",
    description:
      "Replies to new inquiries the moment they land, so no lead waits more than a few minutes for a response.",
    category: "Email",
    status: "active",
  },
  {
    id: "email-follow-up",
    name: "Follow-Up Scheduler",
    description:
      "Queues polite check-ins on leads that go quiet, timed so nothing falls through the cracks.",
    category: "Email",
    status: "available",
  },
  {
    id: "lead-intake-sorter",
    name: "Lead Intake Sorter",
    description:
      "Reads incoming inquiries and routes them by class type, location, or urgency before anyone touches them.",
    category: "Lead Management",
    status: "available",
  },
  {
    id: "calendar-booking-sync",
    name: "Booking Sync",
    description:
      "Keeps class schedules, private sessions, and staff calendars pointed at the same source of truth.",
    category: "Calendar",
    status: "coming_soon",
  },
  {
    id: "social-post-scheduler",
    name: "Post Scheduler",
    description:
      "Queues studio updates and class promos across your social accounts on a set cadence.",
    category: "Social Media",
    status: "coming_soon",
  },
  {
    id: "social-comment-reply",
    name: "Comment Auto-Reply",
    description:
      "Responds to common questions in comments and DMs — booking links, hours, pricing — before your team sees them.",
    category: "Social Media",
    status: "coming_soon",
  },
];
