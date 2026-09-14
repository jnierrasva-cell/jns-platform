const ARKETA_BASE =
  "https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0";

export type ArketaClass = {
  id: string;
  name: string;
  start_time: string;
  duration: number; // minutes
  location_id?: string;
  canceled?: boolean;
  deleted?: boolean;
  instructor_name?: string | null;
  description?: string | null;
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
  startDate: string; // YYYY-MM-DD or ISO
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