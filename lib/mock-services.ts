export type ServiceStatus = "available" | "active";

export type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ServiceStatus;
};

/** Live automations only — no “coming soon” switches. */
export const mockServices: Service[] = [
  {
    id: "email-auto-ack",
    name: "Inquiry auto-reply",
    description:
      "When a matching email rule fires, sends a reply from your connected Google account using a template. Unmatched mail stays out of contacts until you decide.",
    category: "Email",
    status: "available",
  },
  {
    id: "sms-reminders",
    name: "Booking SMS reminders",
    description:
      "Texts clients before a scheduled booking. Requires Twilio in Integrations and a phone on the contact.",
    category: "SMS",
    status: "available",
  },
];