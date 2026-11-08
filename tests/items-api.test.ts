import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/items/route";
import { AuthorizationError } from "../lib/server/auth";
import type { Item } from "../lib/types";

const ROOM_ID = "00000000-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getRoom: vi.fn(),
  createAdminClient: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireUser: mocks.requireUser,
}));
vi.mock("../lib/server/rooms", async (importOriginal) => ({
  ...(await importOriginal()),
  getRoom: mocks.getRoom,
}));

vi.mock("../lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

const item: Item = {
  id: "00000000-0000-4000-8000-000000000999",
  room_id: ROOM_ID,
  title: "Charizard Base Set",
  img_url: "https://example.com/item.png",
  start_price: 2500000,
  current_price: 2500000,
  ends_at: null,
  winner: null,
  extensions_used: 0,
  status: "listed",
  created_at: "2026-11-08T00:00:00.000Z",
};

function requestWith(form: FormData): NextRequest {
  return new NextRequest("http://localhost/api/items", {
    method: "POST",
    body: form,
  });
}

function validForm(): FormData {
  const form = new FormData();
  form.set("roomId", ROOM_ID);
  form.set("title", "Charizard Base Set");
  form.set("startPrice", "2500000");
  form.set("image", new File(["image"], "card.png", { type: "image/png" }));
  return form;
}

beforeEach(() => {
  mocks.requireUser.mockResolvedValue({ id: "seller-user-id" });
  mocks.getRoom.mockResolvedValue({
    id: ROOM_ID,
    title: "Owned room",
    seller_name: "Owner",
    owner_id: "seller-user-id",
    category: "pokemon-tcg",
    thumbnail_url: null,
    status: "live",
    created_at: "2026-11-08T00:00:00.000Z",
  });
  mocks.storageFrom.mockReturnValue({
    upload: mocks.upload,
    remove: mocks.remove,
    getPublicUrl: mocks.getPublicUrl,
  });
  mocks.createAdminClient.mockReturnValue({
    storage: { from: mocks.storageFrom },
    rpc: mocks.rpc,
  });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.getPublicUrl.mockReturnValue({
    data: { publicUrl: "https://example.com/item.png" },
  });
  mocks.rpc.mockResolvedValue({ data: item, error: null });
});

describe("POST /api/items", () => {
  it("returns 401 for anonymous callers", async () => {
    mocks.requireUser.mockRejectedValue(new AuthorizationError("UNAUTHORIZED"));

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user does not own the room", async () => {
    mocks.getRoom.mockResolvedValue({
      id: ROOM_ID,
      owner_id: "different-user",
      status: "live",
    });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed input before any Storage or DB call", async () => {
    const form = validForm();
    form.set("startPrice", "not-a-number");

    const response = await POST(requestWith(form));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_INPUT" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.getRoom).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("removes the uploaded object exactly once when item RPC fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "insert failed" } });

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(502);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^seller-user-id\/.+\.png$/),
    ]);
  });

  it("creates a listed item without starting its clock", async () => {
    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(item);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("create_listing", {
      p_room_id: ROOM_ID,
      p_title: "Charizard Base Set",
      p_img_url: "https://example.com/item.png",
      p_start_price: 2500000,
    });
  });
});
