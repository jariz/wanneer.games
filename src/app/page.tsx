import { Calendar, CalendarDays } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isBefore, isToday, startOfToday } from "date-fns";
import { nl } from "date-fns/locale/nl";
import fetchBookings from "@/lib/fetchBookings";
import { Button } from "@/components/ui/button";
import { toZonedTime } from "date-fns-tz";
import Confetti from "@/components/confetti";

const formatRelativeTime = (date: Date) => {
  const distance = formatDistanceToNow(date, {
    addSuffix: true,
    locale: nl,
  });

  return distance.charAt(0).toUpperCase() + distance.slice(1);
};
const formatDateWithRelative = (date: Date) => {
  return `${date.toLocaleDateString("nl-NL", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} (${formatRelativeTime(date)})`;
};
export const revalidate = 600;

export default async function Component() {
  const bookings = await fetchBookings(startOfToday());
  const nextSession = bookings[0];
  const futureSessions = bookings.splice(1);
  const shouldDoConfetti = isBefore(nextSession?.date, new Date());
  const nextZonedDate = toZonedTime(nextSession?.date, "Europe/Amsterdam");

  return (
    <div>
      <div className="text-center">
        {shouldDoConfetti && <Confetti />}
        <p className="text-xl font-bold sm:text-2xl md:text-3xl text-gray-300 mb-6">
          Wanneer games?
        </p>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-12 leading-snug">
          {shouldDoConfetti && (
            <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-yellow-400 to-red-500">
              Nu!
            </span>
          )}
          {!shouldDoConfetti &&
            (nextSession ? (
              <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
                {formatRelativeTime(nextZonedDate)}
                <br />(
                {isToday(nextZonedDate)
                  ? nextZonedDate.toLocaleString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : nextZonedDate.toLocaleDateString("nl-NL", {
                      weekday: "long",
                    })}
                )
              </span>
            ) : (
              <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-red-400 to-pink-500">
                Onbekend!
              </span>
            ))}
        </h1>
        {nextSession.game && (
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-400 mb-12">
            Game: {nextSession.game}
          </p>
        )}
        {!nextSession && (
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-400 mb-12">
            -- Niks ingepland --
          </p>
        )}
        {futureSessions.length > 0 && (
          <div className="bg-gray-900/20 rounded-lg shadow-2xl backdrop-blur-md p-6 max-w-md mx-auto border border-gray-800">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-100">
              <CalendarDays className="mr-2 text-cyan-400" />
              Toekomstige sessies
            </h2>
            <ul className="space-y-2">
              {futureSessions.map(({ date, game }, index) => (
                <li key={index} className="text-lg text-gray-300">
                  {formatDateWithRelative(date)}
                  {game ? ` - ${game}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Button className="absolute bottom-4 right-4" asChild>
        <Link href="/ical.ics">
          <Calendar className="md:mr-1" />{" "}
          <span className="hidden md:inline">Toevoegen aan agenda</span>
        </Link>
      </Button>
    </div>
  );
}
