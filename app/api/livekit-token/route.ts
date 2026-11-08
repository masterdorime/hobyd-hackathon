import { AccessToken } from "livekit-server-sdk";
import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { getRequiredEnv } from "@/lib/server/config";
import { apiError } from "@/lib/server/http";
import { videoGrantFor } from "@/lib/server/livekit-grants";
import { getRoom } from "@/lib/server/rooms";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const requestedRoom = videoGrantFor(
      request.nextUrl.searchParams.get("room_id") ?? "",
      false,
    );
    const room = await getRoom(requestedRoom.room!);
    if (!room) {
      return apiError("NOT_FOUND");
    }
    const grant = videoGrantFor(room.id, room.owner_id === user.id);
    if (
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET ||
      !process.env.NEXT_PUBLIC_LIVEKIT_URL
    ) {
      return apiError("UPSTREAM_ERROR", 500);
    }

    const supabase = await createServerSupabase();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    if (profileError) {
      return apiError("UPSTREAM_ERROR");
    }

    const accessToken = new AccessToken(
      getRequiredEnv("LIVEKIT_API_KEY"),
      getRequiredEnv("LIVEKIT_API_SECRET"),
      { identity: user.id, name: profile.name },
    );
    accessToken.addGrant(grant);
    const token = await accessToken.toJwt();

    return NextResponse.json({
      token,
      serverUrl: getRequiredEnv("NEXT_PUBLIC_LIVEKIT_URL"),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) {
      return authResponse;
    }
    if (error instanceof Error && error.message === "VALID_ROOM_REQUIRED") {
      return apiError("INVALID_INPUT");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
