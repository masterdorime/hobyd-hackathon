import { describe, expect, it } from "vitest";

// Bug prevented: malformed or client-authoritative bids reach the auction RPC.
import { BidValidationError, parseBidInput } from "../lib/validation/bid";

const VALID_ITEM_ID = "00000000-0000-4000-8000-000000000999";

describe("parseBidInput", () => {
  it("accepts only a UUID and strictly positive Postgres integer amount", () => {
    expect(parseBidInput({ itemId: VALID_ITEM_ID, amount: 2450001 }))
      .toEqual({ itemId: VALID_ITEM_ID, amount: 2450001 });

    expect(() => parseBidInput({ itemId: VALID_ITEM_ID, amount: 2.5 })).toThrow();
    expect(() => parseBidInput({ itemId: VALID_ITEM_ID, amount: 2147483648 })).toThrow();
  });

  it.each([
    null,
    [],
    { itemId: "not-a-uuid", amount: 10 },
    { itemId: VALID_ITEM_ID, amount: 0 },
    { itemId: VALID_ITEM_ID, amount: -1 },
    { itemId: VALID_ITEM_ID, amount: 1e100 },
    { itemId: VALID_ITEM_ID, amount: "2500000" },
    { itemId: VALID_ITEM_ID, amount: "10junk" },
    { itemId: VALID_ITEM_ID, amount: Number.MAX_SAFE_INTEGER + 1 },
    { itemId: VALID_ITEM_ID, amount: 10, bidder: "body-user-id" },
    { itemId: VALID_ITEM_ID, amount: 10, ends_at: "2030-01-01" },
  ])("rejects malformed or client-authoritative payload %#", (payload) => {
    expect(() => parseBidInput(payload)).toThrow(BidValidationError);
  });
});
