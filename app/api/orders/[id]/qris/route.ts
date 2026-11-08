import { NextResponse } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import {
  createMidtransGateway,
  createOrResumeQris,
  paymentRemainingSeconds,
} from "@/lib/server/midtrans";
import { getOrderForWinner } from "@/lib/server/orders";
import { expireOrderIfDue, markOrderPaid, paymentDeadline } from "@/lib/server/order-transitions";import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
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
    const { order, item } = result;
    if (item.status !== "closed" || !Number.isSafeInteger(item.current_price)) {
      return apiError("CLOSED");
    }

    const now = Date.now();
    const outcome = await createOrResumeQris(
      order,
      item.current_price,
      createMidtransGateway(),
      now,
    );
    if (outcome.status === "paid" && order.status === "pending") {
      await markOrderPaid(id, now);
    } else if (outcome.status === "expired" && order.status === "pending") {
      await expireOrderIfDue(id, now);
    } else if (outcome.status === "pending") {
      const expiry = paymentRemainingSeconds(order, now);
      const admin = createAdminClient();
      const { error } = await admin
        .from("orders")
        .update({
          midtrans_transaction_id: outcome.transactionId,
          qris_action_url: outcome.qrUrl,
          qris_expires_at: new Date(now + expiry * 1000).toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending");
      if (error) {
        return apiError("UPSTREAM_ERROR");
      }
    }

    return NextResponse.json({
      qrUrl: outcome.qrUrl,
      status: outcome.status,
      expiresAt: new Date(paymentDeadline(order)).toISOString(),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof Error && ["PAYMENT_WINDOW_TOO_SHORT", "TERMINAL_ORDER_STATE"].includes(error.message)) {
      return apiError("CLOSED");
    }
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return apiError("NOT_FOUND");
    }
    if (error instanceof Error && error.message.startsWith("Missing required environment variable")) {
      return apiError("UPSTREAM_ERROR", 500);
    }
    return apiError("UPSTREAM_ERROR");
  }
}
