import { createServerSupabase } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";

export async function listRooms(): Promise<Room[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("id,title,seller_name,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("ROOMS_READ_FAILED");
  }
  return data as Room[];
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("id,title,seller_name,status,created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error("ROOM_READ_FAILED");
  }
  return data as Room | null;
}
