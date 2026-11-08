import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getRequiredEnv } from "@/lib/server/config";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot write cookies; proxy refreshes them.
          }
        },
      },
    },
  );
}
