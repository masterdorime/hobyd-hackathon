export type LiveKitCredentials = {
  token: string;
  serverUrl: string;
};

export async function getLiveKitToken(roomId: string): Promise<LiveKitCredentials> {
  const response = await fetch(`/api/livekit-token?room_id=${encodeURIComponent(roomId)}`);
  if (!response.ok) {
    throw new Error("LIVEKIT_UNAVAILABLE");
  }
  return response.json() as Promise<LiveKitCredentials>;
}
