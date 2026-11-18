import { env } from "@/env";
import { getCuratorGames } from "@/lib/games";
import { igdbQuery, rankSearchResults, searchClause } from "@/shared/igdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has("q")) {
      const query = params.get("q") ?? "";
      const clause = searchClause(query, 40);
      if (!clause) return Response.json([]);
      const games = await igdbQuery<{ id: number; name: string; cover?: { image_id: string }; total_rating_count?: number }>(
        `fields name,cover.image_id,total_rating_count; ${clause}`,
        { clientId: env.NEXT_TWITCH_CLIENT_ID, clientSecret: env.NEXT_TWITCH_CLIENT_SECRET },
        { init: { next: { revalidate: 3600 } } },
      );
      return Response.json(rankSearchResults(games, query, 12).map(({ id, name, cover }) => ({
        id, name, cover: cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg` : null,
        artwork: null, artworks: [],
      })));
    }
    const id = params.has("id") ? Number(params.get("id")) : undefined;
    if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      return Response.json({ error: "Invalid game ID." }, { status: 400 });
    }
    return Response.json(await getCuratorGames(id));
  } catch {
    return Response.json({ error: "IGDB could not be reached. Please try again." }, { status: 502 });
  }
}
