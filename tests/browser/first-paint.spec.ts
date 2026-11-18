import { test, expect } from "@playwright/test";

test("closed popups stay hidden and clan tabs stay in place through hydration", async ({ page }) => {
  let hydrate!: () => void;
  const scriptsReady = new Promise<void>((resolve) => { hydrate = resolve; });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "script") await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const tabs = page.getByRole("tablist", { name: "Kies je clan" });
    await expect(tabs).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(tabs).not.toHaveAttribute("data-hydrated");
    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toBeHidden();
    for (const popup of await page.locator('dialog, [data-slot][hidden]:not([hidden="until-found"])').all()) {
      await expect(popup).toBeHidden();
    }
    const before = await tabs.boundingBox();
    hydrate();
    await expect(tabs).toHaveAttribute("data-hydrated", "true");
    await expect.poll(() => tabs.boundingBox()).toEqual(before);
    await page.getByRole("button", { name: "Koppel je agenda", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    hydrate();
  }
});
