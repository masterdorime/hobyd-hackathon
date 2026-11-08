import { describe, expect, it } from "vitest";

// Bug prevented: switching language can drop the current room or query string.
import { buildLocalePath } from "../lib/locale-path";

describe("buildLocalePath", () => {
  it.each([
    ["/id/room/abc", "en", "", "/en/room/abc"],
    ["/en/pay/order-1", "id", "?sandbox=1", "/id/pay/order-1?sandbox=1"],
    ["/en", "id", "", "/id"],
  ])("maps %s to %s preserving the destination", (pathname, locale, search, expected) => {
    expect(buildLocalePath(pathname, locale as "id" | "en", search)).toBe(expected);
  });
});
