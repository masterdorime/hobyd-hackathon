import { describe, expect, it } from "vitest";

import { validateSignup } from "../lib/validation/signup";

const valid = {
  name: "Budi Collector",
  email: "budi@example.com",
  password: "hobyd-pass-123",
  confirmation: "hobyd-pass-123",
};

describe("validateSignup", () => {
  it("accepts a complete signup form", () => {
    expect(validateSignup(valid)).toBeNull();
  });

  it.each([
    [{ name: " " }, "name"],
    [{ email: "not-an-email" }, "email"],
    [{ password: "short" }, "password"],
    [{ confirmation: "different-pass" }, "confirmation"],
  ])("reports the invalid field %#", (change, field) => {
    expect(validateSignup({ ...valid, ...change })).toBe(field);
  });
});
