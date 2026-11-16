import { igdbQuery, rankSearchResults, searchClause } from "../../shared/igdb.ts";
import { env } from "./env.ts";

export type Game = { name: string; igdbGameId?: number; slug?: string };

type IgdbGame = { id: number; name: string; slug: string; first_release_date?: number; total_rating_count?: number };

const FIELDS = "fields name,slug,first_release_date,total_rating_count;";
const CHOICE_PREFIX = "igdb:";

const query = async (clause: string, timeoutMs?: number): Promise<IgdbGame[]> => {
  const { NEXT_TWITCH_CLIENT_ID: clientId, NEXT_TWITCH_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) return [];
  return igdbQuery<IgdbGame>(`${FIELDS} ${clause}`, { clientId, clientSecret }, { timeoutMs })
    .catch((err) => {
      console.error("IGDB query failed:", err);
      return [];
    });
};

const toGame = (game: IgdbGame): Game => ({
  name: game.name,
  igdbGameId: game.id,
  slug: game.slug,
});

// Discord drops autocomplete answers after three seconds
export const gameChoices = async (input: string) => {
  const clause = searchClause(input, 60);
  if (!clause) return [];
  const games = await query(clause, 2500);
  return rankSearchResults(games, input, 25).map((game) => {
    const year = game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : undefined;
    return {
      name: (year ? `${game.name} (${year})` : game.name).slice(0, 100),
      value: `${CHOICE_PREFIX}${game.id}`,
    };
  });
};

// A picked suggestion carries its IGDB ID; anything typed is used as is.
// Undefined when a picked game can't be looked up.
export const resolveGame = async (value: string | null): Promise<Game | null | undefined> => {
  const typed = value?.trim().slice(0, 120);
  if (!typed) return null;
  if (!typed.startsWith(CHOICE_PREFIX)) return { name: typed };

  const id = Number(typed.slice(CHOICE_PREFIX.length));
  if (!Number.isSafeInteger(id) || id < 1) return { name: typed };
  const [game] = await query(`where id = ${id}; limit 1;`);
  return game && toGame(game);
};

export const gameBySlug = async (slug: string): Promise<Game | undefined> => {
  const [game] = await query(`where slug = ${JSON.stringify(slug)}; limit 1;`);
  return game && toGame(game);
};
