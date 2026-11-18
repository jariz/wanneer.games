import { test, expect } from "@playwright/test";

test("curator glass menu and confirmation keep a stable scroll range", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 260 });
  await page.addInitScript(() => localStorage.setItem("artwork-curator-v1", JSON.stringify({
    version: 1,
    games: [{ id: 1, name: "Example", candidates: [{ imageId: "ar1", kind: "artwork" }], selected: ["ar1"] }],
  })));
  await page.route("https://images.igdb.com/**", (route) => route.fulfill({
    headers: { "access-control-allow-origin": "*" },
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#334155"/></svg>',
  }));
  await page.goto("/artworks");
  await page.getByRole("button", { name: "Selection actions" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toHaveAttribute("data-glass-rendered", "");
  const menuScroll = menu.locator('[data-slot="menu-scroll"]');
  const menuHeight = await menuScroll.evaluate((element) => element.scrollHeight);
  for (let attempt = 0; attempt < 5; attempt++) {
    await menuScroll.evaluate(async (element) => {
      element.scrollTop = element.scrollHeight;
      for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame);
    });
    expect(await menuScroll.evaluate((element) => element.scrollHeight)).toBe(menuHeight);
    expect(await menu.evaluate((element) => element.scrollTop)).toBe(0);
  }
  await page.getByRole("menuitem", { name: "Clear all…" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toHaveAttribute("data-glass-rendered", "");
  await page.setViewportSize({ width: 390, height: 200 });
  const scroll = dialog.locator('[data-slot="dialog-scroll"]');
  const height = await scroll.evaluate((element) => element.scrollHeight);
  expect(height).toBeGreaterThan(await scroll.evaluate((element) => element.clientHeight));
  for (let attempt = 0; attempt < 5; attempt++) {
    await scroll.evaluate(async (element) => {
      element.scrollTop = element.scrollHeight;
      for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame);
    });
    expect(await scroll.evaluate((element) => element.scrollHeight)).toBe(height);
    expect(await dialog.evaluate((element) => element.scrollTop)).toBe(0);
  }
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Selection actions" })).toBeFocused();
});

