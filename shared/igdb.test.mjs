import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSearchResults } from "./igdb.ts";

test("popular results get a boost without displacing exact title matches", () => {
  const games = [
    { name: "Control fan game" },
    { name: "Control Ultimate Edition", total_rating_count: 10000 },
    { name: "Control" },
  ];
  assert.deepEqual(rankSearchResults(games, " CONTROL ", 2).map(g => g.name), [
    "Control", "Control Ultimate Edition",
  ]);
});

test("missing counts preserve relevance and popularity cannot rescue distant matches", () => {
  const games = Array.from({ length: 30 }, (_, index) => ({ name: `Game ${index}` }));
  games.push({ name: "Distant match", total_rating_count: 1000000 });
  assert.deepEqual(rankSearchResults(games, "Game", 5), games.slice(0, 5));
});
