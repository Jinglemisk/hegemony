import { expect, test } from "@playwright/test";

test("setup, forced decision, normal command, and deterministic reload", async ({ page }) => {
  await page.goto("/?setup=manual&seed=42&board=classic");

  await expect(page.getByText("Select a tile for your metropolis", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Hex -2,0,/ }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeVisible();
  await page.getByRole("button", { name: "Place metropolis" }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeHidden();
  // Whose turn it is lives on the end-turn disc: when the seat is not yours it is
  // a status disc rather than a button, so the assertion is on its accessible name.
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();

  await page.goto("/?dev=preload&seed=42");
  const forcedDecision = page.getByRole("dialog");
  await expect(forcedDecision).toBeVisible();
  const decisionTitle = await forcedDecision.getByRole("heading").textContent();
  await forcedDecision
    // A fate's commit verb takes the card's mood now — you ENDURE a wound and
    // TAKE a gift, by name when the gift has one ("Take the Gold"). Pop and token
    // cards name their placement or clearing operation.
    .getByRole("button", {
      name: /^(Endure It|Take It|Take the .+|So Be It|Place Pop|Place Unrest|Clear Unrest)$/,
    })
    .click();
  await expect(forcedDecision).toBeHidden();

  // Ending a turn is a press and HOLD — a single Enter is exactly the accidental
  // commit the gesture exists to refuse, so pressing one must leave the turn
  // where it was before the hold is exercised for real.
  const endTurn = page.getByRole("button", { name: /^End turn/i });
  await expect(endTurn).toHaveAccessibleName(
    "End turn — press and hold. Ending now starts a riot at −3.",
  );
  const riot = page.getByRole("dialog", { name: "Riot", exact: true });
  await endTurn.focus();
  await page.keyboard.press("Enter");
  await expect(endTurn).toBeVisible();
  await expect(riot).toBeHidden();

  await page.keyboard.down("Enter");
  await page.waitForTimeout(900);
  await page.keyboard.up("Enter");

  // Local Unrest leaves Damon at −3: the turn-end riot blocks the handoff
  // until he rolls, then its result stays open for him to read.
  await expect(riot).toBeVisible();
  await expect(riot).toContainText("Damon faces a riot at turn end.");
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toHaveCount(0);
  await riot.getByRole("button", { name: "Roll the Die", exact: true }).click();
  await expect(riot.getByRole("heading", { name: "Bribe demanded", exact: true })).toBeVisible();
  await riot.getByRole("button", { name: "Endure It", exact: true }).click();
  await expect(riot).toBeHidden();
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(decisionTitle ?? "");
  await expect(page.getByRole("img", { name: /Damon is acting/ })).toBeVisible();
});
