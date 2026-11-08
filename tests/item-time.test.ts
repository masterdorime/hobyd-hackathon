import { describe, expect, it } from "vitest";

import { secondsUntil } from "../lib/time";

describe("secondsUntil", () => {
  it("derives remaining time from the stored server deadline", () => {
    const now = Date.parse("2026-11-08T00:00:00.000Z");

    expect(secondsUntil("2026-11-08T00:02:00.000Z", now)).toBe(120);
    expect(secondsUntil("2026-11-07T23:59:00.000Z", now)).toBe(0);
  });
});
