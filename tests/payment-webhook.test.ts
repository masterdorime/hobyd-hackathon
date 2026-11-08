import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as webhook } from "../app/api/orders/webhook/route";
import { POST as mockConfirm } from "../app/api/orders/[id]/mock-confirm/route";
import { POST as expireOrder } from "../app/api/orders/[id]/expire/route";
import type { Item, Order } from "../lib/types";

const mocks = vi.hoisted(() => ({
  getOrderForPayment: vi.fn(),
  getOrderForWinner: vi.fn(),
  requireUser: vi.fn(),
  markOrderPaid: vi.fn(),
  expireOrderIfDue: vi.fn(),
}));
vi.mock("../lib/server/orders", () => ({
  getOrderForPayment: mocks.getOrderForPayment,
  getOrderForWinner: mocks.getOrderForWinner,
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/order-transitions", () => ({
  markOrderPaid: mocks.markOrderPaid,
  expireOrderIfDue: mocks.expireOrderIfDue,
}));

const KEY = "Mid-server-test";
const NOW = Date.parse("2026-11-08T00:05:00.000Z");
const order: Order = {
  id: "order-123",
  item_id: "item-123",
  winner: "winner-user-id",
  status: "pending",
  created_at: "2026-11-08T00:00:00.000Z",
  paid_at: null,
};
const item: Item = {
  id: order.item_id,
  room_id: "room-001",
  title: "Webhook lot",
  img_url: "https://example.com/item.png",
  start_price: 2000000,
  current_price: 2450000,
  ends_at: "2026-11-08T00:02:00.000Z",
  winner: order.winner,
  extensions_used: 0,
  status: "closed",
  created_at: "2026-11-08T00:00:00.000Z",
};

function notification(overrides: Record<string, string> = {}) {
  const payload: Record<string, string> = {
    order_id: order.id,
    status_code: "200",
    gross_amount: "2450000.00",
    transaction_status: "settlement",
    payment_type: "qris",
    ...overrides,
  };
  if (!payload.signature_key) {
    payload.signature_key = createHash("sha512")
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${KEY}`)
      .digest("hex");
  }
  return payload;
}

function call(handler: (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>, body: unknown, id = order.id) {
  return handler(new NextRequest(`http://localhost/api/orders/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.MIDTRANS_SERVER_KEY = KEY;
  mocks.getOrderForPayment.mockResolvedValue({ order, item });
  mocks.getOrderForWinner.mockResolvedValue({ order, item });
  mocks.requireUser.mockResolvedValue({ id: order.winner });
  mocks.markOrderPaid.mockResolvedValue({ ...order, status: "paid" });
  mocks.expireOrderIfDue.mockResolvedValue({ changed: false, status: "pending" });
});

describe("Midtrans webhook", () => {
  it("applies a valid signed settlement to the local pending order", async () => {
    const response = await call(webhook, notification());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "paid" });
    expect(mocks.markOrderPaid).toHaveBeenCalledWith(order.id, NOW);
  });

  it.each([
    ["bad signature", { signature_key: "0".repeat(128) }],
    ["wrong local amount", { gross_amount: "1.00" }],
    ["wrong payment type", { payment_type: "gopay" }],
  ])("rejects %s without writing", async (_case, override) => {
    const response = await call(webhook, notification(override));

    expect(response.status).toBe(400);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
    expect(mocks.expireOrderIfDue).not.toHaveBeenCalled();
  });

  it("does not duplicate an effective transition for repeated notifications", async () => {
    mocks.markOrderPaid
      .mockResolvedValueOnce({ ...order, status: "paid" })
      .mockRejectedValueOnce(new Error("TERMINAL_ORDER_STATE"));

    const first = await call(webhook, notification());
    const second = await call(webhook, notification());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.markOrderPaid).toHaveBeenCalledTimes(2);
    expect(mocks.expireOrderIfDue).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON once without an order write", async () => {
    const response = await call(webhook, "{broken-json");
    expect(response.status).toBe(400);
    expect(mocks.getOrderForPayment).not.toHaveBeenCalled();
  });
});

describe("mock confirm and expiry", () => {
  it("does not mock-confirm an expired order", async () => {
    mocks.getOrderForWinner.mockResolvedValue({
      order: { ...order, status: "expired" },
      item,
    });

    const response = await call(mockConfirm, "", order.id);

    expect(response.status).toBe(409);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
  });

  it("does not mock-confirm after the real deadline has elapsed", async () => {
    mocks.expireOrderIfDue.mockResolvedValue({ changed: true, status: "expired" });

    const response = await call(mockConfirm, "", order.id);

    expect(response.status).toBe(409);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
  });

  it("does not expire an order before its server deadline", async () => {
    const response = await call(expireOrder, "", order.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ changed: false, status: "pending" });
    expect(mocks.expireOrderIfDue).toHaveBeenCalledWith(order.id, NOW);
  });
});
