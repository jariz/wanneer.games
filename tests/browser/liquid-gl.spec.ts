import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Exercise the installed dependency patch independently of Cal/IGDB and React.
const source = readFileSync("node_modules/liquid-gl/liquidGL.js", "utf8")
  .replace("export default liquidGL;", "");

// On macOS, Chromium's software ANGLE path cannot reliably copy a WebGL-backed
// 2D canvas into WebGPU. Use Metal for this cross-backend integration test.
test.use({ launchOptions: { args: [
  "--enable-unsafe-webgpu",
  ...(process.platform === "darwin" ? ["--use-angle=metal"] : []),
] } });

for (const engine of ["webgl2", "webgpu"]) {
  test(`live artwork preserves foreground without recapturing the page (${engine})`, async ({ page }) => {
    await page.route("**/glass-fixture", (route) => route.fulfill({
      contentType: "text/html",
      body: `<style>
        body { margin: 0; background: black; }
        #scene { position: relative; width: 800px; height: 1600px; background: rgb(20, 20, 20); }
        #art { position: absolute; top: 0; left: 0; width: 800px; height: 600px; z-index: 0; }
        #foreground { position: absolute; left: 80px; top: 80px; width: 60px; height: 60px; background: rgb(0, 255, 0); opacity: .5; z-index: 1; }
        #lens { position: absolute; left: 40px; top: 40px; width: 400px; height: 700px; z-index: 2; }
      </style><div id="scene"><canvas id="art" width="800" height="600"></canvas><div id="foreground"></div><div id="lens"></div></div>`,
    }));
    await page.goto("/glass-fixture");
    if (engine === "webgpu") {
      const available = await page.evaluate(async () => {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
        return !!await gpu?.requestAdapter();
      });
      test.skip(!available, "WebGPU adapter unavailable");
    }
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addScriptTag({ content: source });
    await page.evaluate((engine) => {
      // Private renderer access is intentional: count expensive captures and
      // inspect the exact texture uploads, rather than inferring from FPS.
      const w = window as unknown as {
        liquidGL: {
          (options: Record<string, unknown>): { destroy(): void };
          registerBackdrop(canvas: HTMLCanvasElement): { update(): void; destroy(): void };
          registerDynamic(elements: Element[]): void;
        };
        __liquidGLRenderer__: {
          hasTexture: boolean;
          _capturing: boolean;
          captureSnapshot(): Promise<boolean>;
          backend: { uploadRegion(x: number, y: number, canvas: HTMLCanvasElement): void };
        };
        fixture: unknown;
      };
      const canvas = document.querySelector<HTMLCanvasElement>("#art")!;
      const gl = canvas.getContext("webgl2", { alpha: false, preserveDrawingBuffer: true })!;
      gl.clearColor(1, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const backdrop = w.liquidGL.registerBackdrop(canvas);
      const lens = w.liquidGL({
        target: "#lens", snapshot: "#scene", engine, resolution: 1,
        content: false, refraction: 0, bevelDepth: 0, frost: 0,
        magnify: 1, shadow: false, specular: false, reveal: "none",
      });
      const renderer = w.__liquidGLRenderer__;
      const fixture = {
        captures: 0, uploads: 0, area: 0, pixels: [] as number[][],
        ready: () => renderer.hasTexture && !renderer._capturing,
        draw: () => {
          gl.clearColor(0, 0, 1, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          backdrop.update();
        },
        refresh: () => w.liquidGL.registerDynamic([]),
        destroy: () => { lens.destroy(); backdrop.destroy(); },
      };
      const capture = renderer.captureSnapshot.bind(renderer);
      renderer.captureSnapshot = () => { fixture.captures++; return capture(); };
      // Backend selection is async; install the upload spy once ready.
      const install = () => {
        if (!renderer.backend) return requestAnimationFrame(install);
        const upload = renderer.backend.uploadRegion.bind(renderer.backend);
        renderer.backend.uploadRegion = (x, y, image) => {
          fixture.uploads++;
          fixture.area = image.width * image.height;
          const ctx = image.getContext("2d")!;
          fixture.pixels = [[100, 100], [200, 200], [200, 650]].map(([px, py]) =>
            Array.from(ctx.getImageData(px - x, py - y, 1, 1).data));
          upload(x, y, image);
        };
      };
      install();
      w.fixture = fixture;
    }, engine);
    const state = () => page.evaluate(() => {
      const f = (window as unknown as { fixture: { captures: number; uploads: number; area: number; pixels: number[][]; ready(): boolean } }).fixture;
      return { captures: f.captures, uploads: f.uploads, area: f.area, pixels: f.pixels, ready: f.ready() };
    });
    await expect.poll(async () => (await state()).ready).toBe(true);
    // Let the initial ResizeObserver capture settle before measuring animation.
    await page.waitForTimeout(500);
    const before = await state();
    await page.evaluate(async () => {
      const f = (window as unknown as { fixture: { draw(): void } }).fixture;
      for (let frame = 0; frame < 20; frame++) {
        f.draw();
        await new Promise(requestAnimationFrame);
      }
    });
    await expect.poll(async () => (await state()).uploads).toBeGreaterThan(before.uploads + 10);
    const after = await state();
    expect(after.captures).toBe(before.captures);
    expect(after.area).toBeLessThan(800 * 1600);
    expect(after.pixels[0][0]).toBe(0);
    expect(after.pixels[0][1]).toBeGreaterThanOrEqual(127);
    expect(after.pixels[0][2]).toBeGreaterThanOrEqual(127);
    expect(after.pixels[1]).toEqual([0, 0, 255, 255]);
    expect(after.pixels[2]).toEqual([20, 20, 20, 255]);
    await page.waitForTimeout(200);
    expect((await state()).uploads).toBe(after.uploads);

    await page.evaluate(() => {
      document.querySelector<HTMLElement>("#foreground")!.style.backgroundColor = "rgb(255, 0, 0)";
      (window as unknown as { fixture: { refresh(): void } }).fixture.refresh();
    });
    await expect.poll(async () => (await state()).pixels[0][0]).toBeGreaterThanOrEqual(127);
    expect((await state()).pixels[0][1]).toBe(0);
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect.poll(async () => (await state()).captures).toBeGreaterThan(after.captures + 1);
    await page.evaluate(() => (window as unknown as { fixture: { destroy(): void } }).fixture.destroy());
    await expect(page.locator("canvas[data-liquid-ignore]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("the app's artwork-frame handler does not request page captures", async ({ page }) => {
  await page.goto("/?liquidGL-engine=webgl2");
  await expect(page.locator("[data-glass-rendered]").first()).toBeVisible();
  await page.waitForTimeout(2000);
  const captures = await page.evaluate(async () => {
    const renderer = (window as unknown as {
      __liquidGLRenderer__: { captureSnapshot(): Promise<boolean> };
    }).__liquidGLRenderer__;
    const capture = renderer.captureSnapshot.bind(renderer);
    let count = 0;
    renderer.captureSnapshot = () => { count++; return capture(); };
    const artwork = document.querySelector('[data-testid="backdrop"]')!.previousElementSibling!;
    try {
      for (let frame = 0; frame < 30; frame++) {
        artwork.dispatchEvent(new Event("artwork-frame"));
        await new Promise(requestAnimationFrame);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      return count;
    } finally {
      renderer.captureSnapshot = capture;
    }
  });
  expect(captures).toBe(0);
});
