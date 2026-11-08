import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRelistSourceForSeller,
  relistExpiredItem,
} from "../lib/server/items";
import type { Item } from "../lib/types";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAdminClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

const item: Item = {
  id: "00000000-0000-4000-8000-000000000101",
  room_id: "00000000-0000-4000-8000-000000000001",
  title: "Expired lot",
  img_url: "https://example.com/expired.png",
  start_price: 1250000,
  current_price: 1500000,
  ends_at: "2026-11-08T00:02:00.000Z",
  winner: "winner",
  extensions_used: 2,
  status: "closed",
  created_at: "2026-11-08T00:00:00.000Z",
};
let orderStatus = "expired";

beforeEach(() => {
  orderStatus = "expired";
  mocks.requireUser.mockResolvedValue({ id: "seller-id" });
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === "orders" ? { status: orderStatus } : table === "rooms" ? { owner_id: "seller-id" } : item,
          error: null,
        }),
      }),
    }),
  }));
  mocks.rpc.mockResolvedValue({ data: { ...item, id: "new-item-id", status: "listed", ends_at: null }, error: null });
  mocks.createAdminClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
});

describe("seller relist", () => {
  it("returns only the server-owned title/image/start price source", async () => {
    await expect(getRelistSourceForSeller(item.id)).resolves.toEqual({
      room_id: item.room_id,
      title: item.title,
      img_url: item.img_url,
      start_price: item.start_price,
    });
  });

  it("creates a new listed item with the original start price", async () => {
    const result = await relistExpiredItem(item.id);

    expect(result.id).toBe("new-item-id");
    expect(mocks.rpc).toHaveBeenCalledWith("create_listing", {
      p_room_id: item.room_id,
      p_title: item.title,
      p_img_url: item.img_url,
      p_start_price: item.start_price,
    });
  });

  it("rejects relist for a non-expired order without calling the RPC", async () => {
    orderStatus = "paid";

    await expect(relistExpiredItem(item.id)).rejects.toThrow("RELIST_NOT_ALLOWED");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
