import { NextResponse, type NextRequest } from "next/server";

import { authErrorResponse, requireUser } from "@/lib/server/auth";
import { listChatMessages, postChatMessage } from "@/lib/server/chat";
import { apiError } from "@/lib/server/http";
import { ChatValidationError, parseChatInput } from "@/lib/validation/chat";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requireUser();
    const { id } = await params;
    return NextResponse.json(await listChatMessages(id));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return apiError("UPSTREAM_ERROR");
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = parseChatInput(await request.json());
    return NextResponse.json(await postChatMessage(id, user.id, input.body), { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof ChatValidationError || error instanceof SyntaxError) {
      return apiError("INVALID_INPUT");
    }
    if (error instanceof Error && error.message === "CHAT_RATE_LIMITED") {
      return apiError("RATE_LIMITED");
    }
    if (error instanceof Error && error.message === "CHAT_ROOM_NOT_LIVE") {
      return apiError("CLOSED");
    }
    return apiError("UPSTREAM_ERROR");
  }
}
