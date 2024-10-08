import { CalendarDays } from "lucide-react";
import { formatDistanceToNow, isToday } from "date-fns";
import { nl } from "date-fns/locale/nl";

interface BookingResponse {
  bookings: Array<{
    status: string;
    startTime: string;
    responses: {
      game: string;
    };
  }>;
}

const fetchBookings = async () => {
  const response = await fetch(
    `https://api.cal.com/v1/bookings?apiKey=${process.env.NEXT_CAL_API_KEY}`,
    { next: { tags: ["bookings"] } },
  );
  const body: BookingResponse = await response.json();
  return body.bookings
    .filter((booking) => booking.status === "ACCEPTED")
    .map((booking) => ({
      game: booking.responses.game,
      date: new Date(booking.startTime),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

const formatRelativeTime = (date: Date) => {
  const distance = formatDistanceToNow(date, { addSuffix: true, locale: nl });
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

export default async function Component() {
  const bookings = await fetchBookings();
  const nextSession = bookings[0];
  const futureSessions = bookings.splice(1);

  return (
    <div>
      <div className="text-center">
        <p className="text-xl font-bold sm:text-2xl md:text-3xl text-gray-300 mb-6">
          Wanneer games?
        </p>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-4 leading-snug">
          {nextSession ? (
            <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
              {formatRelativeTime(nextSession.date)}
              <br />(
              {isToday(nextSession.date)
                ? nextSession.date.toLocaleString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : nextSession.date.toLocaleDateString("nl-NL", {
                    weekday: "long",
                  })}
              )
            </span>
          ) : (
            <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-red-400 to-pink-500">
              Onbekend!
            </span>
          )}
        </h1>
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-400 mb-12">
          {nextSession ? `Game: ${nextSession.game}` : "-- Niks ingepland --"}
        </p>
        {futureSessions.length > 0 && (
          <div className="bg-gray-900/20 rounded-lg shadow-2xl backdrop-blur-md p-6 max-w-md mx-auto border border-gray-800">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-100">
              <CalendarDays className="mr-2 text-cyan-400" />
              Alle ingeplande sessies
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
    </div>
  );
}
