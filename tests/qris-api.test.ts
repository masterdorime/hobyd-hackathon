import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getQris } from "../app/api/orders/[id]/qris/route";
import { AuthorizationError } from "../lib/server/auth";
import {
  createOrResumeQris,
  midtransAmountMatches,
} from "../lib/server/midtrans";
import type { Item, Order } from "../lib/types";

const NOW = Date.parse("2026-11-08T00:05:00.000Z");
const ITEM: Item = {
  id: "00000000-0000-4000-8000-000000000101",
  room_id: "00000000-0000-4000-8000-000000000001",
  title: "Paid lot",
  img_url: "https://example.com/item.png",
  start_price: 1000000,
  current_price: 2450000,
  ends_at: "2026-11-08T00:02:00.000Z",
  winner: "winner-user-id",
  extensions_used: 0,
  status: "closed",
  created_at: "2026-11-08T00:00:00.000Z",
};
const ORDER: Order & { midtrans_transaction_id?: string; qris_action_url?: string } = {
  id: "00000000-0000-4000-8000-000000000301",
  item_id: ITEM.id,
  winner: ITEM.winner!,
  status: "pending",
  created_at: "2026-11-08T00:05:00.000Z",
  paid_at: null,
};
const payload = {
  transaction_id: "transaction-123",
  actions: [{ name: "generate-qr-code", url: "https://example.com/qr.png" }],
  transaction_status: "pending",
};

const gateway = {
  charge: vi.fn(),
  status: vi.fn(),
};

beforeEach(() => {
  vi.restoreAllMocks();
  gateway.charge.mockReset();
  gateway.status.mockReset();
});

describe("payment amount comparison", () => {
  it("accepts decimal IDR notation but rejects wrong amounts", () => {
    expect(midtransAmountMatches("2450000.00", 2450000)).toBe(true);
    expect(midtransAmountMatches("2450000.0", 2450000)).toBe(true);
    expect(midtransAmountMatches("2450000.01", 2450000)).toBe(false);
    expect(midtransAmountMatches("2450000.001", 2450000)).toBe(false);
    expect(midtransAmountMatches("2750000.00", 2450000)).toBe(false);
    expect(midtransAmountMatches("2450000x", 2450000)).toBe(false);
  });
});

describe("createOrResumeQris", () => {
  it("charges the exact server amount with a five-minute custom expiry", async () => {
    gateway.charge.mockResolvedValue(payload);

    const result = await createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW);

    expect(result.qrUrl).toBe("https://example.com/qr.png");
    expect(gateway.charge).toHaveBeenCalledWith({
      payment_type: "qris",
      transaction_details: { order_id: ORDER.id, gross_amount: 2450000 },
      custom_expiry: { expiry_duration: 300, unit: "second" },
    });
  });

  it("uses remaining seconds for delayed first charge", async () => {
    gateway.charge.mockResolvedValue(payload);

    await createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW + 180_000);

    expect(gateway.charge).toHaveBeenCalledWith(expect.objectContaining({
      custom_expiry: { expiry_duration: 120, unit: "second" },
    }));
  });

  it("rejects sub-20-second charge attempts without contacting Midtrans", async () => {
    await expect(createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW + 299_000))
      .rejects.toThrow("PAYMENT_WINDOW_TOO_SHORT");
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it("recovers duplicate order 409 with status and never charges a second time", async () => {
    gateway.charge.mockRejectedValue({ httpStatusCode: 409 });
    gateway.status.mockResolvedValue(payload);

    const result = await createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW);

    expect(result.qrUrl).toBe("https://example.com/qr.png");
    expect(result.transactionId).toBe("transaction-123");
    expect(gateway.charge).toHaveBeenCalledTimes(1);
    expect(gateway.status).toHaveBeenCalledWith(ORDER.id);
  });

  it("checks status before reusing the saved QR action", async () => {
    gateway.status.mockResolvedValue(payload);

    const result = await createOrResumeQris({
      ...ORDER,
      midtrans_transaction_id: "transaction-123",
      qris_action_url: "https://example.com/qr.png",
    }, ITEM.current_price, gateway, NOW);

    expect(result.qrUrl).toBe("https://example.com/qr.png");
    expect(gateway.status).toHaveBeenCalledWith(ORDER.id);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it("recovers a 406 order conflict using status without another charge", async () => {
    gateway.charge.mockRejectedValue({ ApiResponse: { status_code: 406 } });
    gateway.status.mockResolvedValue(payload);

    const result = await createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW);

    expect(result.qrUrl).toBe("https://example.com/qr.png");
    expect(gateway.charge).toHaveBeenCalledTimes(1);
    expect(gateway.status).toHaveBeenCalledWith(ORDER.id);
  });

  it("retries a transient 406 status conflict without creating a second charge", async () => {
    gateway.status
      .mockRejectedValueOnce({ ApiResponse: { status_code: 406 } })
      .mockResolvedValueOnce(payload);

    const result = await createOrResumeQris({
      ...ORDER,
      midtrans_transaction_id: "transaction-123",
      qris_action_url: "https://example.com/qr.png",
    }, ITEM.current_price, gateway, NOW);

    expect(result.qrUrl).toBe("https://example.com/qr.png");
    expect(gateway.status).toHaveBeenCalledTimes(2);
    expect(gateway.charge).not.toHaveBeenCalled();
  });

  it("maps missing generate-qr-code action to an upstream error", async () => {
    gateway.charge.mockResolvedValue({ ...payload, actions: [] });

    await expect(createOrResumeQris(ORDER, ITEM.current_price, gateway, NOW))
      .rejects.toThrow("QR_ACTION_MISSING");
  });
});

const routeMocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOrderForWinner: vi.fn(),
  createAdminClient: vi.fn(),
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: routeMocks.requireUser,
}));
vi.mock("../lib/server/orders", () => ({ getOrderForWinner: routeMocks.getOrderForWinner }));
vi.mock("../lib/supabase/admin", () => ({ createAdminClient: routeMocks.createAdminClient }));

describe("GET /api/orders/[id]/qris ownership", () => {
  it("returns 403 to a non-winner without a charge", async () => {
    routeMocks.requireUser.mockResolvedValue({ id: "other-user" });
    routeMocks.getOrderForWinner.mockRejectedValue(new AuthorizationError("FORBIDDEN"));

    const response = await getQris(new NextRequest("http://localhost/api/orders/order-id/qris"), {
      params: Promise.resolve({ id: ORDER.id }),
    });

    expect(response.status).toBe(403);
    expect(gateway.charge).not.toHaveBeenCalled();
  });
});
