import { describe, expect, it } from "vitest";

import { RoomCategories, RoomCategoryMessageKeys, isRoomCategory } from "../lib/room-categories";
import { parseRoomInput, RoomValidationError } from "../lib/validation/room";
import en from "../messages/en.json";
import id from "../messages/id.json";

function validForm(): FormData {
  const form = new FormData();
  form.set("title", "  Pokémon Night Live  ");
  form.set("category", "pokemon-tcg");
  return form;
}

describe("room categories", () => {
  it("exposes exactly the six approved categories", () => {
    expect(RoomCategories).toEqual([
      "pokemon-tcg",
      "one-piece-tcg",
      "yu-gi-oh-tcg",
      "mtg",
      "sports-cards",
      "other",
    ]);
    expect(isRoomCategory("mtg")).toBe(true);
    expect(isRoomCategory("sneakers")).toBe(false);
  });

  it("maps every stored category to an existing ID and EN label", () => {
    for (const category of RoomCategories) {
      const key = RoomCategoryMessageKeys[category] as keyof typeof en.categories;
      expect(en.categories[key]).toBeTruthy();
      expect(id.categories[key]).toBeTruthy();
    }
  });
});

describe("parseRoomInput", () => {
  it("accepts a trimmed name, known category, and optional image omitted", () => {
    expect(parseRoomInput(validForm())).toEqual({
      title: "Pokémon Night Live",
      category: "pokemon-tcg",
      thumbnail: null,
    });
  });

  it("accepts a valid thumbnail", () => {
    const form = validForm();
    form.set("thumbnail", new File(["image"], "room.webp", { type: "image/webp" }));

    expect(parseRoomInput(form).thumbnail).toBeInstanceOf(File);
  });

  it.each([
    ["empty name", "title", " "],
    ["long name", "title", "x".repeat(81)],
    ["category casing", "category", "Pokemon-TCG"],
    ["unknown category", "category", "sneakers"],
  ])("rejects %s", (_case, field, value) => {
    const form = validForm();
    form.set(field, value);

    expect(() => parseRoomInput(form)).toThrow(RoomValidationError);
  });

  it.each([
    ["gif", new File(["gif"], "room.gif", { type: "image/gif" })],
    ["empty", new File([], "room.png", { type: "image/png" })],
    ["oversize", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "room.png", { type: "image/png" })],
  ])("rejects %s thumbnail", (_case, file) => {
    const form = validForm();
    form.set("thumbnail", file);

    expect(() => parseRoomInput(form)).toThrow(RoomValidationError);
  });
});
