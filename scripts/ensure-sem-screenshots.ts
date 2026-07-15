/**
 * Apply 003_sem_screenshots migration if table is missing.
 * Uses Supabase PostgREST existence check only — DDL must run in SQL editor
 * OR via DATABASE_URL if set.
 *
 * Usage: npx tsx scripts/ensure-sem-screenshots.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("project_sem_screenshots")
    .select("id")
    .limit(1);

  if (!error) {
    console.log("OK: project_sem_screenshots already exists.");
    return;
  }

  console.error("Table missing:", error.message);
  console.error("");
  console.error("Please run this SQL in the Supabase SQL Editor:");
  console.error("─".repeat(48));
  console.log(
    readFileSync(
      resolve(process.cwd(), "supabase/migrations/003_sem_screenshots.sql"),
      "utf8"
    )
  );
  console.error("─".repeat(48));
  process.exit(2);
}

main();
