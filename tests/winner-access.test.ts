import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrderByItemForWinner,
  getOrderForWinner,
} from "../lib/server/orders";
import { AuthorizationError } from "../lib/server/auth";
import type { Item, Order } from "../lib/types";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), from: vi.fn() }));
vi.mock("../lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

const order: Order = {
  id: "00000000-0000-4000-8000-000000000301",
  item_id: "00000000-0000-4000-8000-000000000101",
  winner: "winner-user-id",
  status: "pending",
  created_at: "2026-11-08T00:00:00.000Z",
  paid_at: null,
};
const item: Item = {
  id: order.item_id,
  room_id: "00000000-0000-4000-8000-000000000001",
  title: "Winner lot",
  img_url: "https://example.com/item.png",
  start_price: 1000000,
  current_price: 1500000,
  ends_at: "2026-11-08T00:10:00.000Z",
  winner: order.winner,
  extensions_used: 0,
  status: "closed",
  created_at: "2026-11-08T00:00:00.000Z",
};
let orderResult: Order | null;
let itemResult: Item | null;

beforeEach(() => {
  orderResult = order;
  itemResult = item;
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === "orders" ? orderResult : itemResult,
          error: null,
        }),
      }),
    }),
  }));
  mocks.createAdminClient.mockReturnValue({ from: mocks.from });
});

describe("winner-only order reads", () => {
  it("returns the owned order and item", async () => {
    await expect(getOrderByItemForWinner(item.id, order.winner)).resolves.toEqual({
      order,
      item,
    });
    await expect(getOrderForWinner(order.id, order.winner)).resolves.toEqual({
      order,
      item,
    });
  });

  it("rejects a different user for both item and order reads", async () => {
    await expect(getOrderByItemForWinner(item.id, "another-user")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(getOrderForWinner(order.id, "another-user")).rejects.toBeInstanceOf(AuthorizationError);
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });

  it("returns a closed item without an order for the no-winner UI", async () => {
    orderResult = null;

    await expect(getOrderByItemForWinner(item.id, order.winner)).resolves.toEqual({
      order: null,
      item,
    });
  });

  it("returns null for an unknown item or order", async () => {
    itemResult = null;
    orderResult = null;

    await expect(getOrderByItemForWinner("missing", "user")).resolves.toBeNull();
    await expect(getOrderForWinner("missing", "user")).resolves.toBeNull();
  });
});
