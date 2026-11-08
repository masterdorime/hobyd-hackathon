import { createHash, timingSafeEqual } from "node:crypto";

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isMidtransNotification(value: unknown): value is MidtransNotification {
  if (!isRecord(value)) {
    return false;
  }
  return ["order_id", "status_code", "gross_amount", "signature_key", "transaction_status"]
    .every((key) => typeof value[key] === "string");
}

export function verifyMidtransSignature(payload: unknown, serverKey: string): boolean {
  if (!isMidtransNotification(payload) || !/^[0-9a-f]{128}$/i.test(payload.signature_key)) {
    return false;
  }

  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
    .digest();
  const supplied = Buffer.from(payload.signature_key, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function mapMidtransStatus(payload: unknown): "paid" | "expired" | "pending" | "ignore" {
  if (!isRecord(payload) || typeof payload.transaction_status !== "string") {
    return "ignore";
  }

  switch (payload.transaction_status) {
    case "settlement":
      return "paid";
    case "capture":
      return payload.fraud_status === "accept" ? "paid" : "pending";
    case "expire":
      return "expired";
    case "pending":
    case "deny":
    case "cancel":
      return "pending";
    default:
      return "ignore";
  }
}
