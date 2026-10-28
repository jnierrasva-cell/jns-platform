import { readFile } from "node:fs/promises";

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

let localEnv = "";
try {
  localEnv = await readFile(new URL("../.env.local", import.meta.url), "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const localValues = new Map();
for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match) continue;

  const value = match[2].replace(/^(['"])(.*)\1$/, "$2").trim();
  localValues.set(match[1], value);
}

const missing = requiredVariables.filter(
  (name) => !(process.env[name]?.trim() || localValues.get(name)),
);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const name of missing) console.error(`- ${name}`);
  process.exitCode = 1;
} else {
  console.log("Required Supabase and support-email environment variables are set.");
  console.log("This checks presence only, not connectivity or provider-side verification.");
}
