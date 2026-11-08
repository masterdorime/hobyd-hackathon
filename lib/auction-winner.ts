import type { Item } from "@/lib/types";

export function resolveAuthoritativeWinner(
  itemId: string,
  rpcWinner: string | null | undefined,
  latestItems: Item[] | null | undefined,
): string | null {
  if (rpcWinner) return rpcWinner;
  const item = latestItems?.find((candidate) => candidate.id === itemId);
  if (!item || item.status !== "closed") return null;
  return item.winner;
}
