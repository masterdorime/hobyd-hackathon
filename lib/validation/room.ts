import { isRoomCategory, type RoomCategory } from "@/lib/room-categories";
import { ITEM_IMAGE_EXTENSIONS } from "./item";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface RoomInput {
  title: string;
  category: RoomCategory;
  thumbnail: File | null;
}

export class RoomValidationError extends Error {
  constructor(public readonly field: string) {
    super(`Invalid room field: ${field}`);
    this.name = "RoomValidationError";
  }
}

export function parseRoomInput(form: FormData): RoomInput {
  const rawTitle = form.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (title.length < 1 || title.length > 80) {
    throw new RoomValidationError("title");
  }

  const category = form.get("category");
  if (!isRoomCategory(category)) {
    throw new RoomValidationError("category");
  }

  const rawThumbnail = form.get("thumbnail");
  let thumbnail: File | null = null;
  if (rawThumbnail instanceof File && !(rawThumbnail.size === 0 && rawThumbnail.name === "")) {
    if (
      rawThumbnail.size === 0 ||
      rawThumbnail.size > MAX_IMAGE_BYTES ||
      !(rawThumbnail.type in ITEM_IMAGE_EXTENSIONS)
    ) {
      throw new RoomValidationError("thumbnail");
    }
    thumbnail = rawThumbnail;
  }

  return { title, category, thumbnail };
}
