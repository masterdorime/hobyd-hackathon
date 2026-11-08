import { describe, expect, it } from "vitest";

// Bug prevented: login can redirect users to an attacker-controlled site.
import { resolveLoginDestination } from "../lib/login-redirect";

describe("resolveLoginDestination", () => {
  it.each([
    [undefined, "/id"],
    ["", "/id"],
    ["/id", "/id"],
    ["/en/room/lot-1?from=lobby", "/en/room/lot-1?from=lobby"],
    ["/en", "/en"],
    ["https://evil.example/steal", "/id"],
    ["//evil.example/steal", "/id"],
    ["javascript:alert(1)", "/id"],
    ["/room/lot-1", "/id"],
    ["/en\\evil", "/id"],
  ])("maps %j to %s", (value, expected) => {
    expect(resolveLoginDestination(value)).toBe(expected);
  });
});
