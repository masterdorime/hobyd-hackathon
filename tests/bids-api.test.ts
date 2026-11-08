import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/bids/route";
import { AuthorizationError } from "../lib/server/auth";

const ITEM_ID = "00000000-0000-4000-8000-000000000999";
const USER_ID = "authenticated-user-id";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bids", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.requireUser.mockResolvedValue({ id: USER_ID });
  mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "close_item") {
      return { data: { ok: true, noop: true }, error: null };
    }
    return {
      data: {
        ok: true,
        bid: { item_id: ITEM_ID, bidder: USER_ID, amount: 2450001 },
        extended: false,
      },
      error: null,
    };
  });
});

function validBody() {
  return { itemId: ITEM_ID, amount: 2450001 };
}

describe("POST /api/bids", () => {
  it("rejects anonymous callers before touching the database", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid input before touching the database", async () => {
    const response = await POST(request({ ...validBody(), bidder: "body-user-id" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_INPUT" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid", 400, "INVALID_INPUT"],
    ["closed", 409, "CLOSED"],
    ["too_low", 409, "TOO_LOW"],
    ["rate_limited", 429, "RATE_LIMITED"],
  ] as const)("maps RPC %s to HTTP %i", async (rpcError, status, code) => {
    mocks.rpc.mockImplementation(async (name: string) => name === "close_item"
      ? { data: { ok: true, noop: true }, error: null }
      : { data: { ok: false, error: rpcError }, error: null });

    const response = await POST(request(validBody()));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
  });

  it("closes first, then bids with authenticated user and server auction config", async () => {
    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      "close_item",
      "place_bid",
    ]);
    expect(mocks.rpc.mock.calls[0][1]).toEqual({ p_item_id: ITEM_ID });
    expect(mocks.rpc.mock.calls[1][1]).toEqual({
      p_item_id: ITEM_ID,
      p_bidder: USER_ID,
      p_amount: 2450001,
      p_max_extensions: 5,
      p_window_secs: 10,
      p_add_secs: 10,
    });
  });
});
