import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Clan } from "./clans";

const lifetime = 30 * 24 * 60 * 60;

function passwordFor(group: Clan) {
  return process.env[`${group.toUpperCase()}_PLANNING_PASSWORD`];
}

function cookieSecret() {
  const secret = process.env.PLANNING_COOKIE_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

// Short, hinted passwords are fine because guesses only go through the rate-limited form:
// cookies are signed with a server secret, so they can't be forged to test a guess.
export function planningConfigured(group: Clan) {
  return (passwordFor(group)?.length ?? 0) >= 4 && cookieSecret() !== null;
}

// Not case-sensitive: the clans type it from a hint, often on a phone.
export function validPassword(group: Clan, password: string) {
  const expected = passwordFor(group);
  if (!expected || !planningConfigured(group)) return false;
  const hash = (value: string) => createHash("sha256").update(value.toLowerCase()).digest();
  return timingSafeEqual(hash(password), hash(expected));
}

// Signing over the password's hash logs everyone out of a clan when its password changes.
function signature(group: Clan, value: string) {
  const password = createHash("sha256").update(passwordFor(group)?.toLowerCase() ?? "").digest("hex");
  return createHmac("sha256", cookieSecret() ?? "").update(`${value}:${password}`).digest("hex");
}

export async function grantPlanningAccess(group: Clan) {
  const value = `${group}:${Math.floor(Date.now() / 1000) + lifetime}`;
  (await cookies()).set(`planning-${group}`, `${value}.${signature(group, value)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: lifetime,
  });
}

export async function hasPlanningAccess(group: Clan) {
  if (!planningConfigured(group)) return false;
  const token = (await cookies()).get(`planning-${group}`)?.value;
  if (!token) return false;
  const [value, supplied] = token.split(".");
  if (!value || !supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  const [clan, expiry] = value.split(":");
  if (clan !== group || Number(expiry) <= Date.now() / 1000 || !Number.isFinite(Number(expiry))) return false;
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(group, value), "hex"));
}

const attempts = new Map<string, { count: number; expires: number }>();

export function allowPlanningAttempt(key: string, limit = 10) {
  const now = Date.now();
  for (const [id, entry] of attempts) {
    if (entry.expires <= now) attempts.delete(id);
  }
  const entry = attempts.get(key) ?? { count: 0, expires: now + 15 * 60_000 };
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count <= limit;
}
