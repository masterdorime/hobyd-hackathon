import { describe, expect, it } from "vitest";

import {
  authErrorResponse,
  AuthorizationError,
} from "../lib/server/auth";

describe("authErrorResponse", () => {
  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = authErrorResponse(new AuthorizationError(code));

    expect(response?.status).toBe(status);
    expect(await response?.json()).toEqual({ error: code });
  });

  it("does not turn unrelated errors into response payloads", () => {
    expect(authErrorResponse(new Error("internal details"))).toBeNull();
  });
});
