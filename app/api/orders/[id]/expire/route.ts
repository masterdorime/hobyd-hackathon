import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, AuthorizationError, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { getOrderForPayment } from "@/lib/server/orders";
import { getRoom } from "@/lib/server/rooms";
import { expireOrderIfDue } from "@/lib/server/order-transitions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await getOrderForPayment(id);
    if (!result?.order) {
      return apiError("NOT_FOUND");
    }
    const room = await getRoom(result.item.room_id);
    if (result.order.winner !== user.id && room?.owner_id !== user.id) {
      throw new AuthorizationError("FORBIDDEN");
    }

    const transition = await expireOrderIfDue(id, Date.now());
    return NextResponse.json({ changed: transition.changed, status: transition.status });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return apiError("NOT_FOUND");
    }
    if (error instanceof Error && error.message === "TERMINAL_ORDER_STATE") {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
