import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, isSellerEmail, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { getOrderForPayment, getOrderForWinner } from "@/lib/server/orders";
import { expireOrderIfDue } from "@/lib/server/order-transitions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = isSellerEmail(user.email)
      ? await getOrderForPayment(id)
      : await getOrderForWinner(id, user.id);
    if (!result?.order) {
      return apiError("NOT_FOUND");
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
