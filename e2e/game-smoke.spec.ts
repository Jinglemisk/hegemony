import { expect, test } from "@playwright/test";

test("setup, forced decision, normal command, and deterministic reload", async ({ page }) => {
  await page.goto("/?setup=manual&seed=42&board=classic");

  await expect(page.getByText("Select a tile for your metropolis", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Hex -2,0,/ }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeVisible();
  await page.getByRole("button", { name: "Place metropolis" }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeHidden();
  // Whose turn it is lives on the turn dial in the top bar, and when the seat is
  // not yours the dial is a status disc rather than a button — so the assertion
  // is on its accessible name, which is the only place the sentence is written.
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();

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

  // Ending a turn is a press and HOLD — a single Enter is exactly the accidental
  // commit the gesture exists to refuse, so pressing one must leave the turn
  // where it was before the hold is exercised for real.
  const endTurn = page.getByRole("button", { name: /^End turn/i });
  await endTurn.focus();
  await page.keyboard.press("Enter");
  await expect(endTurn).toBeVisible();

  await page.keyboard.down("Enter");
  await page.waitForTimeout(900);
  await page.keyboard.up("Enter");
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(decisionTitle ?? "");
  await expect(page.getByRole("img", { name: /Damon is acting/ })).toBeVisible();
});
