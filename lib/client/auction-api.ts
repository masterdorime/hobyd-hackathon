import { createClient } from "@/lib/supabase/client";
import type { AuctionSnapshot } from "./auction-realtime";
import type { Bid, PlaceBidResult } from "@/lib/types";

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

export async function closeItemRequest(itemId: string): Promise<unknown> {
  const response = await fetch(`/api/items/${itemId}/close`, { method: "POST" });
  if (!response.ok) {
    throw await errorFrom(response);
  }
  return response.json();
}

export async function fetchAuctionSnapshot(roomId: string): Promise<AuctionSnapshot> {
  const supabase = createClient();
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("room_id", roomId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (itemError) {
    throw new AuctionApiError("UPSTREAM_ERROR");
  }
  if (!item) {
    return { item: null, bids: [] };
  }

  const { data, error } = await supabase
    .from("bids")
    .select("id,item_id,bidder,amount,created_at,profiles(name)")
    .eq("item_id", item.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    throw new AuctionApiError("UPSTREAM_ERROR");
  }

  return {
    item,
    bids: data.map(({ profiles, ...bid }) => {
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return {
        ...bid,
        profile_name: profile?.name ?? "Collector",
      };
    }),
  };
}

export type { Bid };
