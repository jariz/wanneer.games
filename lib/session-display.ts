import { formatInTimeZone } from "date-fns-tz";

export interface Session {
  id: string;
  start: string;
  end: string;
  game: string;
  igdbGameId?: number;
}

export const amsterdam = "Europe/Amsterdam";

export function dateLabel(date: string | Date, pattern: string) {
  return formatInTimeZone(new Date(date), amsterdam, pattern);
}

export function formatDate(date: string | number | Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("nl-NL", { timeZone: amsterdam, ...options }).format(new Date(date));
}

export function sessionTiming(session: Session | undefined, now: number) {
  if (!session) return { live: false, seconds: 0, days: "00", hours: "00", minutes: "00", ticks: "00" };
  const live = now >= new Date(session.start).getTime() && now < new Date(session.end).getTime();
  const seconds = Math.max(0, Math.floor((new Date(session.start).getTime() - now) / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    live, seconds,
    days: pad(Math.floor(seconds / 86400)),
    hours: pad(Math.floor(seconds / 3600) % 24),
    minutes: pad(Math.floor(seconds / 60) % 60),
    ticks: pad(seconds % 60),
  };
}
