import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

function pageResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname === "/login" || pathname === "/signup") {
    return NextResponse.next({ request });
  }
  return intlMiddleware(request);
}

function isInvalidSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  return ["refresh_token_not_found", "refresh_token_already_used", "session_expired", "invalid_jwt"].includes(code) || message.includes("invalid refresh token") || message.includes("refresh token already used");
}

export default async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return pageResponse(request);
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(name, value);
        }
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch (error) {
    if (isInvalidSessionError(error)) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Clearing a stale session is best-effort; public reads must still work.
      }
    }
  }
  const response = pageResponse(request);  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  for (const header of CACHE_HEADERS) {
    const value = supabaseResponse.headers.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
