import { AuthorizationError } from "./auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";
import { ITEM_IMAGE_EXTENSIONS } from "@/lib/validation/item";
import type { RoomInput } from "@/lib/validation/room";

const ROOM_COLUMNS = "id,title,seller_name,owner_id,category,thumbnail_url,status,created_at";
const BUCKET = "room-thumbnails";

export class RoomAlreadyLiveError extends Error {
  constructor() {
    super("ROOM_ALREADY_LIVE");
    this.name = "RoomAlreadyLiveError";
  }
}

export class RoomHasActiveItemError extends Error {
  constructor() {
    super("ROOM_HAS_ACTIVE_ITEM");
    this.name = "RoomHasActiveItemError";
  }
}

export async function listLiveRooms(): Promise<Room[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("status", "live")
    .order("created_at", { ascending: false });
  if (error) throw new Error("ROOMS_READ_FAILED");
  return data as Room[];
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error("ROOM_READ_FAILED");
  return data as Room | null;
}

export async function getRoomByOwner(ownerId: string): Promise<Room | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("ROOM_READ_FAILED");
  return data as Room | null;
}

export async function assertRoomOwner(roomId: string, userId: string): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room || room.owner_id !== userId) {
    throw new AuthorizationError("FORBIDDEN");
  }
  return room;
}

export async function getProfileName(userId: string): Promise<string> {  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  return data?.name ?? "Collector";
}

async function removeStoredThumbnail(url: string | null) {
  if (!url) return;
  const marker = `/${BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return;
  const path = decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}

export async function startRoomForOwner(
  userId: string,
  sellerName: string,
  input: RoomInput,
): Promise<Room> {
  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (existingError) throw new Error("ROOM_READ_FAILED");
  if (existing?.status === "live") throw new RoomAlreadyLiveError();

  const storage = admin.storage.from(BUCKET);
  let newThumbnailUrl: string | null = null;
  let uploadedPath: string | null = null;
  if (input.thumbnail) {
    const extension = ITEM_IMAGE_EXTENSIONS[input.thumbnail.type];
    uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await storage.upload(uploadedPath, input.thumbnail, {
      contentType: input.thumbnail.type,
      upsert: false,
    });
    if (error) throw new Error("ROOM_THUMBNAIL_UPLOAD_FAILED");
    newThumbnailUrl = storage.getPublicUrl(uploadedPath).data.publicUrl;
  }

  const values = {
    title: input.title,
    seller_name: sellerName,
    category: input.category,
    thumbnail_url: newThumbnailUrl ?? existing?.thumbnail_url ?? null,
    status: "live" as const,
  };
  const query = existing
    ? admin.from("rooms").update(values).eq("id", existing.id)
    : admin.from("rooms").insert({ ...values, owner_id: userId });
  const { data, error } = await query.select(ROOM_COLUMNS).single();

  if (error || !data) {
    if (uploadedPath) await storage.remove([uploadedPath]).catch(() => undefined);
    if (error?.code === "23505") throw new RoomAlreadyLiveError();
    throw new Error("ROOM_WRITE_FAILED");
  }
  if (newThumbnailUrl && existing?.thumbnail_url) {
    await removeStoredThumbnail(existing.thumbnail_url).catch(() => undefined);
  }
  return data as Room;
}

export async function endRoomForOwner(roomId: string, userId: string): Promise<Room> {
  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error("ROOM_READ_FAILED");
  if (!room || room.owner_id !== userId) throw new AuthorizationError("FORBIDDEN");
  if (room.status !== "live") return room as Room;

  const { count, error: itemError } = await admin
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .neq("status", "closed");
  if (itemError) throw new Error("ROOM_ITEM_CHECK_FAILED");
  if ((count ?? 0) > 0) throw new RoomHasActiveItemError();

  const { data, error: updateError } = await admin
    .from("rooms")
    .update({ status: "ended" })
    .eq("id", roomId)
    .eq("owner_id", userId)
    .select(ROOM_COLUMNS)
    .maybeSingle();
  if (updateError || !data) throw new Error("ROOM_END_FAILED");
  return data as Room;
}
