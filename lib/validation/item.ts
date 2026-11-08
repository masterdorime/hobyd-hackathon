const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_POSTGRES_INT = 2_147_483_647;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ITEM_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface ItemInput {
  roomId: string;
  title: string;
  startPrice: number;
  image: File;
}

export class ItemValidationError extends Error {
  constructor(public readonly field: string) {
    super(`Invalid item field: ${field}`);
    this.name = "ItemValidationError";
  }
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseItemInput(form: FormData): ItemInput {
  const roomId = stringField(form, "roomId");
  if (!UUID_PATTERN.test(roomId)) {
    throw new ItemValidationError("roomId");
  }

  const title = stringField(form, "title");
  if (title.length < 1 || title.length > 120) {
    throw new ItemValidationError("title");
  }

  const rawPrice = stringField(form, "startPrice");
  const startPrice = Number(rawPrice);
  if (
    !/^[1-9]\d*$/.test(rawPrice) ||
    !Number.isSafeInteger(startPrice) ||
    startPrice > MAX_POSTGRES_INT
  ) {
    throw new ItemValidationError("startPrice");
  }

  const image = form.get("image");
  if (
    !(image instanceof File) ||
    image.size === 0 ||
    image.size > MAX_IMAGE_BYTES ||
    !(image.type in ITEM_IMAGE_EXTENSIONS)
  ) {
    throw new ItemValidationError("image");
  }

  return { roomId, title, startPrice, image };
}
