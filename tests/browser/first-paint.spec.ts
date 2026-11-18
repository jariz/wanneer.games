import { test, expect } from "@playwright/test";

test("artwork stays hidden until the ready canvas fades in", async ({ page }) => {
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
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="artwork-canvas"]');
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
    await expect(fallback).toBeHidden();
    const canvas = page.getByTestId("artwork-canvas");
    await expect(canvas).toHaveCSS("opacity", "0");
    await expect(page.locator("html")).not.toHaveAttribute("data-lens-active");
    await page.evaluate(() => window.dispatchEvent(new Event("load-test-artwork")));
    await expect(page.locator("html")).toHaveAttribute("data-lens-active", "");
    await expect(page.locator("html")).toHaveAttribute("data-initial-artwork-progress", "1");
    await expect(canvas).toHaveCSS("transition-duration", "0.5s");
    await expect(canvas).toHaveCSS("opacity", "1");
    await expect(fallback).toBeHidden();
  } finally {
    await page.evaluate(() => window.dispatchEvent(new Event("load-test-artwork")));
  }
});

test("static artwork appears when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      if (args[0] === "webgl2") return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(page.getByTestId("backdrop")).toHaveAttribute("data-fallback", "");
  await expect(page.getByTestId("backdrop").locator("[data-active]")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-lens-active");
});

test("WebGL artwork recovers after a texture request fails", async ({ page }) => {
  await page.route("**/artworks/data", (route) => route.fulfill({ json: [{
    id: 1, name: "Example", selected: ["good", "broken", "next"],
    candidates: ["good", "broken", "next"].map((imageId) => ({ imageId, kind: "artwork" })),
  }] }));
  await page.route("https://images.igdb.com/**", (route) => (
    route.request().url().includes("/broken.jpg") ? route.abort() : route.fulfill({
      headers: { "access-control-allow-origin": "*" },
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="#567"/></svg>',
    })
  ));
  await page.goto("/artworks");
  const root = page.locator("html");
  const backdrop = page.getByTestId("backdrop");
  const next = page.getByRole("button", { name: "Next artwork" });
  await expect(root).toHaveAttribute("data-lens-active", "");
  await next.click();
  await expect(backdrop).toHaveAttribute("data-fallback", "");
  await expect(root).not.toHaveAttribute("data-lens-active");
  await next.click();
  await expect(root).toHaveAttribute("data-lens-active", "");
  await expect(backdrop).not.toHaveAttribute("data-fallback");
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
