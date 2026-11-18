import "server-only";
import { env } from "@/env";
import { igdbQuery } from "@/shared/igdb";
import { artworkSelectionSchema, artworkUrl, type CuratorGame } from "./artwork-curation";
import savedSelection from "./artwork-selection.json";

export type BackdropArtwork = {
  id: number;
  name: string;
  artwork: string;
  artworks: string[];
};

const selection = artworkSelectionSchema.parse(savedSelection);

export function getArtworkRotation(): BackdropArtwork[] {
  return selection.games.flatMap(({ id, name, artworkIds }) => {
    if (!artworkIds.length) return [];
    const artworks = artworkIds.map((imageId) => artworkUrl(imageId, true));
    return [{ id, name, artwork: artworks[Math.floor(Math.random() * artworks.length)], artworks }];
  });
}

type Image = { image_id: string; width?: number; height?: number };

export async function getCuratorGames(id?: number): Promise<CuratorGame[]> {
  const ids = id === undefined ? selection.games.map((game) => game.id) : [id];
  if (!ids.length) return [];
  const data = await igdbQuery<{ id: number; name: string; cover?: { image_id: string }; artworks?: Image[]; screenshots?: Image[] }>(
    `fields name,cover.image_id,artworks.image_id,artworks.width,artworks.height,screenshots.image_id,screenshots.width,screenshots.height; where id = (${ids.join(",")}); limit ${ids.length};`,
    { clientId: env.NEXT_TWITCH_CLIENT_ID, clientSecret: env.NEXT_TWITCH_CLIENT_SECRET },
    { init: { next: { revalidate: 3600 } } },
  );
  const metadata = new Map(data.map((game) => [game.id, game]));
  const savedById = new Map(selection.games.map((game) => [game.id, game]));
  return ids.flatMap((id) => {
    const game = metadata.get(id);
    const saved = savedById.get(id);
    if (!game && !saved) return [];
    const selected = saved?.artworkIds ?? [];
    const candidates = [
      ...(game?.artworks ?? []).map((art) => ({ imageId: art.image_id, kind: "artwork" as const, width: art.width, height: art.height })),
      ...(game?.screenshots ?? []).map((art) => ({ imageId: art.image_id, kind: "screenshot" as const, width: art.width, height: art.height })),
    ];
    const uniqueCandidates = new Map<string, CuratorGame["candidates"][number]>(candidates.map((art) => [art.imageId, art]));
    for (const imageId of selected) {
      if (!uniqueCandidates.has(imageId)) uniqueCandidates.set(imageId, { imageId, kind: "artwork" });
    }
    return {
      id,
      name: game?.name ?? saved!.name,
      cover: game?.cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg` : null,
      candidates: [...uniqueCandidates.values()],
      selected: [...new Set(selected)],
    };
  });
}
