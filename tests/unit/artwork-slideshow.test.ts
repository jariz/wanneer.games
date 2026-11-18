import { expect, test } from "vitest";
import { advanceArtwork, type ArtworkPosition } from "@/lib/artwork-slideshow";
import type { Game } from "@/lib/game-types";

const slide = (id: number, artwork: string): Game => ({ id, name: String(id), artwork, artworks: [artwork], cover: null });

test("recent games are penalized regardless of how many images they have", () => {
  const slides = [...Array.from({ length: 101 }, (_, index) => slide(1, `a${index}`)), slide(2, "b")];
  let sameGame = 0;
  for (let sample = 0; sample < 1000; sample++) {
    const next = advanceArtwork(slides, { history: [0], cursor: 0 }, 1, () => (sample + 0.5) / 1000);
    const chosen = next.history[next.cursor];
    expect(chosen).not.toBe(0);
    if (slides[chosen].id === 1) sameGame++;
  }
  expect(sameGame).toBeGreaterThan(0);
  expect(sameGame).toBeLessThan(60);
});

test("previous and next replay history without drawing another random image", () => {
  const slides = [slide(1, "a"), slide(2, "b"), slide(3, "c")];
  const position = { history: [0, 2, 1], cursor: 2, remaining: [0] };
  const unexpected = () => { throw new Error("History should not reroll"); };
  const previous = advanceArtwork(slides, position, -1, unexpected);
  expect(previous.cursor).toBe(1);
  expect(previous.previous).toBe(1);
  const next = advanceArtwork(slides, previous, 1, unexpected);
  expect(next.history).toEqual(position.history);
  expect(next.cursor).toBe(2);
  expect(next.remaining).toEqual(position.remaining);
});

test("every image appears exactly once per deck before a fresh shuffle", () => {
  const slides = Array.from({ length: 12 }, (_, index) => slide(Math.floor(index / 3), `image-${index}`));
  let position: ArtworkPosition = { history: [0], cursor: 0 };
  let seed = 37;
  let draws = 0;
  const random = () => {
    draws++;
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const shown = [0];
  for (let index = 1; index < slides.length * 3; index++) {
    const previousDraws = draws;
    const hadRemaining = Boolean(position.remaining?.length);
    position = advanceArtwork(slides, position, 1, random);
    if (hadRemaining) expect(draws).toBe(previousDraws);
    const chosen = position.history[position.cursor];
    expect(chosen).not.toBe(shown.at(-1));
    shown.push(chosen);
  }
  for (let cycle = 0; cycle < 3; cycle++) {
    expect(new Set(shown.slice(cycle * slides.length, (cycle + 1) * slides.length)).size).toBe(slides.length);
  }
  expect(shown.slice(0, 12)).not.toEqual(shown.slice(12, 24));
});

test("one game's images still rotate and history is bounded", () => {
  const slides = [slide(1, "a"), slide(1, "b")];
  let position = { history: [0], cursor: 0 };
  for (let count = 0; count < 120; count++) {
    const previous = position.history[position.cursor];
    position = advanceArtwork(slides, position, 1, () => 0.5);
    expect(position.history[position.cursor]).not.toBe(previous);
  }
  expect(position.history).toHaveLength(100);
  expect(advanceArtwork([], position, 1)).toBe(position);
  expect(advanceArtwork([slides[0]], { history: [0], cursor: 0 }, 1).history).toEqual([0]);
});
