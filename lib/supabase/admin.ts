import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/server/config";

export function createAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
