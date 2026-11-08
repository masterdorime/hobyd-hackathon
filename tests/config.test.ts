import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Bug prevented: unsafe/missing configuration changes server-side auction timing.
import {
  getAuctionConfig,
  getRequiredEnv,
} from "../lib/server/config";

const RULE_ENV_NAMES = [
  "MAX_SNIPING_EXTENSIONS",
  "EXTENSION_WINDOW_SEC",
  "EXTENSION_ADD_SEC",
  "AUCTION_DURATION_SEC",
  "PAYMENT_WINDOW_SEC",
] as const;

const originalRuleEnv = Object.fromEntries(
  RULE_ENV_NAMES.map((name) => [name, process.env[name]]),
);

beforeEach(() => {
  for (const name of RULE_ENV_NAMES) {
    delete process.env[name];
  }
});

afterEach(() => {
  for (const name of RULE_ENV_NAMES) {
    const value = originalRuleEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  delete process.env.HOBYD_TEST;
});

describe("getAuctionConfig", () => {
  it("uses the frozen auction defaults", () => {
    expect(getAuctionConfig()).toEqual({
      maxSnipingExtensions: 5,
      extensionWindowSec: 10,
      extensionAddSec: 10,
      auctionDurationSec: 120,
      paymentWindowSec: 300,
    });
  });

  it("reads positive integer overrides from the server environment", () => {
    process.env.MAX_SNIPING_EXTENSIONS = "6";
    process.env.EXTENSION_WINDOW_SEC = "8";
    process.env.EXTENSION_ADD_SEC = "12";
    process.env.AUCTION_DURATION_SEC = "150";
    process.env.PAYMENT_WINDOW_SEC = "240";

    expect(getAuctionConfig()).toEqual({
      maxSnipingExtensions: 6,
      extensionWindowSec: 8,
      extensionAddSec: 12,
      auctionDurationSec: 150,
      paymentWindowSec: 240,
    });
  });

  it.each([
    ["MAX_SNIPING_EXTENSIONS", "0"],
    ["EXTENSION_WINDOW_SEC", "-1"],
    ["EXTENSION_ADD_SEC", "1.5"],
    ["AUCTION_DURATION_SEC", "not-a-number"],
    ["PAYMENT_WINDOW_SEC", "2147483648"],
  ])("rejects invalid %s override %s", (name, value) => {
    process.env[name] = value;

    expect(() => getAuctionConfig()).toThrow(name);
  });
});

describe("getRequiredEnv", () => {
  it("returns a configured value without logging it", () => {
    process.env.HOBYD_TEST = "expected-secret-value";

    expect(getRequiredEnv("HOBYD_TEST")).toBe("expected-secret-value");
  });

  it("throws with only the variable name when a value is missing", () => {
    delete process.env.HOBYD_TEST;

    expect(() => getRequiredEnv("HOBYD_TEST")).toThrow("HOBYD_TEST");
  });
});
