import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { endRoomForOwner, RoomHasActiveItemError } from "@/lib/server/rooms";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return NextResponse.json(await endRoomForOwner(id, user.id));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof RoomHasActiveItemError) return apiError("CLOSED");
    return apiError("UPSTREAM_ERROR");
  }
}
