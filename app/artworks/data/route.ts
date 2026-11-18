import { getCuratorGames } from "@/lib/artwork";
import { searchGames } from "@/lib/games";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has("q")) {
      return Response.json(await searchGames(params.get("q") ?? ""));
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
