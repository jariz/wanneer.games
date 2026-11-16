import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookie: "", setCookie: vi.fn(), createBooking: vi.fn(), updateTag: vi.fn(),
  hasAccess: true, slots: ["2026-11-15T09:00:00.000Z"],
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: mocks.cookie }), set: mocks.setCookie }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("@/shared/createBooking", () => ({ default: mocks.createBooking }));
vi.mock("@/lib/games", () => ({ searchGames: vi.fn() }));
vi.mock("@/lib/planning", () => ({
  getAvailability: async () => mocks.slots,
  validPlanningMonth: () => true,
  planningTimeZone: "Europe/Amsterdam",
}));

import { createHmac } from "node:crypto";
import { grantPlanningAccess, hasPlanningAccess, planningConfigured, validPassword } from "@/lib/planning-auth";
import { planSession } from "@/app/planning-actions";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T19:00:00Z"));
  vi.stubEnv("KIWIS_PLANNING_PASSWORD", "kiwis-test-password");
  vi.stubEnv("NIGLOS_PLANNING_PASSWORD", "niglos-test-password");
  vi.stubEnv("PLANNING_COOKIE_SECRET", "a".repeat(64));
  mocks.cookie = "";
  mocks.setCookie.mockClear();
  mocks.createBooking.mockReset().mockResolvedValue(undefined);
  mocks.updateTag.mockClear();
});

test("signed clan access rejects tampering, another clan, expiry, and password rotation", async () => {
  expect(validPassword("kiwis", "wrong")).toBe(false);
  expect(validPassword("kiwis", "kiwis-test-password")).toBe(true);
  expect(validPassword("kiwis", "Kiwis-TEST-Password")).toBe(true);
  expect(validPassword("kiwis", "niglos-test-password")).toBe(false);
  await grantPlanningAccess("kiwis");
  mocks.cookie = mocks.setCookie.mock.calls[0][1];
  expect(await hasPlanningAccess("kiwis")).toBe(true);
  expect(await hasPlanningAccess("niglos")).toBe(false);
  const token = mocks.cookie;
  mocks.cookie = token.replace("kiwis", "niglos");
  expect(await hasPlanningAccess("niglos")).toBe(false);
  mocks.cookie = token;
  vi.stubEnv("KIWIS_PLANNING_PASSWORD", "changed-password");
  expect(await hasPlanningAccess("kiwis")).toBe(false);
  vi.stubEnv("KIWIS_PLANNING_PASSWORD", "kiwis-test-password");
  vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
  expect(await hasPlanningAccess("kiwis")).toBe(false);
});

test("short passwords work, but cookies can't be forged by guessing them", async () => {
  vi.stubEnv("KIWIS_PLANNING_PASSWORD", "black");
  expect(planningConfigured("kiwis")).toBe(true);
  expect(validPassword("kiwis", "Black")).toBe(true);
  const value = `kiwis:${Math.floor(Date.now() / 1000) + 3600}`;
  mocks.cookie = `${value}.${createHmac("sha256", "black").update(value).digest("hex")}`;
  expect(await hasPlanningAccess("kiwis")).toBe(false);
  await grantPlanningAccess("kiwis");
  mocks.cookie = mocks.setCookie.mock.calls[0][1];
  expect(await hasPlanningAccess("kiwis")).toBe(true);
  vi.stubEnv("PLANNING_COOKIE_SECRET", "");
  expect(planningConfigured("kiwis")).toBe(false);
  expect(await hasPlanningAccess("kiwis")).toBe(false);
  vi.stubEnv("KIWIS_PLANNING_PASSWORD", "abc");
  vi.stubEnv("PLANNING_COOKIE_SECRET", "a".repeat(64));
  expect(planningConfigured("kiwis")).toBe(false);
});

test("booking action rejects unauthorized, stale, and unavailable slots before calling Cal", async () => {
  const input = { start: mocks.slots[0], game: "Valheim" };
  expect((await planSession("kiwis", input)).ok).toBe(false);
  await grantPlanningAccess("kiwis");
  mocks.cookie = mocks.setCookie.mock.calls[0][1];
  expect((await planSession("kiwis", { ...input, start: "2026-11-12T09:00:00.000Z" })).ok).toBe(false);
  expect((await planSession("kiwis", { ...input, start: "2026-11-15T10:00:00.000Z" })).ok).toBe(false);
  expect(mocks.createBooking).not.toHaveBeenCalled();
});

test("successful booking preserves game metadata and invalidates only after Cal succeeds", async () => {
  await grantPlanningAccess("kiwis");
  mocks.cookie = mocks.setCookie.mock.calls[0][1];
  const input = { start: mocks.slots[0], game: "Valheim with friends", igdbGameId: 104967 };
  expect((await planSession("kiwis", input)).ok).toBe(true);
  expect(mocks.createBooking).toHaveBeenCalledWith({ group: "kiwis", start: new Date(input.start), game: input.game, igdbGameId: input.igdbGameId });
  expect(mocks.updateTag).toHaveBeenCalledWith("bookings");
  mocks.updateTag.mockClear();
  mocks.createBooking.mockRejectedValueOnce(new Error("Cal unavailable"));
  expect((await planSession("kiwis", input)).ok).toBe(false);
  expect(mocks.updateTag).not.toHaveBeenCalled();
});
