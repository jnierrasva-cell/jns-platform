const ARKETA_BASE =
  "https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0";

export type ArketaClass = {
  id: string;
  name: string;
  start_time: string;
  duration: number;
  location_id?: string;
  canceled?: boolean;
  deleted?: boolean;
  instructor_name?: string | null;
  description?: string | null;
  /** Not in official docs — capture if API sends them */
  instructor_email?: string | null;
  instructor_emails?: string[] | null;
  instructors?: Array<{
    name?: string;
    email?: string;
  }> | null;
};

type ListClassesResponse = {
  items?: ArketaClass[];
  pagination?: {
    hasMore?: boolean;
    nextStartAfterId?: string | null;
  };
};

export async function fetchArketaClasses(input: {
  partnerId: string;
  apiKey: string;
  startDate: string;
  endDate: string;
}): Promise<ArketaClass[]> {
  const all: ArketaClass[] = [];
  let startAfter: string | null = null;
  let guard = 0;

  do {
    const url = new URL(
      `${ARKETA_BASE}/${encodeURIComponent(input.partnerId)}/classes`,
    );
    url.searchParams.set("start_date", input.startDate);
    url.searchParams.set("end_date", input.endDate);
    if (startAfter) url.searchParams.set("start_after", startAfter);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "X-API-Key": input.apiKey,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Arketa classes ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as ListClassesResponse;
    const items = json.items ?? [];
    all.push(...items);

    const hasMore = Boolean(json.pagination?.hasMore);
    startAfter = hasMore
      ? (json.pagination?.nextStartAfterId ?? null)
      : null;
    guard += 1;
  } while (startAfter && guard < 50);

  return all;
}

/** Resolve guest emails: API fields first, then name→email map. */
export function resolveInstructorEmails(
  cls: ArketaClass,
  nameToEmail: Record<string, string>,
): string[] {
  const emails = new Set<string>();

  const push = (raw?: string | null) => {
    const e = raw?.trim().toLowerCase();
    if (e && e.includes("@")) emails.add(e);
  };

  push(cls.instructor_email);
  for (const e of cls.instructor_emails ?? []) push(e);
  for (const inst of cls.instructors ?? []) push(inst.email);

  const name = cls.instructor_name?.trim();
  if (name) {
    const key = name.toLowerCase();
    if (nameToEmail[key]) push(nameToEmail[key]);
    // also try without extra spaces
    const compact = key.replace(/\s+/g, " ");
    if (nameToEmail[compact]) push(nameToEmail[compact]);
  }

  return Array.from(emails);
}
