// IGDB access shared by the website and the Discord bot. Callers handle errors.

export type IgdbCredentials = { clientId: string; clientSecret: string };

type IgdbOptions = {
  timeoutMs?: number;
  // Lets the website add Next's fetch caching to the query
  init?: RequestInit;
};

let token: { clientId: string; value: string; expiresAt: number } | undefined;

const accessToken = async (
  { clientId, clientSecret }: IgdbCredentials,
  timeoutMs: number,
): Promise<string> => {
  if (token?.clientId === clientId && token.expiresAt > Date.now()) return token.value;

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Twitch OAuth failed: ${response.status}`);
  const { access_token, expires_in }: { access_token: string; expires_in: number } =
    await response.json();
  // Renew a minute early so a query never runs on an expiring token
  token = { clientId, value: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
};

export const igdbQuery = async <T>(
  body: string,
  credentials: IgdbCredentials,
  { timeoutMs = 10_000, init = {} }: IgdbOptions = {},
): Promise<T[]> => {
  const response = await fetch("https://api.igdb.com/v4/games", {
    ...init,
    method: "POST",
    headers: {
      "Client-ID": credentials.clientId,
      Authorization: `Bearer ${await accessToken(credentials, timeoutMs)}`,
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`IGDB query failed: ${response.status}`);
  return response.json();
};

// Undefined when the query is too short to search for
export const searchClause = (query: string, limit: number): string | undefined => {
  const safe = query.trim().slice(0, 80);
  if (safe.length < 2) return;
  return `search ${JSON.stringify(safe)}; limit ${limit};`;
};

export function rankSearchResults<T extends { name: string; total_rating_count?: number }>(
  games: T[], query: string, limit: number,
): T[] {
  const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("en");
  const term = normalize(query);
  // Keep IGDB relevance, with a capped logarithmic boost for widely rated games.
  return games.map((game, index) => ({
    game,
    score: (normalize(game.name) === term ? 1000 : 0) - index +
      Math.min(20, Math.log10(1 + Math.max(0, game.total_rating_count ?? 0)) * 5),
  })).sort((a, b) => b.score - a.score).slice(0, limit).map(({ game }) => game);
}
