import { NextResponse, type NextRequest } from "next/server";

import {
  isMidtransNotification,
  mapMidtransStatus,
  verifyMidtransSignature,
} from "@/lib/midtrans-notification";
import { getRequiredEnv } from "@/lib/server/config";
import { apiError } from "@/lib/server/http";
import { midtransAmountMatches } from "@/lib/server/midtrans";
import { getOrderForPayment } from "@/lib/server/orders";
import { expireOrderIfDue, markOrderPaid } from "@/lib/server/order-transitions";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return apiError("INVALID_INPUT");
  }

  if (!isMidtransNotification(payload) ||
      !verifyMidtransSignature(payload, getRequiredEnv("MIDTRANS_SERVER_KEY")) ||
      payload.payment_type !== "qris") {
    return apiError("INVALID_INPUT");
  }

  try {
    const now = Date.now();
    const result = await getOrderForPayment(payload.order_id);
    if (!result?.order || result.item.current_price <= 0) {
      return apiError("NOT_FOUND");
    }
    if (!midtransAmountMatches(payload.gross_amount, result.item.current_price)) {
      return apiError("INVALID_INPUT");
    }

    const next = mapMidtransStatus(payload);
    switch (next) {
      case "paid":
        await markOrderPaid(result.order.id, now);
        break;
      case "expired":
        await expireOrderIfDue(result.order.id, now);
        break;
      default:
        return NextResponse.json({ status: "pending" });
    }
    return NextResponse.json({ status: next });
  } catch (error) {
    if (error instanceof Error && error.message === "TERMINAL_ORDER_STATE") {
      const result = await getOrderForPayment(payload.order_id);
      return NextResponse.json({ status: result?.order?.status ?? "pending" });
    }
    return apiError("UPSTREAM_ERROR");
  }
}
