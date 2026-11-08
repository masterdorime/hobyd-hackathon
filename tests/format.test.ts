import { describe, expect, it } from "vitest";

// Bug prevented: bidders see a malformed or unsafe IDR amount.
import { formatIdr } from "../lib/format";

describe("formatIdr", () => {
  it("formats integer rupiah with Indonesian separators", () => {
    expect(formatIdr(2450000)).toBe("Rp2.450.000");
    expect(formatIdr(0)).toBe("Rp0");
  });

  it.each([2.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects non-integer or unsafe value %s",
    (value) => {
      expect(() => formatIdr(value)).toThrow("safe integer");
    },
  );
});
