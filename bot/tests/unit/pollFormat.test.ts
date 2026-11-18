import { describe, expect, it } from "vitest";
import {
  buildGameLink,
  buildQuestion,
  buildSlotLine,
  parseGameSlug,
  parseQuestion,
  parseSlot,
  readSlotLine,
} from "../../src/flows/pollFormat.ts";
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

describe("parseGameSlug", () => {
  it("reads the slug back from the game link", () => {
    const link = buildGameLink("Star Wars [Battlefront] II", "star-wars-battlefront-ii--1");
    expect(link).toBe(
      "🎮 [Star Wars Battlefront II](<https://www.igdb.com/games/star-wars-battlefront-ii--1>)",
    );
    expect(parseGameSlug(link)).toBe("star-wars-battlefront-ii--1");
  });

  it("returns undefined without a link", () => {
    expect(parseGameSlug("")).toBeUndefined();
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

it("stores both occurrences of the repeated Amsterdam hour without ambiguity", () => {
  const slots = [new Date("2026-10-25T00:30:00Z"), new Date("2026-10-25T01:30:00Z")];
  const content = `${buildGameLink("Example", "example")}\n${buildSlotLine(slots)}`;
  expect(slots.map((_, index) => readSlotLine(content, index))).toEqual(slots);
  expect(readSlotLine(content, 2)).toBeUndefined();
});
