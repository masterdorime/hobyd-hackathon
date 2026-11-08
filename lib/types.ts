export type RoomStatus = "lobby" | "live" | "ended";
export type ItemStatus = "listed" | "lobby" | "live" | "ending" | "extended" | "closed";
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
  owner_id: string | null;
  category: import("./room-categories").RoomCategory | null;
  thumbnail_url: string | null;
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
  ends_at: string | null;
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

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export type ChatMessageWithName = ChatMessage & {
  profile_name: string;
};

export type BidWithName = Bid & {
  profile_name: string;
};

export interface PlaceBidResult {
  ok: true;
  bid: Bid;
  extended: boolean;
}

export type CloseItemResult = {
  ok: boolean;
  noop?: boolean;
  closed?: boolean;
  winner: string | null;
  error?: string;
};

export interface Order {
  id: string;
  item_id: string;
  winner: string;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  midtrans_transaction_id?: string | null;
  qris_action_url?: string | null;
  qris_expires_at?: string | null;
}
