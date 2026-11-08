import { describe, expect, it, vi } from "vitest";

import {
  AuctionRealtimeController,
  type AuctionRealtimeHandlers,
  type AuctionSnapshot,
} from "../lib/client/auction-realtime";
import type { Item } from "../lib/types";

const item: Item = {
  id: "00000000-0000-4000-8000-000000000999",
  room_id: "00000000-0000-4000-8000-000000000001",
  title: "Realtime item",
  img_url: "https://example.com/item.png",
  start_price: 1500000,
  current_price: 1500000,
  ends_at: "2026-11-08T00:02:00.000Z",
  winner: null,
  extensions_used: 0,
  status: "live",
  created_at: "2026-11-08T00:00:00.000Z",
};

function snapshot(currentPrice = 1500000): AuctionSnapshot {
  return { items: [{ ...item, current_price: currentPrice }], bids: [] };
}

describe("AuctionRealtimeController", () => {
  function fixture() {
    let handlers!: AuctionRealtimeHandlers;
    const channel = { kind: "fake-channel" };
    const subscribe = vi.fn((nextHandlers: AuctionRealtimeHandlers) => {
      handlers = nextHandlers;
      return channel;
    });
    const refetchSnapshot = vi.fn(async () => snapshot(2100000));
    const removeChannel = vi.fn(async () => undefined);
    const onChange = vi.fn();
    const onConnection = vi.fn();
    const controller = new AuctionRealtimeController({
      initialSnapshot: snapshot(),
      subscribe,
      refetchSnapshot,
      removeChannel,
      onChange,
      onConnection,
    });

    return { controller, get handlers() { return handlers; }, subscribe, refetchSnapshot, removeChannel, onChange, onConnection, channel };
  }

  it("merges item updates and deduplicates bid inserts by ID", () => {
    const f = fixture();
    f.controller.start();
    const bid = {
      id: "bid-1",
      item_id: item.id,
      bidder: "bidder-1",
      amount: 1800000,
      created_at: "2026-11-08T00:01:00.000Z",
      profile_name: "Bidder Satu",
    };

    f.handlers.onItem({ ...item, current_price: 1800000 });
    f.handlers.onBid(bid);
    f.handlers.onBid(bid);

    expect(f.controller.snapshot.items[0].current_price).toBe(1800000);
    expect(f.controller.snapshot.bids).toEqual([bid]);
    expect(f.onChange).toHaveBeenCalledTimes(2);
  });

  it("disconnects on error then refetches exactly once on the next SUBSCRIBED", async () => {
    const f = fixture();
    f.controller.start();
    f.handlers.onStatus("SUBSCRIBED");
    expect(f.refetchSnapshot).not.toHaveBeenCalled();

    f.handlers.onStatus("CHANNEL_ERROR");
    expect(f.controller.connection).toBe("disconnected");
    f.handlers.onStatus("SUBSCRIBED");
    f.handlers.onStatus("SUBSCRIBED");
    await vi.waitFor(() => expect(f.refetchSnapshot).toHaveBeenCalledTimes(1));
    expect(f.controller.snapshot.items[0].current_price).toBe(2100000);
    expect(f.controller.connection).toBe("connected");
  });

  it("removes the channel and ignores later work after disposal", async () => {
    const f = fixture();
    f.controller.start();
    await f.controller.dispose();

    expect(f.removeChannel).toHaveBeenCalledWith(f.channel);
    f.handlers.onStatus("CHANNEL_ERROR");
    expect(f.refetchSnapshot).not.toHaveBeenCalled();
  });
});
