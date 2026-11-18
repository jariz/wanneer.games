import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the clan indicator slides using only transform (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");

    const tabs = page.getByRole("tablist", { name: "Kies je clan" });
    const kiwis = tabs.getByRole("tab", { name: "Kiwi's" });
    const niglos = tabs.getByRole("tab", { name: "Niglo's" });
    const indicator = tabs.locator('[data-slot="tabs-indicator"]');
    await expect(kiwis).toHaveAttribute("aria-selected", "true");
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveCSS("transition-property", "none");

    await indicator.evaluate((element) => {
      element.addEventListener("transitionrun", (event) => {
        const property = (event as TransitionEvent).propertyName;
        element.setAttribute("data-test-transitions", `${element.getAttribute("data-test-transitions") ?? ""}${property} `);
      });
    });
    await niglos.click();

    await expect(page).toHaveURL(/\/niglos$/);
    await expect(niglos).toHaveAttribute("aria-selected", "true");
    await expect(kiwis).toHaveAttribute("aria-selected", "false");
    await expect(indicator).toHaveCSS("transition-property", reducedMotion === "reduce" ? "none" : "transform");
    if (reducedMotion === "no-preference") {
      await expect(indicator).toHaveAttribute("data-test-transitions", "transform ");
    }
    await expect.poll(async () => {
      const [marker, tab] = await Promise.all([indicator.boundingBox(), niglos.boundingBox()]);
      if (!marker || !tab) return Infinity;
      return Math.max(...(["x", "y", "width", "height"] as const).map((key) => Math.abs(marker[key] - tab[key])));
    }).toBeLessThan(1);
  });
}
