import AppShell from "@/components/app-shell";
import { clans, type Clan } from "@/shared/clans";
import fetchBookings from "@/lib/fetchBookings";
import { getGame, getGameRotation } from "@/lib/games";
import { hasPlanningAccess, planningConfigured } from "@/lib/planning-auth";
import { shuffle } from "@/lib/utils";

async function clanBackdrop(clan: Clan) {
  const bookings = await fetchBookings(clan).catch(() => []);
  const next = bookings.find((booking) => booking.end.getTime() > Date.now());
  // Only a game picked in the planner is linked; typed names fall back to the rotating backgrounds.
  const game = next?.igdbGameId ? await getGame(next.igdbGameId) : null;
  return {
    featured: game?.artwork ? game : null,
    sessions: bookings.map((booking) => ({ start: booking.date.toISOString(), end: booking.end.toISOString() })),
  };
}

export default async function ClansLayout({ children }: { children: React.ReactNode }) {
  const slugs = Object.keys(clans) as Clan[];
  const [access, backdrops, games] = await Promise.all([
    Promise.all(slugs.map(async (clan) => [clan, { authorized: await hasPlanningAccess(clan), configured: planningConfigured(clan) }] as const)),
    Promise.all(slugs.map(async (clan) => [clan, await clanBackdrop(clan)] as const)),
    getGameRotation(),
  ]);
  // Shuffled per request so the background opens on a random game.
  const backgrounds = shuffle(games.filter((game) => game.artwork));
  const now = new Date().getTime();
  return (
    <AppShell access={Object.fromEntries(access) as Record<Clan, (typeof access)[number][1]>} backdrops={Object.fromEntries(backdrops) as Record<Clan, (typeof backdrops)[number][1]>} backgrounds={backgrounds} initialNow={now}>
      {children}
    </AppShell>
  );
}
