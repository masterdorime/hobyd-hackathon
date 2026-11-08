import { describe, expect, it } from "vitest";

import {
  ItemValidationError,
  parseItemInput,
} from "../lib/validation/item";

const ROOM_ID = "00000000-0000-4000-8000-000000000001";

function validForm(): FormData {
  const form = new FormData();
  form.set("roomId", ROOM_ID);
  form.set("title", "  Charizard Base Set  ");
  form.set("startPrice", "2500000");
  form.set("image", new File(["image"], "card.png", { type: "image/png" }));
  return form;
}

describe("parseItemInput", () => {
  it("accepts only a complete valid seller item form", () => {
    expect(parseItemInput(validForm())).toMatchObject({
      roomId: ROOM_ID,
      title: "Charizard Base Set",
      startPrice: 2500000,
    });
  });

  it.each([
    ["roomId", "not-a-uuid"],
    ["title", "   "],
    ["title", "x".repeat(121)],
    ["startPrice", "0"],
    ["startPrice", "-1"],
    ["startPrice", "1.5"],
    ["startPrice", "2147483648"],
  ])("rejects invalid %s", (field, value) => {
    const form = validForm();
    form.set(field, value);

    expect(() => parseItemInput(form)).toThrow(ItemValidationError);
  });

  it.each([
    ["missing", null],
    ["wrong MIME", new File(["gif"], "card.gif", { type: "image/gif" })],
    ["empty", new File([], "card.png", { type: "image/png" })],
    [
      "oversize",
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "card.png", {
        type: "image/png",
      }),
    ],
  ])("rejects %s image", (_case, image) => {
    const form = validForm();
    if (image) {
      form.set("image", image);
    } else {
      form.delete("image");
    }

    expect(() => parseItemInput(form)).toThrow(ItemValidationError);
  });
});
