export const RoomCategories = [
  "pokemon-tcg",
  "one-piece-tcg",
  "yu-gi-oh-tcg",
  "mtg",
  "sports-cards",
  "other",
] as const;

export type RoomCategory = (typeof RoomCategories)[number];

export const RoomCategoryMessageKeys: Record<RoomCategory, string> = {
  "pokemon-tcg": "pokemon",
  "one-piece-tcg": "onePiece",
  "yu-gi-oh-tcg": "yuGiOh",
  mtg: "mtg",
  "sports-cards": "sports",
  other: "other",
};

export function isRoomCategory(value: unknown): value is RoomCategory {
  return typeof value === "string" && (RoomCategories as readonly string[]).includes(value);
}
