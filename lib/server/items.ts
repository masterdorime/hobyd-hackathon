import type { User } from "@supabase/supabase-js";

import { getAuctionConfig } from "./config";
import { requireSeller } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Item, ItemStatus } from "@/lib/types";
import { ITEM_IMAGE_EXTENSIONS, type ItemInput } from "@/lib/validation/item";

export class RoomNotLiveError extends Error {
  constructor() {
    super("ROOM_NOT_LIVE");
    this.name = "RoomNotLiveError";
  }
}

export async function listItems(roomId: string): Promise<Item[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("ITEMS_READ_FAILED");
  }
  return data as Item[];
}

export async function createItemForSeller(
  user: User,
  input: ItemInput,
): Promise<Item> {
  const admin = createAdminClient();
  const storage = admin.storage.from("item-images");
  const extension = ITEM_IMAGE_EXTENSIONS[input.image.type];
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await storage.upload(path, input.image, {
    contentType: input.image.type,
    upsert: false,
  });
  if (uploadError) {
    throw new Error("ITEM_UPLOAD_FAILED");
  }

  const publicUrl = storage.getPublicUrl(path).data.publicUrl;
  const duration = getAuctionConfig().auctionDurationSec;
  const { data, error } = await admin.rpc("create_live_item", {
    p_room_id: input.roomId,
    p_title: input.title,
    p_img_url: publicUrl,
    p_start_price: input.startPrice,
    p_duration_secs: duration,
  });

  if (error || !data) {
    await storage.remove([path]);
    if (error?.message === "room_not_live") {
      throw new RoomNotLiveError();
    }
    throw new Error("ITEM_CREATE_FAILED");
  }

  return {
    ...data,
    status: data.status as ItemStatus,
  } as Item;
}

export interface RelistSource {
  room_id: string;
  title: string;
  img_url: string;
  start_price: number;
}

export async function getRelistSourceForSeller(itemId: string): Promise<RelistSource> {
  await requireSeller();
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("status")
    .eq("item_id", itemId)
    .maybeSingle();
  if (orderError || !order || order.status !== "expired") {
    throw new Error("RELIST_NOT_ALLOWED");
  }

  const { data: item, error: itemError } = await admin
    .from("items")
    .select("room_id,title,img_url,start_price")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError || !item) {
    throw new Error("RELIST_NOT_ALLOWED");
  }
  return {
    room_id: item.room_id,
    title: item.title,
    img_url: item.img_url,
    start_price: item.start_price,
  };
}

export async function relistExpiredItem(itemId: string): Promise<Item> {
  const source = await getRelistSourceForSeller(itemId);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_live_item", {
    p_room_id: source.room_id,
    p_title: source.title,
    p_img_url: source.img_url,
    p_start_price: source.start_price,
    p_duration_secs: getAuctionConfig().auctionDurationSec,
  });
  if (error || !data) {
    throw new Error("RELIST_CREATE_FAILED");
  }
  return data as Item;
}
