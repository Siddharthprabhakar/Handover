// Prints only set/missing and ok/failed. Never prints a value.
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "MODEL_API_KEY", "GMAIL_USER", "GMAIL_APP_PASSWORD", "CRON_SECRET"];
for (const n of names) console.log(`${n.padEnd(32)} ${process.env[n] ? "set" : "missing"}`);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const r = await sb.from("labs").select("id", { count: "exact", head: true });
      console.log(`supabase connection              ${r.error ? `failed (${r.error.message.slice(0, 80)})` : "ok, schema found"}`);
    } catch (e) {
      console.log(`supabase connection              failed (${e instanceof Error ? e.message.slice(0, 80) : "error"})`);
    }
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } }).verify();
      console.log("gmail login                      ok");
    } catch (e) {
      console.log(`gmail login                      failed (${e instanceof Error ? e.message.slice(0, 80) : "error"})`);
    }
  }
}
main();
