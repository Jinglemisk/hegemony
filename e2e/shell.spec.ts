import { expect, test } from "@playwright/test";

/** The shell's windows: the seal and the outliner open the sidebar's drawers, a pick
 *  opens the place panel, and only one left window is open at a time. */
test("one left window: the seal, the outliner and a drawer's pick share it", async ({ page }) => {
  await page.goto("/?dev=late-game&seed=42");
  await page.locator(".living-map[data-ready]").waitFor();
  // The seat's fate card comes first: Rats.
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lose the Food", exact: true })
    .click();

  const left = page.locator('[data-c="drawer"], [data-c="place"]');
  const sidebar = page.getByRole("navigation", { name: "Drawers" });

  // The seal opens the Realm drawer and is pressed with it; a second press closes it.
  const seal = page.locator('[data-c="top-seal"]');
  await seal.click();
  const realm = page.getByRole("region", { name: /^Realm of / });
  await expect(realm).toBeVisible();
  await expect(seal).toHaveAttribute("aria-pressed", "true");
  await expect(sidebar.getByRole("button", { name: "Realm" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await seal.click();
  await expect(realm).toBeHidden();

  // The outliner's Assembly rows open the Agora drawer.
  const outliner = page.getByRole("complementary", { name: "Outliner" });
  await outliner.getByRole("button", { name: /^Next sitting/ }).click();
  await expect(page.getByRole("region", { name: "Agora", exact: true })).toBeVisible();
  await expect(left).toHaveCount(1);

  // A settlement's row picks it as the map does: the place panel, no way back.
  const places = outliner.getByRole("region", { name: "Your settlements" });
  const first = places.getByRole("button").nth(1);
  const name = ((await first.getAttribute("aria-label")) ?? "").split(",")[0];
  await first.click();
  const place = page.locator('[data-c="place"]');
  await expect(place).toBeVisible();
  await expect(place).toHaveAccessibleName(new RegExp(name, "i"));
  await expect(place.getByRole("button", { name: /^Back to / })).toHaveCount(0);
  await expect(left).toHaveCount(1);

  // A place picked from a drawer carries the way back to it.
  await sidebar.getByRole("button", { name: "Realm" }).click();
  await expect(place).toBeHidden();
  await page.locator(".lw-tabs").getByRole("tab", { name: "Cities" }).click();
  await page.locator('[data-c="drawer"] .lw-row').first().click();
  await expect(place).toBeVisible();
  await expect(left).toHaveCount(1);
  await place.getByRole("button", { name: "Back to Cities" }).click();
  await expect(page.locator('[data-c="drawer"][data-drawer="cities"]')).toBeVisible();
  await expect(left).toHaveCount(1);

  // The dock's Trade opens the composer over the board's centre.
  await page.keyboard.press("Escape");
  await expect(left).toHaveCount(0);
  await page
    .locator(".rd-acts")
    .getByRole("button", { name: /^Trade/ })
    .click();
  const compose = page.getByRole("region", { name: "Offer a trade" });
  await expect(compose).toBeVisible();
  const box = (await compose.boundingBox())!;
  const view = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - view.width / 2)).toBeLessThan(view.width * 0.1);
});
