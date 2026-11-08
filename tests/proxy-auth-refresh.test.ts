import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import proxy from "../proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return {
    default: () => (request: NextRequest) => NextResponse.next({ request }),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
  vi.stubEnv("LIVEKIT_API_KEY", "not-used-here");
  vi.stubEnv("LIVEKIT_API_SECRET", "not-used-here");
  mocks.getClaims.mockResolvedValue({ data: null, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.createServerClient.mockReturnValue({
    auth: {
      getClaims: mocks.getClaims,
      signOut: mocks.signOut,
    },
  });
});

describe("Supabase proxy auth-refresh resilience", () => {
  it("clears an invalid stale refresh token instead of crashing the page", async () => {
    mocks.getClaims.mockRejectedValue({
      name: "AuthApiError",
      code: "refresh_token_not_found",
      status: 400,
    });

    const response = await proxy(new NextRequest("http://localhost/id"));

    expect(response.status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not erase a valid session for unrelated transport failures", async () => {
    mocks.getClaims.mockRejectedValue(new Error("network timeout"));

    const response = await proxy(new NextRequest("http://localhost/id"));

    expect(response.status).toBe(200);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
