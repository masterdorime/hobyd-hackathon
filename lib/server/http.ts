import { NextResponse } from "next/server";

export const API_ERROR_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CLOSED: 409,
  TOO_LOW: 409,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export function apiError(
  code: ApiErrorCode,
  status: number = API_ERROR_STATUS[code],
): NextResponse {
  return NextResponse.json({ error: code }, { status });
}
