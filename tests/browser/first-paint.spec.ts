import { test, expect } from "@playwright/test";

test("static artwork stays visible until the canvas is ready without replaying its fade", async ({ page }) => {
  await page.addInitScript(() => {
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!;
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      ...src,
      set(value: string) {
        if (this.crossOrigin === "anonymous") {
          document.documentElement.dataset.textureRequested = "";
          window.addEventListener("load-test-artwork", () => src.set!.call(this, value), { once: true });
        } else {
          src.set!.call(this, value);
        }
      },
    });
    const observer = new MutationObserver(() => {
      if (!document.documentElement.hasAttribute("data-lens-active")) return;
      const canvas = document.querySelector("canvas");
      const gl = canvas?.getContext("webgl2");
      const program = gl?.getParameter(gl.CURRENT_PROGRAM);
      if (gl && program) {
        const progress = gl.getUniformLocation(program, "progress");
        if (progress) document.documentElement.dataset.initialArtworkProgress = String(gl.getUniform(program, progress));
      }
      observer.disconnect();
    });
    observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-lens-active"] });
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-texture-requested", "");
    const fallback = page.getByTestId("backdrop").locator("[data-active]");
    await expect(fallback).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-lens-active");
    await page.evaluate(() => window.dispatchEvent(new Event("load-test-artwork")));
    await expect(page.locator("html")).toHaveAttribute("data-lens-active", "");
    await expect(page.locator("html")).toHaveAttribute("data-initial-artwork-progress", "1");
    await expect(fallback).toBeHidden();
  } finally {
    await page.evaluate(() => window.dispatchEvent(new Event("load-test-artwork")));
  }
});

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
