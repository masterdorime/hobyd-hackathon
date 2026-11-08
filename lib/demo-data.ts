import type { BidWithName, Item, Order, Room } from "./types";

export const DEMO_ROOM_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ITEM_ID = "00000000-0000-4000-8000-000000000101";
export const DEMO_ORDER_ID = "00000000-0000-4000-8000-000000000301";

const demoCreatedAt = "2026-11-08T00:00:00.000Z";

export const demoRoom: Room = {
  id: DEMO_ROOM_ID,
  title: "Pokémon TCG Night Auction",
  seller_name: "Raka",
  status: "live",
  created_at: demoCreatedAt,
};

export const demoItem: Item = {
  id: DEMO_ITEM_ID,
  room_id: DEMO_ROOM_ID,
  title: "Charizard Base Set (Near Mint)",
  img_url: "/hobyd-logo.png",
  start_price: 1_500_000,
  current_price: 2_450_000,
  ends_at: demoCreatedAt,
  winner: null,
  extensions_used: 2,
  status: "extended",
  created_at: demoCreatedAt,
};

export const demoBids: BidWithName[] = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    item_id: DEMO_ITEM_ID,
    bidder: "00000000-0000-4000-8000-000000000201",
    amount: 2_450_000,
    created_at: "2026-11-08T00:01:42.000Z",
    profile_name: "Andra",
  },
  {
    id: "00000000-0000-4000-8000-000000000402",
    item_id: DEMO_ITEM_ID,
    bidder: "00000000-0000-4000-8000-000000000202",
    amount: 2_300_000,
    created_at: "2026-11-08T00:01:38.000Z",
    profile_name: "Bima",
  },
  {
    id: "00000000-0000-4000-8000-000000000403",
    item_id: DEMO_ITEM_ID,
    bidder: "00000000-0000-4000-8000-000000000203",
    amount: 2_100_000,
    created_at: "2026-11-08T00:01:33.000Z",
    profile_name: "Citra",
  },
];

export const demoOrder: Order = {
  id: DEMO_ORDER_ID,
  item_id: DEMO_ITEM_ID,
  winner: "00000000-0000-4000-8000-000000000201",
  status: "pending",
  created_at: demoCreatedAt,
  paid_at: null,
};
