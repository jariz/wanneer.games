import "server-only";
import { addMonths } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { env } from "@/env";
import eventTypeMap from "@/shared/eventTypeMap";
import type { Clan } from "./clans";

export const planningTimeZone = "Europe/Amsterdam";

export function currentPlanningMonth() {
  return formatInTimeZone(new Date(), planningTimeZone, "yyyy-MM");
}

export function validPlanningMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return false;
  const current = currentPlanningMonth();
  const latest = formatInTimeZone(addMonths(new Date(), 3), planningTimeZone, "yyyy-MM");
  return month >= current && month <= latest;
}

export async function getAvailability(group: Clan, month: string) {
  if (!validPlanningMonth(month)) throw new Error("Ongeldige maand.");
  const start = fromZonedTime(`${month}-01T00:00:00`, planningTimeZone);
  const nextMonth = addMonths(new Date(`${month}-01T12:00:00Z`), 1).toISOString().slice(0, 7);
  const end = fromZonedTime(`${nextMonth}-01T00:00:00`, planningTimeZone);
  const params = new URLSearchParams({
    eventTypeId: String(eventTypeMap[group]),
    startTime: new Date(Math.max(start.getTime(), Date.now())).toISOString(),
    endTime: end.toISOString(),
  });
  const response = await fetch(`https://api.cal.com/v2/slots/available?${params}`, {
    cache: "no-store",
    headers: { Authorization: env.NEXT_CAL_API_KEY, "Cal-Api-Version": "2024-08-13" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Cal is even niet bereikbaar. Probeer het nog eens.");
  const body: { data: { slots: Record<string, { time: string }[]> } } = await response.json();
  return Object.values(body.data.slots).flat().map(({ time }) => time).sort();
}
