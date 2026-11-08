import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../app/api/auth/signup/route";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  createAdminClient: vi.fn(),
}));
vi.mock("../lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = {
  name: "New Collector",
  email: "new@example.com",
  password: "new-user-pass-123",
  confirmation: "new-user-pass-123",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createUser.mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
  mocks.createAdminClient.mockReturnValue({ auth: { admin: { createUser: mocks.createUser } } });
});

describe("POST /api/auth/signup", () => {
  it("rejects invalid form data before creating a user", async () => {
    const response = await POST(request({ ...valid, confirmation: "different" }));

    expect(response.status).toBe(400);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("creates a confirmed user with profile metadata", async () => {
    const response = await POST(request(valid));

    expect(response.status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "new-user-pass-123",
      email_confirm: true,
      user_metadata: { name: "New Collector" },
    });
  });

  it("maps duplicate or provider failure without leaking details", async () => {
    mocks.createUser.mockResolvedValue({ data: { user: null }, error: { message: "already registered" } });

    const response = await POST(request(valid));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "EMAIL_EXISTS" });
  });
});