test("curate with the keyboard, add a game, persist and export", async ({ page }) => {
  await page.route("**/artworks/data*", (route) => {
    const url = new URL(route.request().url());
    const added = url.searchParams.has("id");
    return route.fulfill({ json: url.searchParams.has("q") ? [{ id: 2, name: "Second game", cover: null }] : [{
      id: added ? 2 : 1, name: added ? "Second game" : "First game",
      candidates: added ? [{ imageId: "ar2", kind: "artwork", width: 3840, height: 2160 }] : [
        { imageId: "ar1", kind: "artwork", width: 3840, height: 2160 },
        { imageId: "ar3", kind: "screenshot", width: 1920, height: 1080 },
      ],
      selected: added ? [] : ["ar1"],
    }] });
  });
  await page.route("https://images.igdb.com/**", (route) => route.fulfill({
    headers: { "access-control-allow-origin": "*" },
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#334155"/></svg>',
  }));
  await page.goto("/artworks");
  const preview = page.getByTestId("artwork-preview");
  await expect(page.getByRole("tab", { name: "All", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("checkbox", { name: "Keep ar3" })).toHaveCount(0);
  await page.getByRole("tab", { name: /First game/ }).click();
  await expect(preview).toHaveAttribute("data-image-id", "ar1");
  await page.getByRole("button", { name: "Preview ar3", exact: true }).click();
  await expect(preview).toHaveAttribute("data-image-id", "ar3");
  await expect(page.getByRole("checkbox", { name: "Keep ar3" })).not.toBeChecked();
  const first = page.getByRole("checkbox", { name: "Keep ar1" });
  await expect(first).toBeChecked();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).not.toBeChecked();
  await expect(preview).toHaveAttribute("data-image-id", "ar3");
  await page.reload();
  await page.getByRole("tab", { name: /First game/ }).click();
  await expect(first).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Toon games" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Add a game", exact: true }).fill("S");
  await expect(page.getByText("Typ minstens 2 tekens om games te zoeken.")).toBeVisible();
  await page.getByRole("combobox", { name: "Add a game", exact: true }).fill("Second");
  await page.getByRole("option", { name: "Second game", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Add a game", exact: true })).toHaveValue("");
  await expect(page.getByRole("tab", { name: /Second game/ })).toBeVisible();
  const second = page.getByRole("checkbox", { name: "Keep ar2" });
  await second.focus();
  await page.keyboard.press("Space");
  await expect(second).toBeChecked();
  await page.getByRole("button", { name: "Selection actions" }).click();
  await page.getByRole("menuitem", { name: "Clear selection", exact: true }).click();
  await expect(second).not.toBeChecked();
  await page.getByRole("button", { name: "Selection actions" }).click();
  await page.getByRole("menuitem", { name: "Select all", exact: true }).click();
  await expect(second).toBeChecked();
  await expect(second).toHaveAttribute("data-checked");
  await page.getByRole("tab", { name: /First game/ }).click();
  await expect(page.getByRole("checkbox", { name: "Keep ar1" })).not.toBeChecked();
  await page.getByRole("tab", { name: /First game/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: /Second game/ })).toHaveAttribute("aria-selected", "true");
  await expect(second).toBeChecked();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({
    version: 1,
    games: [{ id: 1, name: "First game", artworkIds: [] }, { id: 2, name: "Second game", artworkIds: ["ar2"] }],
  });
  let saved: unknown;
  await page.route("**/artworks/save", (route) => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await page.getByRole("button", { name: "Save and apply artwork" }).click();
  await expect(page.getByText("Saved & applied")).toBeVisible();
  expect(saved).toEqual({ version: 1, games: [
    { id: 1, name: "First game", artworkIds: [] }, { id: 2, name: "Second game", artworkIds: ["ar2"] },
  ] });
  await page.getByRole("tab", { name: /First game/ }).click();
  await page.getByRole("checkbox", { name: "Keep ar1" }).click();
  await page.getByRole("button", { name: "Selection actions" }).click();
  await page.getByRole("menuitem", { name: "Clear all…" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Keep ar1" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Selection actions" })).toBeFocused();
  await page.getByRole("button", { name: "Selection actions" }).click();
  await page.getByRole("menuitem", { name: "Clear all…" }).click();
  await page.getByRole("button", { name: "Clear every selection", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Keep ar1" })).not.toBeChecked();
  await page.getByRole("tab", { name: /Second game/ }).click();
  await expect(second).not.toBeChecked();
  await page.screenshot({ path: "test-results/artwork-curator.png", fullPage: true });
  await page.getByRole("button", { name: "Remove Second game", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Second game/ })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /First game/ })).toBeFocused();
  await page.getByRole("button", { name: "Remove First game", exact: true }).click();
  await expect(page.getByText("Add a game to start choosing artwork.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Add a game" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(page.getByRole("tab", { name: "All", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("All previews only enabled artwork and updates its owning game", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("artwork-curator-v1", JSON.stringify({
    version: 1, games: [
      { id: 1, name: "First", candidates: [{ imageId: "ar1", kind: "artwork" }, { imageId: "ar2", kind: "artwork" }], selected: ["ar1"] },
      { id: 2, name: "Second", candidates: [{ imageId: "ar3", kind: "artwork" }], selected: ["ar3"] },
    ],
  })));
  await page.route("https://images.igdb.com/**", (route) => route.abort());
  await page.goto("/artworks");
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await expect(page.getByRole("checkbox", { name: "Keep ar2" })).toHaveCount(0);
  await page.getByRole("button", { name: "Preview ar3", exact: true }).click();
  await expect(page.getByTestId("artwork-preview")).toHaveAttribute("data-image-id", "ar3");
  await expect(page.getByTestId("artwork-preview").getByRole("heading", { name: "Second" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Keep ar3" }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(1);
  await page.getByRole("tab", { name: /Second/ }).click();
  await expect(page.getByRole("checkbox", { name: "Keep ar3" })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Keep ar3" }).click();
  await page.getByRole("tab", { name: "All", exact: true }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await page.getByRole("button", { name: "Next artwork", exact: true }).click();
  await expect(page.getByTestId("artwork-preview")).toHaveAttribute("data-image-id", "ar3");
});

test("overlapping additions survive an out-of-order response and client navigation", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/artworks/data*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const id = params.get("id");
    const query = params.get("q");
    if (query) return route.fulfill({ json: [{ id: query === "Second" ? 2 : 3, name: `${query} game`, cover: null }] });
    if (id === "2") await pending;
    return route.fulfill({ json: id ? [{ id: Number(id), name: id === "2" ? "Second game" : "Third game", candidates: [], selected: [] }] : [] });
  });
  await page.goto("/artworks");
  try {
    const picker = page.getByRole("combobox", { name: "Add a game" });
    const started = page.waitForRequest("**/artworks/data?id=2");
    await picker.fill("Second");
    await page.getByRole("option", { name: "Second game" }).click();
    await started;
    await picker.fill("Third");
    await page.getByRole("option", { name: "Third game" }).click();
    const third = page.getByRole("tab", { name: /Third game/ });
    const second = page.getByRole("tab", { name: /Second game/ });
    await expect(third).toBeVisible();
    release();
    await expect(second).toBeVisible();
    await expect(third).toBeVisible();
    await page.getByRole("link", { name: "wanneer.games" }).click();
    await expect(page).toHaveURL("/");
    await page.goBack();
    await expect(second).toBeVisible();
    await expect(third).toBeVisible();
  } finally {
    release();
  }
});
