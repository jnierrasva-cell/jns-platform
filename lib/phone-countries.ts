export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

/** Curated list — expand anytime */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { iso: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { iso: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { iso: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { iso: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { iso: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
];

const TZ_TO_ISO: Record<string, string> = {
  "Asia/Manila": "PH",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Europe/London": "GB",
  "Asia/Singapore": "SG",
  "Asia/Dubai": "AE",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Kolkata": "IN",
  "Pacific/Auckland": "NZ",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Riyadh": "SA",
};

export function getDefaultCountryIso(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_TO_ISO[tz] ?? "US";
  } catch {
    return "US";
  }
}

export function getCountryByIso(iso: string) {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) ?? PHONE_COUNTRIES[0];
}

/** Split stored E.164-ish value into country + national number */
export function splitPhone(full: string | null | undefined): {
  iso: string;
  national: string;
} {
  const raw = (full ?? "").replace(/[^\d+]/g, "");
  if (!raw) {
    return { iso: getDefaultCountryIso(), national: "" };
  }

  // Longest dial match first
  const sorted = [...PHONE_COUNTRIES].sort(
    (a, b) => b.dial.length - a.dial.length,
  );
  for (const c of sorted) {
    if (raw.startsWith(c.dial)) {
      return { iso: c.iso, national: raw.slice(c.dial.length) };
    }
  }

  if (raw.startsWith("+")) {
    return { iso: getDefaultCountryIso(), national: raw.replace(/^\+/, "") };
  }

  return { iso: getDefaultCountryIso(), national: raw };
}

export function joinPhone(iso: string, national: string) {
  const country = getCountryByIso(iso);
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  return `${country.dial}${digits}`;
}