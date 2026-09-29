export type ServiceStatus = "active" | "available" | "coming_soon";

export type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ServiceStatus;
};

export const mockServices: Service[] = [
  {
    id: "email-auto-ack",
    name: "Inquiry auto-reply",
    description:
      "Replies when email rules say so — using your templates. Unmatched mail stays out of contacts until you decide.",
    category: "Email",
    status: "available",
  },
  {
    id: "sms-reminders",
    name: "Booking SMS reminders",
    description:
      "Texts clients before a scheduled booking. Uses your Twilio number and your message.",
    category: "SMS",
    status: "available",
  },
  {
    id: "email-follow-up",
    name: "Quiet-lead follow-up",
    description:
      "Scheduled check-ins when a lead goes silent. Coming next — not active yet.",
    category: "Email",
    status: "coming_soon",
  },
  {
    id: "form-thanks",
    name: "Form thank-you email",
    description:
      "Auto email after a form submit, using a template you choose.",
    category: "Forms",
    status: "coming_soon",
  },
];
