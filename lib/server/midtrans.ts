import midtransClient from "midtrans-client";

import { getRequiredEnv } from "./config";
import { mapMidtransStatus } from "../midtrans-notification";
import { paymentDeadline } from "./order-transitions";
import type { Order } from "@/lib/types";

export interface MidtransChargePayload {
  payment_type: "qris";
  transaction_details: { order_id: string; gross_amount: number };
  custom_expiry: { expiry_duration: number; unit: "second" };
}

export interface MidtransGateway {
  charge(payload: MidtransChargePayload): Promise<unknown>;
  status(orderId: string): Promise<unknown>;
}

export interface QrisOutcome {
  qrUrl: string | null;
  status: Order["status"];
  transactionId: string | null;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function errorCode(error: unknown): number | undefined {
  const payload = record(error);
  const response = record(payload.response);
  const responseBody = record(response.data);
  const apiResponse = record(payload.ApiResponse);
  const code = payload.httpStatusCode ?? payload.statusCode ?? payload.status_code ?? response.status ?? responseBody.status_code ?? apiResponse.status_code;
  return typeof code === "number" || typeof code === "string" ? Number(code) : undefined;
}

export function createMidtransGateway(): MidtransGateway {
  const client = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: getRequiredEnv("MIDTRANS_SERVER_KEY"),
    clientKey: getRequiredEnv("MIDTRANS_CLIENT_KEY"),
  });
  return {
    charge: (payload) => client.charge(payload),
    status: (orderId) => client.transaction.status(orderId),
  };
}

export function midtransAmountMatches(grossAmount: string, integerIdr: number): boolean {
  if (!/^\d+(?:\.\d{1,2})?$/.test(grossAmount)) {
    return false;
  }
  const [whole, fraction = ""] = grossAmount.split(".");
  return BigInt(whole) === BigInt(integerIdr) && /^0{0,2}$/.test(fraction);
}

export function paymentRemainingSeconds(order: Order & { qris_expires_at?: string | null }, now: number): number {
  return Math.max(0, Math.floor((paymentDeadline(order) - now) / 1000));
}

async function readMidtransStatus(gateway: MidtransGateway, orderId: string): Promise<unknown> {
  try {
    return await gateway.status(orderId);
  } catch (error) {
    if (errorCode(error) !== 406) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    return gateway.status(orderId);
  }
}

function providerOutcome(payload: unknown, order: Order & { qris_action_url?: string | null }): QrisOutcome {  const data = record(payload);
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const action = actions.map(record).find((candidate) => candidate.name === "generate-qr-code");
  const existingProgress = mapMidtransStatus(data);
  return {
    qrUrl: typeof action?.url === "string" ? action.url : order.qris_action_url ?? null,
    status: existingProgress === "ignore" ? "pending" : existingProgress,
    transactionId: typeof data.transaction_id === "string" ? data.transaction_id : order.midtrans_transaction_id ?? null,
  };
}

export async function createOrResumeQris(
  order: Order & { qris_action_url?: string | null; midtrans_transaction_id?: string | null },
  amount: number,
  gateway: MidtransGateway,
  now: number,
): Promise<QrisOutcome> {
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error("PAYMENT_AMOUNT_INVALID");
  }
  if (order.status !== "pending") {
    return { qrUrl: order.qris_action_url ?? null, status: order.status, transactionId: order.midtrans_transaction_id ?? null };
  }

  const remaining = paymentRemainingSeconds(order, now);
  if (remaining <= 0) {
    return { qrUrl: order.qris_action_url ?? null, status: "expired", transactionId: order.midtrans_transaction_id ?? null };
  }
  if (remaining < 20) {
    throw new Error("PAYMENT_WINDOW_TOO_SHORT");
  }

  if (order.midtrans_transaction_id && order.qris_action_url) {
    return providerOutcome(await readMidtransStatus(gateway, order.id), order);
  }

  const charge: MidtransChargePayload = {
    payment_type: "qris",
    transaction_details: { order_id: order.id, gross_amount: amount },
    custom_expiry: { expiry_duration: remaining, unit: "second" },
  };

  let payload: unknown;
  try {
    payload = await gateway.charge(charge);
  } catch (error) {
    if (![406, 409].includes(errorCode(error) ?? 0)) {
      throw error;
    }
    payload = await readMidtransStatus(gateway, order.id);
  }
  if (!providerOutcome(payload, order).qrUrl) {
    throw new Error("QR_ACTION_MISSING");
  }
  if (record(payload).gross_amount && !midtransAmountMatches(String(record(payload).gross_amount), amount)) {
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }
  return providerOutcome(payload, order);
}
