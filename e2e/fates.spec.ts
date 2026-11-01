import { expect, test } from "@playwright/test";

test("declines a pop card to the bottom of the player deck", async ({ page }) => {
  // The second seat drew Free Settlers at its income.
  await page.goto("/?dev=fate-pop&seed=42");
  await page.locator(".living-map[data-ready]").waitFor();
  const fate = page.getByRole("dialog", { name: "Free Settlers", exact: true });
  await expect(fate).toContainText("the card goes to the bottom of the player deck");
  await expect(fate.getByRole("button", { name: "Place Pop", exact: true })).toBeEnabled();

  await fate.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(fate).toBeHidden();
  await expect(
    page.getByRole("button", { name: /^Chronicle: .*declined Free Settlers\./ }),
  ).toBeVisible();
});
