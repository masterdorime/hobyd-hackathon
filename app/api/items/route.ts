import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, AuthorizationError, requireUser } from "@/lib/server/auth";
import { getRoom } from "@/lib/server/rooms";
import {
  createItemForSeller,
  listItems,
  RoomNotLiveError,
} from "@/lib/server/items";
import { apiError } from "@/lib/server/http";
import {
  ItemValidationError,
  parseItemInput,
} from "@/lib/validation/item";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("room_id");
  if (!roomId) {
    return apiError("INVALID_INPUT");
  }

  try {
    return NextResponse.json(await listItems(roomId));
  } catch {
    return apiError("UPSTREAM_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const input = parseItemInput(await request.formData());
    const room = await getRoom(input.roomId);
    if (!room || room.owner_id !== user.id) {
      throw new AuthorizationError("FORBIDDEN");
    }
    if (room.status !== "live") {
      throw new RoomNotLiveError();
    }
    const item = await createItemForSeller(user, input);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof ItemValidationError) {
      return apiError("INVALID_INPUT");
    }
    if (error instanceof RoomNotLiveError) {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
