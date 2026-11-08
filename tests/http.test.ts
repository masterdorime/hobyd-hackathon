import { describe, expect, it } from "vitest";

// Bug prevented: API failures expose internals or use inconsistent status codes.
import { apiError } from "../lib/server/http";

describe("apiError", () => {
  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["INVALID_INPUT", 400],
    ["NOT_FOUND", 404],
    ["CLOSED", 409],
    ["TOO_LOW", 409],
    ["RATE_LIMITED", 429],
    ["UPSTREAM_ERROR", 502],
  ] as const)("returns %s with HTTP %i and a stable JSON body", async (code, status) => {
    const response = apiError(code);

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
  });

  it("allows a route-specific status without adding a message payload", async () => {
    const response = apiError("INVALID_INPUT", 422);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "INVALID_INPUT" });
  });
});
