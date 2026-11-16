"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { isClan } from "@/shared/clans";
import { allowPlanningAttempt, grantPlanningAccess, hasPlanningAccess, validPassword } from "@/lib/planning-auth";
import { getAvailability, validPlanningMonth } from "@/lib/planning";
import { amsterdam } from "@/lib/session-display";
import createBooking from "@/shared/createBooking";
import { searchGames } from "@/lib/games";

export async function unlockPlanning(group: string, password: string) {
  if (!isClan(group) || typeof password !== "string" || password.length > 256) {
    return { ok: false, message: "Dat wachtwoord klopt niet." };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowPlanningAttempt(`unlock:${group}:${ip}`)) {
    return { ok: false, message: "Te veel pogingen. Probeer het over 15 minuten opnieuw." };
  }
  if (!validPassword(group, password)) return { ok: false, message: "Dat wachtwoord klopt niet." };
  await grantPlanningAccess(group);
  return { ok: true, message: "" };
}

export async function loadPlanningMonth(group: string, month: string) {
  if (!isClan(group) || !(await hasPlanningAccess(group))) {
    return { ok: false as const, message: "Je toegang is verlopen. Ontgrendel de planner opnieuw." };
  }
  if (!validPlanningMonth(month)) return { ok: false as const, message: "Kies een maand binnen de komende drie maanden." };
  try {
    return { ok: true as const, slots: await getAvailability(group, month) };
  } catch {
    return { ok: false as const, message: "Beschikbaarheid laden lukt even niet. Probeer opnieuw." };
  }
}

const bookingSchema = z.object({
  start: z.iso.datetime(),
  game: z.string().trim().max(120),
  igdbGameId: z.number().int().positive().optional(),
});
const activeBookings = new Set<string>();

export async function planSession(group: string, input: unknown) {
  if (!isClan(group) || !(await hasPlanningAccess(group))) {
    return { ok: false as const, message: "Je toegang is verlopen. Ontgrendel de planner opnieuw." };
  }
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Controleer je datum en game (maximaal 120 tekens)." };
  const { start, game, igdbGameId } = parsed.data;
  const month = formatInTimeZone(new Date(start), amsterdam, "yyyy-MM");
  if (new Date(start).getTime() <= Date.now() || !validPlanningMonth(month)) {
    return { ok: false as const, message: "Kies een toekomstig tijdstip binnen drie maanden." };
  }
  const key = `${group}:${start}`;
  if (activeBookings.has(key)) return { ok: false as const, message: "Deze sessie wordt al ingepland." };
  if (!allowPlanningAttempt(`book:${group}`, 30)) return { ok: false as const, message: "Te veel verzoeken. Probeer het later opnieuw." };
  activeBookings.add(key);
  try {
    const slots = await getAvailability(group, month);
    if (!slots.some((slot) => new Date(slot).getTime() === new Date(start).getTime())) {
      return { ok: false as const, message: "Dit tijdstip is net bezet geraakt. Kies een ander moment." };
    }
    await createBooking({ group, start: new Date(start), game, igdbGameId });
    updateTag("bookings");
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "Inplannen is niet bevestigd. Ververs de agenda voordat je opnieuw probeert." };
  } finally {
    activeBookings.delete(key);
  }
}

export async function findPlanningGames(group: string, query: string) {
  if (!isClan(group) || !(await hasPlanningAccess(group)) || typeof query !== "string" || query.length > 80) {
    return [];
  }
  if (!allowPlanningAttempt(`games:${group}`, 120)) return [];
  return searchGames(query);
}
