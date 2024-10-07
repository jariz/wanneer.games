import { CalendarDays } from "lucide-react";
import { formatDistanceToNow, addDays } from "date-fns";
import { nl } from "date-fns/locale/nl";

export default function Component() {
  const now = new Date();
  const nextSessionDate = addDays(now, 3); // Example: Next session is in 3 days
  const futureDates = [
    addDays(nextSessionDate, 7),
    addDays(nextSessionDate, 14),
    addDays(nextSessionDate, 21),
    addDays(nextSessionDate, 28),
  ];

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

  return (
    <div>
      <div className="text-center">
        <p className="text-xl font-bold sm:text-2xl md:text-3xl text-gray-300 mb-6">
          Wanneer games?
        </p>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-12 leading-snug">
          <span className="bg-clip-text leading-3 text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
            {formatRelativeTime(nextSessionDate)}
            <br />(
            {nextSessionDate.toLocaleDateString("nl-NL", {
              weekday: "long",
            })}
            )
          </span>
        </h1>
        <div className="bg-gray-900/20 rounded-lg shadow-2xl backdrop-blur-md p-6 max-w-md mx-auto border border-gray-800">
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-100">
            <CalendarDays className="mr-2 text-cyan-400" />
            Alle ingeplande sessies
          </h2>
          <ul className="space-y-2">
            {futureDates.map((date, index) => (
              <li key={index} className="text-lg text-gray-300">
                {formatDateWithRelative(date)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
