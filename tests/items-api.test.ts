import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/items/route";
import { AuthorizationError } from "../lib/server/auth";
import type { Item } from "../lib/types";

const ROOM_ID = "00000000-0000-4000-8000-000000000001";

const mocks = vi.hoisted(() => ({
  requireSeller: vi.fn(),
  createAdminClient: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../lib/server/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireSeller: mocks.requireSeller,
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
  ends_at: "2026-11-08T00:02:00.000Z",
  winner: null,
  extensions_used: 0,
  status: "live",
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
  mocks.requireSeller.mockResolvedValue({ id: "seller-user-id" });
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
  it.each([
    ["anonymous", "UNAUTHORIZED", 401],
    ["non-seller", "FORBIDDEN", 403],
  ] as const)("returns %i for %s", async (_case, code, status) => {
    mocks.requireSeller.mockRejectedValue(new AuthorizationError(code));

    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed input before any Storage or DB call", async () => {
    const form = validForm();
    form.set("startPrice", "not-a-number");

    const response = await POST(requestWith(form));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_INPUT" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
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

  it("returns the server-created item without rollback on success", async () => {
    const response = await POST(requestWith(validForm()));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(item);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("create_live_item", {
      p_room_id: ROOM_ID,
      p_title: "Charizard Base Set",
      p_img_url: "https://example.com/item.png",
      p_start_price: 2500000,
      p_duration_secs: 120,
    });
  });
});
