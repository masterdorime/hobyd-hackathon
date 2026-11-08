import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "../app/api/rooms/[id]/chat/route";
import { AuthorizationError } from "../lib/server/auth";
import { parseChatInput } from "../lib/validation/chat";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listChatMessages: vi.fn(),
  postChatMessage: vi.fn(),
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/chat", async (importOriginal) => ({
  ...(await importOriginal()),
  listChatMessages: mocks.listChatMessages,
  postChatMessage: mocks.postChatMessage,
}));

const ROOM_ID = "00000000-0000-4000-8000-000000000001";
const message = {
  id: "message-1",
  room_id: ROOM_ID,
  user_id: "user-1",
  body: "Halo seller!",
  created_at: "2026-11-08T00:00:00.000Z",
  profile_name: "Bidder",
};

function request(method = "POST", body: unknown = { body: "Halo seller!" }) {
  return new NextRequest(`http://localhost/api/rooms/${ROOM_ID}/chat`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}
const context = { params: Promise.resolve({ id: ROOM_ID }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user-1", email: "bidder@example.com" });
  mocks.listChatMessages.mockResolvedValue([message]);
  mocks.postChatMessage.mockResolvedValue(message);
});

describe("parseChatInput", () => {
  it("trims and validates a short chat message", () => {
    expect(parseChatInput({ body: "  Halo seller!  " })).toEqual({ body: "Halo seller!" });
  });

  it.each([
    null,
    {},
    { body: " " },
    { body: "x".repeat(281) },
    { body: 123 },
  ])("rejects invalid chat payload %#", (payload) => {
    expect(() => parseChatInput(payload)).toThrow();
  });
});

describe("/api/rooms/[id]/chat", () => {
  it("requires login for reading and writing", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const post = await POST(request(), context);
    const get = await GET(request("GET"), context);

    expect(post.status).toBe(401);
    expect(get.status).toBe(401);
  });

  it("rejects an invalid message before writing", async () => {
    const response = await POST(request("POST", { body: " " }), context);

    expect(response.status).toBe(400);
    expect(mocks.postChatMessage).not.toHaveBeenCalled();
  });

  it("maps a server rate-limit rejection to 429", async () => {
    mocks.postChatMessage.mockRejectedValue(new Error("CHAT_RATE_LIMITED"));

    const response = await POST(request(), context);

    expect(response.status).toBe(429);
  });

  it("returns authenticated room messages", async () => {
    const response = await GET(request("GET"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([message]);
    expect(mocks.listChatMessages).toHaveBeenCalledWith(ROOM_ID);
  });
});
