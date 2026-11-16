import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
import fetchBookings from "@/lib/fetchBookings";
import { isClan } from "@/lib/clans";

export default async function Page({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!isClan(group)) notFound();
  const bookings = await fetchBookings(group);
  const now = new Date().getTime();
  const sessions = bookings.filter((booking) => booking.end.getTime() > now).map((booking) => ({
    id: booking.id,
    start: booking.date.toISOString(),
    end: booking.end.toISOString(),
    game: booking.game ?? "",
    igdbGameId: booking.igdbGameId,
  }));
  return <Dashboard group={group} sessions={sessions} initialNow={now} />;
}
