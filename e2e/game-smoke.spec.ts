import { expect, test } from "@playwright/test";

test("setup, forced decision, normal command, and deterministic reload", async ({ page }) => {
  await page.goto("/?setup=manual&seed=42&board=classic");

  await expect(page.getByText("Select a tile for your metropolis", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Hex -2,0,/ }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeVisible();
  await page.getByRole("button", { name: "Place metropolis" }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeHidden();
  // Whose turn it is lives on the END TURN seal now, not in a separate box.
  await expect(page.locator(".turnSealActor")).toHaveText("NIKOS ACTS");

  await page.goto("/?dev=preload&seed=42");
  const forcedDecision = page.getByRole("dialog");
  await expect(forcedDecision).toBeVisible();
  const decisionTitle = await forcedDecision.getByRole("heading").textContent();
  await forcedDecision
    // A fate's commit verb takes the card's mood now — you ENDURE a wound and
    // TAKE a gift; only a choice or a placement keeps a procedural label.
    .getByRole("button", { name: /^(Endure It|Take It|So Be It|Place Pops|Resolve Choice)$/ })
    .click();
  await expect(forcedDecision).toBeHidden();

  const endTurn = page.getByRole("button", { name: /^End turn/i });
  await endTurn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".turnSealActor")).toHaveText("NIKOS ACTS");

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(decisionTitle ?? "");
  await expect(page.locator(".turnSealActor")).toHaveText("DAMON ACTS");
});
