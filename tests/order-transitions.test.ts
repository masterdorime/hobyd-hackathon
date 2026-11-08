import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  expireOrderIfDue,
  markOrderPaid,
} from "../lib/server/order-transitions";
import type { Order } from "../lib/types";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), from: vi.fn(), select: vi.fn(), update: vi.fn() }));
vi.mock("../lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

const NOW = Date.parse("2026-11-08T00:05:00.000Z");
const order: Order = {
  id: "order-1",
  item_id: "item-1",
  winner: "winner-1",
  status: "pending",
  created_at: "2026-11-08T00:00:00.000Z",
  paid_at: null,
};
let readOrder: Partial<Order> | null;

beforeEach(() => {
  readOrder = order;
  vi.restoreAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.from.mockReturnValue({
    select: mocks.select,
    update: mocks.update,
  });
  mocks.select.mockReturnValue({
    eq: () => ({
      maybeSingle: async () => ({ data: readOrder, error: null }),
    }),
  });
  mocks.update.mockImplementation((values: Partial<Order>) => ({
    eq: () => ({
      eq: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: readOrder?.status === "pending" ? { ...readOrder, ...values } : null,
            error: null,
          }),
        }),
      }),
    }),
  }));
  mocks.createAdminClient.mockReturnValue({ from: mocks.from });
});

describe("pending-only order transitions", () => {
  it("marks pending paid with server paid_at", async () => {
    await expect(markOrderPaid(order.id, NOW)).resolves.toMatchObject({ status: "paid" });

    expect(mocks.update).toHaveBeenCalledWith({ status: "paid", paid_at: new Date(NOW).toISOString() });
  });

  it("expires a pending order at 300 seconds", async () => {
    await expect(expireOrderIfDue(order.id, NOW)).resolves.toMatchObject({ status: "expired", changed: true });

    expect(mocks.update).toHaveBeenCalledWith({ status: "expired" });
    expect(mocks.update.mock.results[0].value?.eq).toBeDefined();
  });

  it("does not expire early or from paid state", async () => {
    await expect(expireOrderIfDue(order.id, NOW - 1000)).resolves.toMatchObject({ changed: false });
    expect(mocks.update).not.toHaveBeenCalled();

    readOrder = { ...order, status: "paid" };
    await expect(expireOrderIfDue(order.id, NOW + 60_000)).resolves.toMatchObject({ changed: false, status: "paid" });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not let an expired order become paid", async () => {
    readOrder = { ...order, status: "expired" };

    await expect(markOrderPaid(order.id, NOW)).rejects.toThrow("TERMINAL_ORDER_STATE");
    expect(mocks.update).toHaveBeenCalledWith({ status: "paid", paid_at: new Date(NOW).toISOString() });
  });
});
