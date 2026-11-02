import { seedSupabase } from "../src/lib/db";

seedSupabase()
  .then(() => console.log("Seeded Supabase."))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
