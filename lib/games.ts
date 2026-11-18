import "server-only";
import { env } from "@/env";
import { igdbQuery, rankSearchResults, searchClause } from "@/shared/igdb";
import type { Game } from "./game-types";

const defaultGameIds = [
  28489, // Ready or Not
  2950, // Age of Empires II: HD Edition
  299, // Age of Empires III
  104967, // Valheim
  15894, // Hearts of Iron IV
  250616, // Helldivers 2
  3189, // Project Zomboid
  11582, // Stellaris
  17832, // Don't Starve Together
  3239, // Space Engineers
  185258, // ARC Raiders
  317407, // Battlefield 6
  11137, // Sea of Thieves
  27344, // Barotrauma
  328373, // Schedule I
  55029, // Age of Empires IV
  1979, // Battlefield 4
  302156, // Call of Duty: Black Ops 6
  649, // Command & Conquer: Generals
  16664, // Wargame: Red Dragon
  242408, // Counter-Strike 2
  348330, // Forza Horizon 6
  314239, // RoadCraft
  214417, // The Finals
  26401, // Star Wars Battlefront II (2017)
  211196, // Call to Arms: Gates of Hell - Ostfront
  397811, // Machine Party
  281275, // Buckshot Roulette
  3225, // No Man's Sky
  119171, // Baldur's Gate III
  75235, // Ghost of Tsushima (Legends)
  25076, // Red Dead Redemption 2 (Red Dead Online)
  90558, // Satisfactory
  107215, // SnowRunner
  320140, // Subnautica 2
];

async function gameQuery(query: string, search?: string): Promise<Game[]> {
  const data = await igdbQuery<{ id: number; name: string; total_rating_count?: number; cover?: { image_id: string } }>(
    `fields name,cover.image_id${search ? ",total_rating_count" : ""}; ${query}`,
    { clientId: env.NEXT_TWITCH_CLIENT_ID, clientSecret: env.NEXT_TWITCH_CLIENT_SECRET },
    { init: { next: { revalidate: 3600 } } },
  );
  return (search ? rankSearchResults(data, search, 12) : data).map(({ id, name, cover }) => ({
    id,
    name,
    cover: cover ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg` : null,
  }));
}

export async function getDefaultGames() {
  const games = await gameQuery(`where id = (${defaultGameIds.join(",")}); limit ${defaultGameIds.length};`).catch(() => []);
  return games.sort((a, b) => defaultGameIds.indexOf(a.id) - defaultGameIds.indexOf(b.id));
}

export async function searchGames(query: string) {
  const clause = searchClause(query, 60);
  return clause ? gameQuery(clause, query) : [];
}
