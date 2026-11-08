import { createClient } from "@/lib/supabase/client";
import type { AuctionSnapshot } from "./auction-realtime";
import type { Bid, CloseItemResult, Item, PlaceBidResult } from "@/lib/types";

export class AuctionApiError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AuctionApiError";
  }
}

async function errorFrom(response: Response): Promise<AuctionApiError> {
  const body = await response.json().catch(() => null);
  return new AuctionApiError(body?.error ?? "UPSTREAM_ERROR");
}

export async function postBid(itemId: string, amount: number): Promise<PlaceBidResult> {
  const response = await fetch("/api/bids", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId, amount }),
  });
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return response.json() as Promise<PlaceBidResult>;
}

export async function closeItemRequest(itemId: string): Promise<CloseItemResult> {
  const response = await fetch(`/api/items/${itemId}/close`, { method: "POST" });
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return response.json();
}

export async function fetchAuctionSnapshot(roomId: string): Promise<AuctionSnapshot> {
  const supabase = createClient();
  const { data: items, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (itemError) {
    throw new AuctionApiError("UPSTREAM_ERROR");
  }
  const typedItems = (items ?? []) as Item[];
  if (typedItems.length === 0) {
    return { items: [], bids: [] };
  }

  const { data, error } = await supabase
    .from("bids")
    .select("id,item_id,bidder,amount,created_at,profiles(name)")
    .in("item_id", typedItems.map((item) => item.id))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new AuctionApiError("UPSTREAM_ERROR");
  }

  return {
    items: typedItems,
    bids: data.map(({ profiles, ...bid }) => {
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return {
        ...bid,
        profile_name: profile?.name ?? "Collector",
      };
    }),
  };
}

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await createClient().auth.getUser();
  if (error || !data.user) {
    throw new AuctionApiError("UNAUTHORIZED");
  }
  return data.user.id;
}

export async function startItemRequest(itemId: string): Promise<Item> {
  const response = await fetch(`/api/items/${itemId}/start`, { method: "POST" });
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return response.json() as Promise<Item>;
}

export type { Bid };
