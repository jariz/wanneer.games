import AppShell from "@/components/app-shell";
import { clans, type Clan } from "@/shared/clans";
import fetchBookings from "@/lib/fetchBookings";
import { getArtworkRotation, getSessionArtwork } from "@/lib/artwork";
import { hasPlanningAccess, planningConfigured } from "@/lib/planning-auth";
import { shuffle } from "@/lib/utils";

async function clanBackdrop(clan: Clan) {
  const bookings = await fetchBookings(clan).catch(() => []);
  return {
    sessions: bookings.map((booking) => ({ start: booking.date.toISOString(), end: booking.end.toISOString(), igdbGameId: booking.igdbGameId })),
  };
}

export default async function ClansLayout({ children }: { children: React.ReactNode }) {
  const slugs = Object.keys(clans) as Clan[];
  const [access, backdrops] = await Promise.all([
    Promise.all(slugs.map(async (clan) => [clan, { authorized: await hasPlanningAccess(clan), configured: planningConfigured(clan) }] as const)),
    Promise.all(slugs.map(async (clan) => [clan, await clanBackdrop(clan)] as const)),
  ]);
  // Shuffled per request so the background opens on a random game.
  const backgrounds = shuffle(getArtworkRotation());
  const now = new Date().getTime();
  const sessionArtwork = await getSessionArtwork(backdrops.flatMap(([, { sessions }]) =>
    sessions.flatMap(({ end, igdbGameId }) => (igdbGameId && Date.parse(end) > now ? [igdbGameId] : []))));
  return (
    <AppShell access={Object.fromEntries(access) as Record<Clan, (typeof access)[number][1]>} backdrops={Object.fromEntries(backdrops) as Record<Clan, (typeof backdrops)[number][1]>} backgrounds={backgrounds} sessionArtwork={sessionArtwork} initialNow={now}>
      {children}
    </AppShell>
  );
}
