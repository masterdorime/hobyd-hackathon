import { describe, expect, it } from "vitest";

import {
  mapMidtransStatus,
  verifyMidtransSignature,
} from "../lib/midtrans-notification";

const validNotification = {
  order_id: "order-123",
  status_code: "200",
  gross_amount: "2450000.00",
  signature_key: "3c7ff171dcd440609be21559d8435f6543dda8f710a35255fdebab41a59337c7fe04bd71b28df4670a755eb206fb6dc0bd66634fb1ed7332793dec6d35c8223e",
  transaction_status: "settlement",
};

describe("Midtrans notification security", () => {
  it("accepts the exact provider signature and rejects mutation", () => {
    expect(verifyMidtransSignature(validNotification, "Mid-server-test")).toBe(true);
    expect(verifyMidtransSignature(
      { ...validNotification, gross_amount: "1.00" }, "Mid-server-test",
    )).toBe(false);
    expect(verifyMidtransSignature(
      { ...validNotification, signature_key: `${validNotification.signature_key.slice(0, -1)}0` },
      "Mid-server-test",
    )).toBe(false);
  });

  it.each([
    [undefined],
    [{}],
    [{ ...validNotification, signature_key: "not-a-sha512" }],
  ])("rejects malformed payload without reading a hash", (payload) => {
    expect(verifyMidtransSignature(payload, "Mid-server-test")).toBe(false);
  });

  it.each([
    [{ ...validNotification, transaction_status: "settlement" }, "paid"],
    [{ ...validNotification, transaction_status: "capture", fraud_status: "accept" }, "paid"],
    [{ ...validNotification, transaction_status: "capture", fraud_status: "challenge" }, "pending"],
    [{ ...validNotification, transaction_status: "expire" }, "expired"],
    [{ ...validNotification, transaction_status: "pending" }, "pending"],
    [{ ...validNotification, transaction_status: "deny" }, "pending"],
    [{ ...validNotification, transaction_status: "unknown-future-status" }, "ignore"],
    [{ bad: "body" }, "ignore"],
  ] as const)("maps status to %s", (payload, expected) => {
    expect(mapMidtransStatus(payload)).toBe(expected);
  });
});
