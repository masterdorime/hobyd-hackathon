import { describe, expect, it } from "vitest";

import { videoGrantFor } from "../lib/server/livekit-grants";

describe("videoGrantFor", () => {
  it("keeps bidder video subscribe-only", () => {
    expect(videoGrantFor("room-001", false)).toEqual({
      room: "room-001",
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
    });
  });

  it("allows only the seller to publish in the requested room", () => {
    expect(videoGrantFor(" room-002 ", true)).toEqual({
      room: "room-002",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
  });

  it.each(["", " ", "bad room!", "../other-room"])(
    "rejects invalid room identity %j",
    (roomId) => {
      expect(() => videoGrantFor(roomId, true)).toThrow("VALID_ROOM_REQUIRED");
    },
  );
});
