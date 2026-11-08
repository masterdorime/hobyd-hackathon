import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import id from "../messages/id.json";

function leaves(value: unknown, prefix = "", result: Record<string, unknown> = {}) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    result[prefix] = value;
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    leaves(child, prefix ? `${prefix}.${key}` : key, result);
  }
  return result;
}

describe("localized message catalogs", () => {
  it("exposes exactly the same message keys in Indonesian and English", () => {
    expect(Object.keys(leaves(id)).sort()).toEqual(Object.keys(leaves(en)).sort());
  });

  it("contains nonempty strings for every message", () => {
    for (const messages of [leaves(id), leaves(en)]) {
      for (const [key, value] of Object.entries(messages)) {
        expect(typeof value, key).toBe("string");
        expect((value as string).trim().length, key).toBeGreaterThan(0);
      }
    }
  });
});
