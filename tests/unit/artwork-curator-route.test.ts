import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/env", () => ({ env: {} }));
vi.mock("@/lib/games", () => ({ getCuratorGames: vi.fn(async () => []) }));
vi.mock("@/shared/igdb", () => ({ igdbQuery: vi.fn(), rankSearchResults: vi.fn(), searchClause: vi.fn() }));

import { GET } from "@/app/artworks/data/route";
import { getCuratorGames } from "@/lib/games";

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
