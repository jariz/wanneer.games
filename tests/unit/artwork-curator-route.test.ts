import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/lib/artwork", () => ({ getCuratorGames: vi.fn(async () => []) }));
vi.mock("@/lib/games", () => ({ searchGames: vi.fn() }));

import { GET } from "@/app/artworks/data/route";
import { getCuratorGames } from "@/lib/artwork";
import { searchGames } from "@/lib/games";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

test("the read-only data route is public in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await GET(new Request("http://localhost/artworks/data"))).status).toBe(200);
  expect(getCuratorGames).toHaveBeenCalledOnce();
});

test("invalid game IDs never reach IGDB", async () => {
  vi.stubEnv("NODE_ENV", "development");
  for (const id of ["-1", "0", "1.5", "hello"]) {
    expect((await GET(new Request(`http://localhost/artworks/data?id=${id}`))).status).toBe(400);
  }
  expect(getCuratorGames).not.toHaveBeenCalled();
});

test("curator search reports an upstream error", async () => {
  vi.mocked(searchGames).mockRejectedValueOnce(new Error("IGDB unavailable"));
  expect((await GET(new Request("http://localhost/artworks/data?q=Valheim"))).status).toBe(502);
});
