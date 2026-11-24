import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/env", () => ({ env: {} }));
vi.mock("@/shared/igdb", () => ({ igdbQuery: vi.fn() }));
vi.mock("@/lib/artwork-selection.json", () => ({ default: {
  version: 1,
  games: [
    { id: 99, name: "Added game", artworkIds: ["custom1", "custom2"] },
    { id: 100, name: "Cleared game", artworkIds: [] },
  ],
} }));
import { getArtworkRotation, getCuratorGames, getSessionArtwork } from "@/lib/artwork";
import { igdbQuery } from "@/shared/igdb";

test("the rotation uses only saved artwork and does not query IGDB", () => {
  const rotation = getArtworkRotation();
  expect(rotation.map((game) => game.id)).toEqual([99]);
  expect(rotation[0].artworks).toEqual([
    "https://images.igdb.com/igdb/image/upload/t_1080p_2x/custom1.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p_2x/custom2.jpg",
  ]);
  expect(rotation[0].artworks).toContain(rotation[0].artwork);
  expect(igdbQuery).not.toHaveBeenCalled();
});

test("the curator keeps saved images that are missing from IGDB", async () => {
  vi.mocked(igdbQuery).mockResolvedValueOnce([
    { id: 99, name: "Added game", screenshots: [{ image_id: "custom1", width: 1920 }] },
    { id: 100, name: "Cleared game", artworks: [{ image_id: "unselected" }] },
  ]);
  const games = await getCuratorGames();
  expect(games[0].candidates).toMatchObject([
    { imageId: "custom1", kind: "screenshot", width: 1920 },
    { imageId: "custom2", kind: "artwork" },
  ]);
  expect(games[1].selected).toEqual([]);
});

test("the curator keeps whole saved games missing from IGDB", async () => {
  vi.mocked(igdbQuery).mockResolvedValueOnce([]);
  const games = await getCuratorGames();
  expect(games.map(({ id, name, selected }) => ({ id, name, selected }))).toEqual([
    { id: 99, name: "Added game", selected: ["custom1", "custom2"] },
    { id: 100, name: "Cleared game", selected: [] },
  ]);
});

test("session games without curated artwork fall back to IGDB artwork, then screenshots", async () => {
  vi.mocked(igdbQuery).mockResolvedValueOnce([
    { id: 1, name: "Has artwork", artworks: [{ image_id: "art1" }], screenshots: [{ image_id: "shot1" }] },
    { id: 2, name: "Only screenshots", screenshots: [{ image_id: "shot2" }] },
    { id: 3, name: "Nothing" },
  ]);
  const games = await getSessionArtwork([99, 1, 2, 3, 2]);
  expect(vi.mocked(igdbQuery).mock.lastCall?.[0]).toContain("where id = (1,2,3);");
  expect(games).toEqual([
    { id: 1, name: "Has artwork", artwork: "https://images.igdb.com/igdb/image/upload/t_1080p_2x/art1.jpg", artworks: ["https://images.igdb.com/igdb/image/upload/t_1080p_2x/art1.jpg"] },
    { id: 2, name: "Only screenshots", artwork: "https://images.igdb.com/igdb/image/upload/t_1080p_2x/shot2.jpg", artworks: ["https://images.igdb.com/igdb/image/upload/t_1080p_2x/shot2.jpg"] },
  ]);
});

test("curated session games skip IGDB", async () => {
  vi.mocked(igdbQuery).mockClear();
  expect(await getSessionArtwork([99])).toEqual([]);
  expect(igdbQuery).not.toHaveBeenCalled();
});
