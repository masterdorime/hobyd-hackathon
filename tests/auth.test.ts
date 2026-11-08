import { afterEach, describe, expect, it } from "vitest";

import {
  authErrorResponse,
  AuthorizationError,
  isSellerEmail,
} from "../lib/server/auth";

const originalAllowlist = process.env.SELLER_ALLOWLIST;

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.SELLER_ALLOWLIST;
  } else {
    process.env.SELLER_ALLOWLIST = originalAllowlist;
  }
});

describe("isSellerEmail", () => {
  it("matches only normalized allowlisted seller emails", () => {
    process.env.SELLER_ALLOWLIST =
      " seller@example.com, second@example.com, , ";

    expect(isSellerEmail(" SELLER@example.com ")).toBe(true);
    expect(isSellerEmail("second@example.com")).toBe(true);
    expect(isSellerEmail("bidder@example.com")).toBe(false);
    expect(isSellerEmail(undefined)).toBe(false);
    expect(isSellerEmail(null)).toBe(false);
    expect(isSellerEmail("")).toBe(false);
  });

  it("does not authorize anyone when the allowlist is empty", () => {
    process.env.SELLER_ALLOWLIST = " , , ";

    expect(isSellerEmail("seller@example.com")).toBe(false);
    expect(isSellerEmail(" ")).toBe(false);
  });
});

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
    expect(authErrorResponse(new Error("database password leaked"))).toBeNull();
  });
});
