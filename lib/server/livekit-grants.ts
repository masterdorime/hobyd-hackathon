import type { VideoGrant } from "livekit-server-sdk";

export function videoGrantFor(roomId: string, seller: boolean): VideoGrant {
  const room = roomId.trim();
  if (room.length === 0 || room.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(room)) {
    throw new Error("VALID_ROOM_REQUIRED");
  }

  return {
    room,
    roomJoin: true,
    canPublish: seller,
    canSubscribe: true,
  };
}
