type LogFields = Record<string, string | number | boolean | null | undefined>;

function serialize(fields?: LogFields) {
  if (!fields) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    parts.push(`${k}=${typeof v === "string" ? JSON.stringify(v) : String(v)}`);
  }
  return parts.length ? ` ${parts.join(" ")}` : "";
}

/** Structured one-line logs for Vercel (searchable by key=value). */
export const log = {
  info(scope: string, message: string, fields?: LogFields) {
    console.log(`[${scope}] ${message}${serialize(fields)}`);
  },
  warn(scope: string, message: string, fields?: LogFields) {
    console.warn(`[${scope}] ${message}${serialize(fields)}`);
  },
  error(scope: string, message: string, fields?: LogFields) {
    console.error(`[${scope}] ${message}${serialize(fields)}`);
  },
};
