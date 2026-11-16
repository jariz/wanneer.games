import "server-only";
import { env } from "@/env";
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
  25076, // Red Dead Redemption 2
  1979, // Battlefield 4
  302156, // Call of Duty: Black Ops 6
  649, // Command & Conquer: Generals
  16664, // Wargame: Red Dragon
  242408, // Counter-Strike 2
  348330, // Forza Horizon 6
  314239, // RoadCraft
];
const fields = "fields name,cover.image_id,artworks.image_id,artworks.artwork_type,artworks.alpha_channel,artworks.width,artworks.height,screenshots.image_id;";

type Artwork = { image_id: string; artwork_type?: number; alpha_channel?: boolean; width?: number; height?: number };

// IGDB artwork types that work as a background: key art without logo, artwork, concept art, historical artwork.
// Logos, icons and covers are left out.
const backgroundTypes = [1, 2, 4, 15];

// Picks a different usable artwork on each call, so a game's background varies between visits.
function backgroundArtwork(artworks: Artwork[] = []) {
  const usable = artworks
    .filter((art) => backgroundTypes.includes(art.artwork_type ?? 1))
    // Transparent images are logos even when typed as artwork; portrait images don't fill the hero.
    .filter((art) => !art.alpha_channel && (art.width ?? 16) / (art.height ?? 9) >= 1.3);
  return usable[Math.floor(Math.random() * usable.length)];
}

async function gameQuery(query: string): Promise<Game[]> {
  try {
    const authParams = new URLSearchParams({
      client_id: env.NEXT_TWITCH_CLIENT_ID,
      client_secret: env.NEXT_TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });
    const auth = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST", body: authParams, next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!auth.ok) return [];
    const { access_token: token } = await auth.json();
    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: { "Client-ID": env.NEXT_TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
      body: `${fields} ${query}`,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const data: { id: number; name: string; cover?: { image_id: string }; artworks?: Artwork[]; screenshots?: { image_id: string }[] }[] = await response.json();
    const image = (id: string | undefined, size: string) =>
      id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null;
    return data.map((game) => ({
      id: game.id,
      name: game.name,
      cover: image(game.cover?.image_id, "t_cover_big"),
      artwork: image(backgroundArtwork(game.artworks)?.image_id ?? game.screenshots?.[0]?.image_id, "t_1080p"),
    }));
  } catch { return []; }
}

export async function getGameRotation() {
  const games = await gameQuery(`where id = (${rotation.join(",")}); limit ${rotation.length};`);
  return games.sort((a, b) => rotation.indexOf(a.id) - rotation.indexOf(b.id));
}

export async function searchGames(query: string) {
  const safe = query.trim().slice(0, 80);
  if (safe.length < 2) return [];
  return gameQuery(`search ${JSON.stringify(safe)}; limit 12;`);
}

export async function getGame(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return (await gameQuery(`where id = ${id}; limit 1;`))[0] ?? null;
}
