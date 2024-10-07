import { CalendarDays } from "lucide-react";
import { formatDistanceToNow, addDays } from "date-fns";
import { nl } from "date-fns/locale/nl";
import Background from "@/components/Background";

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
      <Background />
      <div className="flex flex-col items-center justify-center min-h-screen z-10 relative p-4 text-gray-100">
        <main className="text-center">
          <p className="text-xl font-bold sm:text-2xl md:text-3xl text-gray-300 mb-12">
            Wanneer gaming?
          </p>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-snug">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
              {formatRelativeTime(nextSessionDate)}
            </span>
          </h1>
          <div className="bg-gray-900 rounded-lg shadow-2xl shadow-purple-500/20 p-6 max-w-md mx-auto border border-gray-800">
            <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-gray-100">
              <CalendarDays className="mr-2 text-cyan-400" />
              Upcoming Sessions
            </h2>
            <ul className="space-y-4">
              {futureDates.map((date, index) => (
                <li key={index} className="text-lg text-gray-300">
                  {formatDateWithRelative(date)}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
