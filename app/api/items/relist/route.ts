import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { relistExpiredItem } from "@/lib/server/items";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.itemId !== "string" || !UUID_PATTERN.test(body.itemId)) {
      return apiError("INVALID_INPUT");
    }

    return NextResponse.json(await relistExpiredItem(body.itemId), { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof Error && error.message === "RELIST_NOT_ALLOWED") {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
