import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";

function localEnv(key: string) {
  const text = readFileSync(".env.local", "utf8");
  const value = text.split("\n").find((line) => line.startsWith(`${key}=`))?.split("=").slice(1).join("=");
  if (!value) throw new Error(`Set a local ${key} to test planning.`);
  return value;
}

const localPassword = () => localEnv("KIWIS_PLANNING_PASSWORD");

// Mirrors lib/planning-auth.ts: signed with the cookie secret, over the password's hash.
function accessCookie(clan: string, password: string) {
  const value = `${clan}:${Math.floor(Date.now() / 1000) + 3600}`;
  const passwordHash = createHash("sha256").update(password.toLowerCase()).digest("hex");
  return `${value}.${createHmac("sha256", localEnv("PLANNING_COOKIE_SECRET")).update(`${value}:${passwordHash}`).digest("hex")}`;
}

test("clan password unlocks only its own planner; Escape returns focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Inplannen", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-glass-rendered", "");
  await expect(page.getByRole("dialog")).toHaveCSS("pointer-events", "auto");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByLabel("Clanwachtwoord", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Ontgrendel de planner" }).click();
  await expect(page.getByText("Dat wachtwoord klopt niet.")).toBeVisible();
  await page.getByLabel("Clanwachtwoord", { exact: true }).fill(localPassword());
  await page.getByRole("button", { name: "Ontgrendel de planner" }).click();
  await expect(page).toHaveURL(/\/kiwis\/inplannen/);
  await expect(page.getByRole("heading", { name: "Prik een sessie." })).toBeVisible();
  await page.goto("/niglos/inplannen");
  await expect(page.getByRole("button", { name: "Ontgrendel planner", exact: true })).toBeVisible();
});

test("planner calendar, game artwork, and agent actions work without creating a booking", async ({ page, context }) => {
  await context.addCookies([{ name: "planning-kiwis", value: accessCookie("kiwis", localPassword()), domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/Glass backdrop disabled|GL_INVALID|WebGL:.*error/i.test(message.text())) errors.push(message.text());
  });
  await page.goto("/kiwis/inplannen");
  const book = page.getByRole("complementary", { name: "Game en sessie" }).getByRole("button", { name: "Inplannen" });
  await expect(book).toBeDisabled();
  const day = page.locator('[data-slot="calendar-day"]:not([data-disabled]):not([data-unavailable]):not([data-outside])').first();
  await day.click();
  const time = page.getByRole("radiogroup", { name: "Kies een starttijd" }).getByRole("radio").first();
  await time.click();
  await expect(time).toHaveAttribute("aria-checked", "true");
  await expect(day).toHaveAttribute("data-glass-rendered", "");
  await expect(time).toHaveAttribute("data-glass-rendered", "");
  const selectedColors = await day.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rgb = (key: string) => `rgb(${root.getPropertyValue(key).trim().split(/\s+/).join(", ")})`;
    return { brand: rgb("--brand"), canvas: rgb("--canvas") };
  });
  await expect(day).toHaveCSS("background-color", selectedColors.brand);
  await expect(day).toHaveCSS("color", selectedColors.canvas);
  await expect(book).toBeEnabled();
  await page.getByRole("button", { name: "Toon games" }).click();
  await expect(page.locator('[data-slot="combobox-content"]')).toHaveAttribute("data-glass-rendered", "");
  await page.getByRole("option", { name: "Valheim", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Game" })).toHaveValue("Valheim");
  await expect(page.getByTestId("backdrop").locator("[data-active]")).toHaveAttribute("data-game", "Valheim");
  const result = await page.evaluate(async () => {
    const agent = (window as unknown as { wanneerAgent: {
      snapshot: () => { ref: string; label?: string; component: string; offPage?: boolean; confirm?: string }[];
      act: (input: { steps: { ref: string; action: string; args?: unknown[] }[] }) => Promise<{ ok: boolean; error?: { message: string } }>;
    } }).wanneerAgent;
    const snapshot = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== "more");
    const unnamed = snapshot.filter((entry) => !entry.label);
    const changed = await agent.act({ steps: [{ ref: "Game", action: "setValue", args: ["Valheim met de ploeg"] }] });
    const booking = snapshot.find((entry) => entry.confirm);
    const refused = await agent.act({ steps: [{ ref: booking?.ref ?? "missing", action: "press" }] });
    return { unnamed, labels: snapshot.map((entry) => entry.label), changed, refused };
  });
  expect(result.unnamed).toEqual([]);
  expect(result.labels).toContain("Kies een speeldag");
  expect(result.labels).toContain("Kies een starttijd");
  expect(result.changed.ok, result.changed.error?.message).toBe(true);
  expect(result.refused.ok).toBe(false);
  expect(result.refused.error?.message).toContain("Maakt een echte Cal.com-afspraak");
  await expect(page.getByRole("combobox", { name: "Game" })).toHaveValue("Valheim met de ploeg");
  expect(errors).toEqual([]);
});

test("mobile lobby fits and subscription dialog closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Koppel je agenda", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: /Google Agenda/ })).toHaveAttribute("href", /cid=/);
  await page.getByRole("button", { name: "Sluit agenda koppelen" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("glass keeps its CSS fallback when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this, type, ...args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("tab", { name: /Kiwi/ })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-lens-active", "");
  await expect(page.locator("[data-glass-rendered]")).toHaveCount(0);
  const glass = await page.locator("header.glass").evaluate((element) => {
    const style = getComputedStyle(element);
    return { blur: style.backdropFilter, background: style.backgroundColor };
  });
  expect(glass.blur).toContain("blur(");
  expect(glass.background).not.toBe("rgba(0, 0, 0, 0)");
});

test("scrolling reuses the artwork instead of repainting the glass backdrop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("header")).toHaveAttribute("data-glass-rendered", "");
  const result = await page.evaluate(async () => {
    const artwork = document.querySelector('[data-testid="backdrop"]')!.previousElementSibling as HTMLCanvasElement;
    // Complete pending artwork loads before measuring scroll-only work.
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    await new Promise((resolve) => setTimeout(resolve, 300));
    let draws = 0;
    const onDraw = () => draws++;
    artwork.addEventListener("artwork-frame", onDraw);
    const before = artwork.getBoundingClientRect().top;
    const start = scrollY;
    scrollTo(0, 80);
    for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame);
    artwork.removeEventListener("artwork-frame", onDraw);
    return { draws, moved: before - artwork.getBoundingClientRect().top, scrolled: scrollY - start };
  });
  expect(result.scrolled).toBeGreaterThan(0);
  expect(result.moved).toBeCloseTo(result.scrolled);
  expect(result.draws).toBe(0);
});
