import { describe, expect, it } from "vitest";
import { buildQuestion, parseQuestion, parseSlot } from "../../src/flows/pollFormat.ts";
import { formatSlot } from "../../src/flows/slotPicker.ts";

describe("parseQuestion", () => {
  it("reads group and game back from the question", () => {
    expect(parseQuestion(buildQuestion("kiwis", "Deep Rock - Galactic"))).toEqual({
      group: "kiwis",
      game: "Deep Rock - Galactic",
    });
    expect(parseQuestion(buildQuestion("niglos", undefined))).toEqual({
      group: "niglos",
      game: undefined,
    });
  });

  it("ignores other polls", () => {
    expect(parseQuestion("Pizza of shoarma?")).toBeUndefined();
    expect(parseQuestion("🍕 Wanneer games?")).toBeUndefined();
  });
});

describe("parseSlot", () => {
  const createdAt = Date.parse("2026-10-20T14:03:12Z");

  it.each([
    "2026-10-20T18:00:00Z",
    "2026-10-25T00:30:00Z", // around the DST switch
    "2026-10-29T19:15:00Z",
  ])("recovers %s from its answer text", (iso) => {
    const slot = new Date(iso);
    expect(parseSlot(formatSlot(slot), createdAt)).toEqual(slot);
  });

  it("returns undefined for text that isn't a slot", () => {
    expect(parseSlot("morgen", createdAt)).toBeUndefined();
  });
});
