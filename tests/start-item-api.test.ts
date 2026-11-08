import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/items/[id]/start/route";
import { AuthorizationError } from "../lib/server/auth";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  startItemForOwner: vi.fn(),
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/items", async (importOriginal) => ({
  ...(await importOriginal()),
  startItemForOwner: mocks.startItemForOwner,
}));

const ITEM_ID = "00000000-0000-4000-8000-000000000101";

function startRequest() {
  return POST(new NextRequest(`http://localhost/api/items/${ITEM_ID}/start`, { method: "POST" }), {
    params: Promise.resolve({ id: ITEM_ID }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner-id" });
  mocks.startItemForOwner.mockResolvedValue({
    id: ITEM_ID,
    status: "live",
    ends_at: "2026-11-08T00:02:00.000Z",
  });
});

describe("POST /api/items/[id]/start", () => {
  it("returns 401 for anonymous callers", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const response = await startRequest();

    expect(response.status).toBe(401);
    expect(mocks.startItemForOwner).not.toHaveBeenCalled();
  });

  it("returns 403 for a room non-owner", async () => {
    mocks.startItemForOwner.mockRejectedValue(new AuthorizationError("FORBIDDEN"));

    const response = await startRequest();

    expect(response.status).toBe(403);
  });

  it("returns 409 when the item is already active or closed", async () => {
    mocks.startItemForOwner.mockRejectedValue(new Error("ITEM_NOT_LISTED"));

    const response = await startRequest();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "CLOSED" });
  });

  it("starts a listed item for the authenticated owner", async () => {
    const response = await startRequest();

    expect(response.status).toBe(200);
    expect(mocks.startItemForOwner).toHaveBeenCalledWith(ITEM_ID, "owner-id");
  });
});
