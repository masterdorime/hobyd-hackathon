export type RoomStatus = "lobby" | "live" | "ended";
export type ItemStatus = "lobby" | "live" | "ending" | "extended" | "closed";
export type OrderStatus = "pending" | "paid" | "expired" | "cancelled";

export interface Profile {
  id: string;
  name: string;
  reputation: number;
}

export interface Room {
  id: string;
  title: string;
  seller_name: string;
  status: RoomStatus;
  created_at: string;
}

export interface Item {
  id: string;
  room_id: string;
  title: string;
  img_url: string;
  start_price: number;
  current_price: number;
  ends_at: string;
  winner: string | null;
  extensions_used: number;
  status: ItemStatus;
  created_at: string;
}

export interface Bid {
  id: string;
  item_id: string;
  bidder: string;
  amount: number;
  created_at: string;
}

export type BidWithName = Bid & {
  profile_name: string;
};

export interface PlaceBidResult {
  ok: true;
  bid: Bid;
  extended: boolean;
}

export interface Order {
  id: string;
  item_id: string;
  winner: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
}
