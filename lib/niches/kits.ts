import type { FormField } from "@/lib/forms/fields";

export type NicheKey =
  | "studio"
  | "coach"
  | "agency"
  | "general";

export type PipelineStageDef = {
  name: string;
  slug: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

export type NicheFormDef = {
  name: string;
  headline?: string;
  description?: string;
  success_message?: string;
  fields: FormField[];
};

export type NicheKit = {
  key: NicheKey;
  label: string;
  description: string;
  contactLabel: string;
  contactLabelPlural: string;
  pipeline: PipelineStageDef[];
  forms: NicheFormDef[];
  /** Optional reply template bodies keyed by purpose */
  replyTemplates?: { name: string; subject: string; body: string }[];
};

const baseFields = (
  extra: FormField[] = [],
): FormField[] => [
  {
    id: "name",
    label: "Full name",
    type: "text",
    required: true,
    enabled: true,
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    enabled: true,
  },
  {
    id: "phone",
    label: "Phone",
    type: "phone",
    required: false,
    enabled: true,
  },
  ...extra,
];

export const NICHE_KITS: Record<NicheKey, NicheKit> = {
  studio: {
    key: "studio",
    label: "Studio or gym",
    description: "Classes, trials, and memberships",
    contactLabel: "Member",
    contactLabelPlural: "Members",
    pipeline: [
      { name: "New inquiry", slug: "new-inquiry", position: 0, is_won: false, is_lost: false },
      { name: "Trial booked", slug: "trial-booked", position: 1, is_won: false, is_lost: false },
      { name: "Trial attended", slug: "trial-attended", position: 2, is_won: false, is_lost: false },
      { name: "Offer sent", slug: "offer-sent", position: 3, is_won: false, is_lost: false },
      { name: "Member", slug: "member", position: 4, is_won: true, is_lost: false },
      { name: "Lapsed", slug: "lapsed", position: 5, is_won: false, is_lost: true },
    ],
    forms: [
      {
        name: "Trial class request",
        headline: "Book a trial class",
        description: "Tell us a bit about you and we will confirm a time.",
        success_message: "Thanks — we received your trial request and will confirm shortly.",
        fields: baseFields([
          {
            id: "preferred_class",
            label: "Preferred class or time",
            type: "text",
            required: false,
            enabled: true,
          },
          {
            id: "message",
            label: "Anything we should know?",
            type: "textarea",
            required: false,
            enabled: true,
          },
        ]),
      },
      {
        name: "Waiver / intake",
        headline: "Studio intake",
        success_message: "Thanks — your form was received.",
        fields: baseFields([
          {
            id: "emergency_contact",
            label: "Emergency contact",
            type: "text",
            required: false,
            enabled: true,
          },
          {
            id: "health_notes",
            label: "Health notes or injuries",
            type: "textarea",
            required: false,
            enabled: true,
          },
        ]),
      },
    ],
    replyTemplates: [
      {
        name: "Instant reply — inquiry",
        subject: "Thanks for reaching out",
        body: "Hi {{first_name}},\n\nThanks for your interest. We will get back to you shortly with trial options.\n\n— {{business_name}}",
      },
    ],
  },
  coach: {
    key: "coach",
    label: "Coach or consultant",
    description: "Discovery calls, proposals, and retainers",
    contactLabel: "Client",
    contactLabelPlural: "Clients",
    pipeline: [
      { name: "Lead", slug: "lead", position: 0, is_won: false, is_lost: false },
      { name: "Discovery call booked", slug: "discovery-booked", position: 1, is_won: false, is_lost: false },
      { name: "Proposal sent", slug: "proposal-sent", position: 2, is_won: false, is_lost: false },
      { name: "Active client", slug: "active-client", position: 3, is_won: true, is_lost: false },
      { name: "Alumni", slug: "alumni", position: 4, is_won: false, is_lost: true },
    ],
    forms: [
      {
        name: "Discovery call application",
        headline: "Book a discovery call",
        description: "Share a little context so we can make the call useful.",
        success_message: "Thanks — we will confirm your discovery call soon.",
        fields: baseFields([
          {
            id: "goal",
            label: "What are you hoping to achieve?",
            type: "textarea",
            required: true,
            enabled: true,
          },
          {
            id: "timeline",
            label: "Ideal start timeline",
            type: "text",
            required: false,
            enabled: true,
          },
        ]),
      },
    ],
    replyTemplates: [
      {
        name: "Instant reply — lead",
        subject: "Got your message",
        body: "Hi {{first_name}},\n\nThanks for reaching out. I will review your note and follow up about a discovery call.\n\n— {{business_name}}",
      },
    ],
  },
  agency: {
    key: "agency",
    label: "Agency or VA company",
    description: "Audits, proposals, and client onboarding",
    contactLabel: "Client",
    contactLabelPlural: "Clients",
    pipeline: [
      { name: "Lead", slug: "lead", position: 0, is_won: false, is_lost: false },
      { name: "Audit booked", slug: "audit-booked", position: 1, is_won: false, is_lost: false },
      { name: "Proposal sent", slug: "proposal-sent", position: 2, is_won: false, is_lost: false },
      { name: "Onboarding", slug: "onboarding", position: 3, is_won: false, is_lost: false },
      { name: "Active", slug: "active", position: 4, is_won: true, is_lost: false },
    ],
    forms: [
      {
        name: "Intake brief",
        headline: "Project intake",
        description: "Help us understand the work before we jump on a call.",
        success_message: "Thanks — we received your brief and will be in touch.",
        fields: baseFields([
          {
            id: "company",
            label: "Company name",
            type: "text",
            required: false,
            enabled: true,
          },
          {
            id: "scope",
            label: "What do you need help with?",
            type: "textarea",
            required: true,
            enabled: true,
          },
          {
            id: "budget",
            label: "Budget range (optional)",
            type: "text",
            required: false,
            enabled: true,
          },
        ]),
      },
    ],
    replyTemplates: [
      {
        name: "Instant reply — lead",
        subject: "We received your inquiry",
        body: "Hi {{first_name}},\n\nThanks for contacting us. We will review your note and follow up with next steps.\n\n— {{business_name}}",
      },
    ],
  },
  general: {
    key: "general",
    label: "General service business",
    description: "Inquiries, bookings, and repeat clients",
    contactLabel: "Contact",
    contactLabelPlural: "Contacts",
    pipeline: [
      { name: "Lead", slug: "lead", position: 0, is_won: false, is_lost: false },
      { name: "Booked", slug: "booked", position: 1, is_won: false, is_lost: false },
      { name: "Customer", slug: "customer", position: 2, is_won: true, is_lost: false },
      { name: "Inactive", slug: "inactive", position: 3, is_won: false, is_lost: true },
    ],
    forms: [
      {
        name: "Contact form",
        headline: "Get in touch",
        success_message: "Thanks — we received your message and will be in touch.",
        fields: baseFields([
          {
            id: "message",
            label: "Message",
            type: "textarea",
            required: false,
            enabled: true,
          },
        ]),
      },
    ],
  },
};

export const NICHE_OPTIONS: { key: NicheKey; label: string; description: string }[] =
  (Object.keys(NICHE_KITS) as NicheKey[])
    .filter((k) => k !== "general")
    .map((key) => ({
      key,
      label: NICHE_KITS[key].label,
      description: NICHE_KITS[key].description,
    }));

export function isNicheKey(value: unknown): value is NicheKey {
  return (
    value === "studio" ||
    value === "coach" ||
    value === "agency" ||
    value === "general"
  );
}

export function labelMapForKit(kit: NicheKit): Record<string, string> {
  return {
    contact: kit.contactLabel,
    contacts: kit.contactLabelPlural,
    Contact: kit.contactLabel,
    Contacts: kit.contactLabelPlural,
  };
}
