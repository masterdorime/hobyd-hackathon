const MAX_POSTGRES_INT = 2_147_483_647;

export interface AuctionConfig {
  maxSnipingExtensions: number;
  extensionWindowSec: number;
  extensionAddSec: number;
  auctionDurationSec: number;
  paymentWindowSec: number;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > MAX_POSTGRES_INT) {
    throw new Error(`${name} exceeds the supported integer range`);
  }
  return value;
}

export function getAuctionConfig(): AuctionConfig {
  return {
    maxSnipingExtensions: readPositiveInteger("MAX_SNIPING_EXTENSIONS", 5),
    extensionWindowSec: readPositiveInteger("EXTENSION_WINDOW_SEC", 10),
    extensionAddSec: readPositiveInteger("EXTENSION_ADD_SEC", 10),
    auctionDurationSec: readPositiveInteger("AUCTION_DURATION_SEC", 120),
    paymentWindowSec: readPositiveInteger("PAYMENT_WINDOW_SEC", 300),
  };
}
