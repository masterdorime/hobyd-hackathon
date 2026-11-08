import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ChatMessage, ChatMessageWithName, Profile } from "@/lib/types";

export async function listChatMessages(roomId: string): Promise<ChatMessageWithName[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,room_id,user_id,body,created_at,profiles(name)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("CHAT_READ_FAILED");
  return data.map(({ profiles, ...message }) => {
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    return { ...message, profile_name: profile?.name ?? "Collector" } as ChatMessageWithName;
  });
}

export async function postChatMessage(
  roomId: string,
  userId: string,
  body: string,
): Promise<ChatMessageWithName> {
  const admin = createAdminClient();
  const { data: message, error } = await admin.rpc("send_chat_message", {
    p_room_id: roomId,
    p_user_id: userId,
    p_body: body,
  });
  if (error) {
    if (error.message.includes("chat_rate_limited")) throw new Error("CHAT_RATE_LIMITED");
    if (error.message.includes("room_not_live")) throw new Error("CHAT_ROOM_NOT_LIVE");
    throw new Error("CHAT_WRITE_FAILED");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  return {
    ...(message as ChatMessage),
    profile_name: (profile as Pick<Profile, "name"> | null)?.name ?? "Collector",
  };
}
