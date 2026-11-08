import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../app/api/livekit-token/route";
import { AuthorizationError } from "../lib/server/auth";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getRoom: vi.fn(),
  createServerSupabase: vi.fn(),
  accessToken: vi.fn(),
  addGrant: vi.fn(),
  toJwt: vi.fn(),
}));

vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/rooms", () => ({ getRoom: mocks.getRoom }));
vi.mock("../lib/supabase/server", () => ({ createServerSupabase: mocks.createServerSupabase }));
vi.mock("livekit-server-sdk", () => ({ AccessToken: mocks.accessToken }));

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/livekit-token?${query}`);
}

beforeEach(() => {
  vi.stubEnv("LIVEKIT_API_KEY", "test-api-key");
  vi.stubEnv("LIVEKIT_API_SECRET", "test-api-secret");
  vi.stubEnv("NEXT_PUBLIC_LIVEKIT_URL", "wss://test-livekit.invalid");
  mocks.requireUser.mockResolvedValue({ id: "auth-bidder-id", email: "bidder@example.com" });
  mocks.getRoom.mockResolvedValue({ id: "room-001", owner_id: "different-owner" });
  mocks.accessToken.mockImplementation(function () {
    return {
      addGrant: mocks.addGrant,
      toJwt: mocks.toJwt,
    };
  });
  mocks.toJwt.mockResolvedValue("safe-test-token");
  mocks.createServerSupabase.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { name: "Authenticated Bidder" }, error: null }),
        }),
      }),
    }),
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/livekit-token", () => {
  it("returns 401 to anonymous callers without creating a token", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const response = await GET(request("room_id=room-001"));

    expect(response.status).toBe(401);
    expect(mocks.accessToken).not.toHaveBeenCalled();
  });

  it("uses authenticated identity and subscribe-only grants regardless of query", async () => {
    const response = await GET(request("room_id=room-001&seller=true&identity=attacker"));
    expect(response.status).toBe(200);

    expect(mocks.accessToken).toHaveBeenCalledWith("test-api-key", "test-api-secret", {
      identity: "auth-bidder-id",
      name: "Authenticated Bidder",
    });
    expect(mocks.addGrant).toHaveBeenCalledWith({
      room: "room-001",
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
    });
    expect(await response.json()).toEqual({
      token: "safe-test-token",
      serverUrl: "wss://test-livekit.invalid",
    });
  });

  it("allows publish only for the room owner", async () => {
    mocks.requireUser.mockResolvedValue({ id: "auth-seller-id", email: "seller@example.com" });
    mocks.getRoom.mockResolvedValue({ id: "room-001", owner_id: "auth-seller-id" });
    mocks.createServerSupabase.mockResolvedValue({
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { name: "Seller Name" }, error: null }) }) }) }),
    });

    const response = await GET(request("room_id=room-001"));

    expect(response.status).toBe(200);
    expect(mocks.addGrant).toHaveBeenCalledWith(expect.objectContaining({ canPublish: true }));
  });

  it("rejects an unknown room", async () => {
    mocks.getRoom.mockResolvedValue(null);

    const response = await GET(request("room_id=not-found"));

    expect(response.status).toBe(404);
    expect(mocks.accessToken).not.toHaveBeenCalled();
  });

  it("does not leak keys or token when config or upstream fails", async () => {
    vi.stubEnv("LIVEKIT_API_SECRET", "");
    const config = await GET(request("room_id=room-001"));
    expect(config.status).toBe(500);
    expect(await config.json()).toEqual({ error: "UPSTREAM_ERROR" });

    vi.stubEnv("LIVEKIT_API_SECRET", "test-api-secret");
    mocks.toJwt.mockRejectedValue(new Error("upstream failed"));
    const upstream = await GET(request("room_id=room-001"));
    expect(upstream.status).toBe(502);
    expect(await upstream.json()).toEqual({ error: "UPSTREAM_ERROR" });
  });
});
