import { describe, expect, it } from "vitest";

import { resolveAuthoritativeWinner } from "../lib/auction-winner";
import type { Item } from "../lib/types";

const closedWinner: Pick<Item, "id" | "status" | "winner"> = {
  id: "item-1",
  status: "closed",
  winner: "winner-1",
};

describe("resolveAuthoritativeWinner", () => {
  it("uses the winner returned by the close RPC", () => {
    expect(resolveAuthoritativeWinner("item-1", "winner-1", undefined)).toBe("winner-1");
  });

  it("recovers a winner when a concurrent close returned noop", () => {
    expect(resolveAuthoritativeWinner("item-1", null, [closedWinner as Item])).toBe("winner-1");
  });

  it("returns null for a non-closed or missing item", () => {
    expect(resolveAuthoritativeWinner("item-1", null, [{ ...closedWinner, status: "live" } as Item])).toBeNull();
    expect(resolveAuthoritativeWinner("item-1", null, [])).toBeNull();
  });
});
