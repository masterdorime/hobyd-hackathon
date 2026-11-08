import { NextResponse } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { getOrderForWinner } from "@/lib/server/orders";
import { expireOrderIfDue, markOrderPaid } from "@/lib/server/order-transitions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await getOrderForWinner(id, user.id);
    if (!result?.order) {
      return apiError("NOT_FOUND");
    }
    if (result.order.status !== "pending" || (await expireOrderIfDue(id)).changed) {
      return apiError("CLOSED");
    }

    const order = await markOrderPaid(id);
    return NextResponse.json({ status: order.status, paid_at: order.paid_at });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof Error && error.message === "TERMINAL_ORDER_STATE") {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
