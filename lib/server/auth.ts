import type { User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";
import { apiError } from "./http";

export type AuthorizationErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

export class AuthorizationError extends Error {
  constructor(public readonly code: AuthorizationErrorCode) {
    super(code);
    this.name = "AuthorizationError";
  }
}

export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthorizationError) {
    return apiError(error.code);
  }
  return null;
}

export function isSellerEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const allowlist = (process.env.SELLER_ALLOWLIST ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(normalized);
}

export async function requireUser(): Promise<User> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthorizationError("UNAUTHORIZED");
  }
  return user;
}

export async function requireSeller(): Promise<User> {
  const user = await requireUser();
  if (!isSellerEmail(user.email)) {
    throw new AuthorizationError("FORBIDDEN");
  }
  return user;
}
