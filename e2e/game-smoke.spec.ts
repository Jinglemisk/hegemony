import { expect, test } from "@playwright/test";

test("setup, forced decision, normal command, and deterministic reload", async ({ page }) => {
  await page.goto("/?setup=manual&seed=42&board=classic");

  await expect(page.getByText("Select a tile for your metropolis", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Hex -2,0,/ }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeVisible();
  await page.getByRole("button", { name: "Place metropolis" }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeHidden();
  await expect(page.locator(".turnbox strong")).toHaveText("Nikos");

  await page.goto("/?dev=preload&seed=42");
  const forcedDecision = page.getByRole("dialog");
  await expect(forcedDecision).toBeVisible();
  const decisionTitle = await forcedDecision.getByRole("heading").textContent();
  await forcedDecision
    .getByRole("button", { name: /^(Claim Event|Place Pops|Resolve Choice)$/ })
    .click();
  await expect(forcedDecision).toBeHidden();

  const endTurn = page.getByRole("button", { name: "End Turn" });
  await endTurn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".turnbox strong")).toHaveText("Nikos");

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(decisionTitle ?? "");
  await expect(page.locator(".turnbox strong")).toHaveText("Damon");
});
