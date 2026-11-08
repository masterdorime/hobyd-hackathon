const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSTGRES_INT = 2_147_483_647;

export class BidValidationError extends Error {
  constructor() {
    super("Invalid bid payload");
    this.name = "BidValidationError";
  }
}

export function parseBidInput(value: unknown): { itemId: string; amount: number } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BidValidationError();
  }

  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).sort().join(",") !== "amount,itemId") {
    throw new BidValidationError();
  }

  const itemId = typeof payload.itemId === "string" ? payload.itemId.trim() : "";
  const amount = payload.amount;
  if (
    !UUID_PATTERN.test(itemId) ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > MAX_POSTGRES_INT
  ) {
    throw new BidValidationError();
  }

  return { itemId, amount };
}
