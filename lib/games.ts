import "server-only";
import { env } from "@/env";
import { igdbQuery, searchClause } from "@/shared/igdb";
import type { Game } from "./game-types";

// Game IDs define the rotation; artwork is always resolved through IGDB.
const rotation = [
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
  52189, // Grand Theft Auto VI
  26401, // Star Wars Battlefront II (2017)
  211196, // Call to Arms: Gates of Hell - Ostfront
  397811, // Machine Party
  281275, // Buckshot Roulette
  3225, // No Man's Sky
  119171, // Baldur's Gate III
  9730, // Firewatch
];
const fields = "fields name,cover.image_id,artworks.image_id,artworks.artwork_type,artworks.width,artworks.height;";

type Artwork = { image_id: string; artwork_type?: number; width?: number; height?: number };

// IGDB artwork types that work as a background: key art without logo, artwork, concept art, historical artwork.
// Logos, icons and covers are left out.
const backgroundTypes = [1, 2, 4, 15];

// Artworks IGDB types as plain art that still don't work as a background.
const excludedArtworks = new Set([
  "ar7s2", // Age of Empires IV: logo card
  "ar6i4l", "ar6i4m", "ar6i4n", // Grand Theft Auto VI: logo over the art
  "ar4rk", "ar4rl", "ar4rn", // Star Wars Battlefront II: logo over the art
  "ar5rh3", // The Finals: logo mark
  "ar6hoy", // Buckshot Roulette: almost entirely black
  "ar5vr3", // Forza Horizon 6: car on a white background
  "ar74f", // Sea of Thieves: logo on black
  "ar6bln", // ARC Raiders
  "s81kuicumnoogbv7pmel", // No Man's Sky
  "ar3sas", "ar69b1", "ar3tfx", // Schedule I, Call of Duty: Black Ops 6, Baldur's Gate III: too dark
]);

// Picks a different usable artwork on each call, so a game's background varies between visits.
function backgroundArtwork(artworks: Artwork[] = []) {
  const usable = artworks
    .filter((art) => backgroundTypes.includes(art.artwork_type ?? 1) && !excludedArtworks.has(art.image_id))
    // IGDB's alpha_channel flag is set on plenty of opaque artwork, so only shape is checked: square or portrait images don't fill the hero.
    .filter((art) => (art.width ?? 16) / (art.height ?? 9) >= 1.3);
  return usable[Math.floor(Math.random() * usable.length)];
}

async function gameQuery(query: string): Promise<Game[]> {
  try {
    const data = await igdbQuery<{ id: number; name: string; cover?: { image_id: string }; artworks?: Artwork[] }>(
      `${fields} ${query}`,
      { clientId: env.NEXT_TWITCH_CLIENT_ID, clientSecret: env.NEXT_TWITCH_CLIENT_SECRET },
      { init: { next: { revalidate: 3600 } } },
    );
    const image = (id: string | undefined, size: string) =>
      id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
    return data.map((game) => ({
      id: game.id,
      name: game.name,
      cover: image(game.cover?.image_id, "t_cover_big"),
      artwork: image(backgroundArtwork(game.artworks)?.image_id, "t_1080p"),
    }));
  } catch { return []; }
}

export async function getGameRotation() {
  const games = await gameQuery(`where id = (${rotation.join(",")}); limit ${rotation.length};`);
  return games.sort((a, b) => rotation.indexOf(a.id) - rotation.indexOf(b.id));
}

export async function searchGames(query: string) {
  const clause = searchClause(query, 12);
  return clause ? gameQuery(clause) : [];
}

export async function getGame(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return (await gameQuery(`where id = ${id}; limit 1;`))[0] ?? null;
}
