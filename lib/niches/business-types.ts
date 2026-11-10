import type { NicheKey } from "@/lib/niches/kits";

/**
 * User-facing business types (onboarding).
 * Kept separate from NicheKey (starter kit id) so we can grow the list
 * without inventing a new product mode per industry.
 */
export type BusinessTypeKey =
  | "appointments"
  | "coaching"
  | "agency"
  | "local_services"
  | "classes_events"
  | "retail_services"
  | "other";

export type BusinessSizeKey = "solo" | "2_5" | "6_20" | "21_plus";

export type BusinessTypeOption = {
  key: BusinessTypeKey;
  label: string;
  description: string;
  /** Which starter kit to apply (pipeline / forms / labels) */
  kit: NicheKey;
};

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  {
    key: "appointments",
    label: "Appointments & bookings",
    description: "Salons, clinics, studios, tutors — time-based clients",
    kit: "studio",
  },
  {
    key: "classes_events",
    label: "Classes, courses, or events",
    description: "Group sessions, workshops, recurring classes",
    kit: "studio",
  },
  {
    key: "coaching",
    label: "Coaching & consulting",
    description: "1:1 or group coaching, advisors, freelancers",
    kit: "coach",
  },
  {
    key: "agency",
    label: "Agency or client services",
    description: "Retainers, projects, and ongoing client work",
    kit: "agency",
  },
  {
    key: "local_services",
    label: "Local or field services",
    description: "Home services, trades, mobile, on-site work",
    kit: "general",
  },
  {
    key: "retail_services",
    label: "Retail with clients or appointments",
    description: "Shops that also book or follow up with customers",
    kit: "general",
  },
  {
    key: "other",
    label: "Other / not sure",
    description: "We’ll start with a flexible setup you can adjust",
    kit: "general",
  },
];

export const BUSINESS_SIZE_OPTIONS: {
  key: BusinessSizeKey;
  label: string;
}[] = [
  { key: "solo", label: "Just me" },
  { key: "2_5", label: "2–5 people" },
  { key: "6_20", label: "6–20 people" },
  { key: "21_plus", label: "21+ people" },
];

const TYPE_SET = new Set(
  BUSINESS_TYPE_OPTIONS.map((o) => o.key),
) as Set<string>;
const SIZE_SET = new Set(
  BUSINESS_SIZE_OPTIONS.map((o) => o.key),
) as Set<string>;

export function isBusinessTypeKey(value: unknown): value is BusinessTypeKey {
  return typeof value === "string" && TYPE_SET.has(value);
}

export function isBusinessSizeKey(value: unknown): value is BusinessSizeKey {
  return typeof value === "string" && SIZE_SET.has(value);
}

export function kitForBusinessType(type: BusinessTypeKey | string): NicheKey {
  const found = BUSINESS_TYPE_OPTIONS.find((o) => o.key === type);
  return found?.kit ?? "general";
}

/** Accept legacy niche keys from older clients if they still post them. */
export function resolveKitFromOnboardingInput(
  businessTypeOrLegacyNiche?: string | null,
): { businessType: BusinessTypeKey; kit: NicheKey } {
  if (isBusinessTypeKey(businessTypeOrLegacyNiche)) {
    return {
      businessType: businessTypeOrLegacyNiche,
      kit: kitForBusinessType(businessTypeOrLegacyNiche),
    };
  }
  // Legacy: studio | coach | agency | general
  if (businessTypeOrLegacyNiche === "studio") {
    return { businessType: "appointments", kit: "studio" };
  }
  if (businessTypeOrLegacyNiche === "coach") {
    return { businessType: "coaching", kit: "coach" };
  }
  if (businessTypeOrLegacyNiche === "agency") {
    return { businessType: "agency", kit: "agency" };
  }
  return { businessType: "other", kit: "general" };
}
