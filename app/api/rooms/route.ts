import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  getProfileName,
  listLiveRooms,
  RoomAlreadyLiveError,
  startRoomForOwner,
} from "@/lib/server/rooms";
import { parseRoomInput, RoomValidationError } from "@/lib/validation/room";

export async function GET() {
  try {
    return NextResponse.json(await listLiveRooms());
  } catch {
    return apiError("UPSTREAM_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = parseRoomInput(await request.formData());
    const sellerName = await getProfileName(user.id);
    const room = await startRoomForOwner(user.id, sellerName, input);
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof RoomValidationError) return apiError("INVALID_INPUT");
    if (error instanceof RoomAlreadyLiveError) return apiError("CLOSED");
    return apiError("UPSTREAM_ERROR");
  }
}
