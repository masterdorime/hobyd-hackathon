import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/rooms/route";
import { POST as endRoom } from "../app/api/rooms/[id]/end/route";
import { AuthorizationError } from "../lib/server/auth";
import { RoomHasActiveItemError } from "../lib/server/rooms";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getProfileName: vi.fn(),
  startRoomForOwner: vi.fn(),
  endRoomForOwner: vi.fn(),
}));
vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/rooms", async (importOriginal) => ({
  ...(await importOriginal()),
  getProfileName: mocks.getProfileName,
  startRoomForOwner: mocks.startRoomForOwner,
  endRoomForOwner: mocks.endRoomForOwner,
}));

function form(): FormData {
  const data = new FormData();
  data.set("title", "My Pokémon Live");
  data.set("category", "pokemon-tcg");
  return data;
}

function request(body = form()): NextRequest {
  return new NextRequest("http://localhost/api/rooms", { method: "POST", body });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "owner-id", email: "owner@example.com" });
  mocks.getProfileName.mockResolvedValue("Room Owner");
  mocks.startRoomForOwner.mockResolvedValue({    id: "room-1",
    title: "My Pokémon Live",
    seller_name: "Room Owner",
    owner_id: "owner-id",
    category: "pokemon-tcg",
    thumbnail_url: null,
    status: "live",
    created_at: "2026-11-08T00:00:00.000Z",
  });
});

describe("POST /api/rooms", () => {
  it("returns 401 without calling start for anonymous callers", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.startRoomForOwner).not.toHaveBeenCalled();
  });

  it("rejects malformed room input before writes", async () => {
    const invalid = form();
    invalid.set("category", "sneakers");

    const response = await POST(request(invalid));

    expect(response.status).toBe(400);
    expect(mocks.startRoomForOwner).not.toHaveBeenCalled();
  });

  it("starts the room for the authenticated profile", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.startRoomForOwner).toHaveBeenCalledWith(
      "owner-id",
      "Room Owner",
      expect.objectContaining({ title: "My Pokémon Live", category: "pokemon-tcg" }),
    );
  });
});

describe("POST /api/rooms/[id]/end", () => {
  function endRequest() {
    return endRoom(
      new NextRequest("http://localhost/api/rooms/room-1/end", { method: "POST" }),
      { params: Promise.resolve({ id: "room-1" }) },
    );
  }

  it("rejects a non-owner", async () => {
    mocks.endRoomForOwner.mockRejectedValue(new AuthorizationError("FORBIDDEN"));

    const response = await endRequest();

    expect(response.status).toBe(403);
  });

  it("refuses to end while an auction is active", async () => {
    mocks.endRoomForOwner.mockRejectedValue(new RoomHasActiveItemError());

    const response = await endRequest();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "CLOSED" });
  });

  it("ends an owner room with no active item", async () => {
    mocks.endRoomForOwner.mockResolvedValue({ id: "room-1", owner_id: "owner-id", status: "ended" });

    const response = await endRequest();

    expect(response.status).toBe(200);
    expect(mocks.endRoomForOwner).toHaveBeenCalledWith("room-1", "owner-id");
  });
});
