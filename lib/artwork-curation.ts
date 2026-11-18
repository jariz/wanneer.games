import { z } from "zod";

const candidateSchema = z.object({
  imageId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  kind: z.enum(["artwork", "screenshot"]),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const curatorGameSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  cover: z.string().nullable().optional(),
  candidates: z.array(candidateSchema),
  selected: z.array(z.string()),
});

export const curatorDraftSchema = z.object({
  version: z.literal(1),
  games: z.array(curatorGameSchema),
});

export type CuratorGame = z.infer<typeof curatorGameSchema>;
export type CuratorDraft = z.infer<typeof curatorDraftSchema>;

export const artworkSelectionSchema = z.object({
  version: z.literal(1),
  games: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string().min(1).max(200),
    artworkIds: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)).max(2000),
  })).max(500).refine((games) => new Set(games.map((game) => game.id)).size === games.length, "Duplicate game IDs."),
});

export function exportCuration(games: CuratorGame[]) {
  return {
    version: 1 as const,
    games: games.map((game) => ({
      id: game.id,
      name: game.name,
      artworkIds: [...new Set(game.selected)].filter((id) => game.candidates.some((art) => art.imageId === id)),
    })),
  };
}

export function artworkUrl(imageId: string, full = false) {
  return `https://images.igdb.com/igdb/image/upload/${full ? "t_1080p_2x" : "t_screenshot_big"}/${imageId}.jpg`;
}
