import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { BidWithName, Item } from "@/lib/types";

export type { AuctionSnapshot } from "@/lib/client/auction-realtime";

export async function getAuctionSnapshot(roomId: string) {
  const supabase = await createServerSupabase();
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (itemError) {
    throw new Error("AUCTION_ITEM_READ_FAILED");
  }

  const typedItem = item as Item | null;
  if (!typedItem) {
    return { item: null, bids: [] as BidWithName[] };
  }

  const { data, error } = await supabase
    .from("bids")
    .select("id,item_id,bidder,amount,created_at,profiles(name)")
    .eq("item_id", typedItem.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    throw new Error("AUCTION_BIDS_READ_FAILED");
  }

  const bids = data.map(({ profiles, ...bid }) => {
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    return {
      ...bid,
      profile_name: profile?.name ?? "Collector",
    };
  }) as BidWithName[];
  return { item: typedItem, bids };
}

export async function closeItem(itemId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("close_item", { p_item_id: itemId });
  if (error) {
    throw new Error("AUCTION_CLOSE_FAILED");
  }
  return data;
}
