import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: {} }));
vi.mock("@/shared/igdb", () => ({ igdbQuery: vi.fn(async () => []), rankSearchResults: vi.fn(), searchClause: vi.fn() }));
vi.mock("@/lib/artwork-selection.json", () => ({ default: {
  version: 1,
  games: [
    { id: 99, name: "Added game", artworkIds: ["custom1", "custom2"] },
    { id: 100, name: "Cleared game", artworkIds: [] },
  ],
} }));
import { getGameRotation } from "@/lib/games";

test("saved games and image IDs define the rotation even if IGDB returns no metadata", async () => {
  const games = await getGameRotation();
  expect(games.map((game) => game.id)).toEqual([99, 100]);
  expect(games[0].artworks).toEqual([
    "https://images.igdb.com/igdb/image/upload/t_1080p_2x/custom1.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p_2x/custom2.jpg",
  ]);
  expect(games[0].artworks).toContain(games[0].artwork);
  expect(games[1].artworks).toEqual([]);
  expect(games[1].artwork).toBeNull();
});
