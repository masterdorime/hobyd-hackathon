import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { startItemForOwner } from "@/lib/server/items";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await startItemForOwner(id, user.id));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return apiError("NOT_FOUND");
    }
    if (error instanceof Error && ["ITEM_NOT_LISTED", "ROOM_NOT_LIVE"].includes(error.message)) {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
