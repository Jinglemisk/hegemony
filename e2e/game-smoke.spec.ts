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

  // Seed 311: the scripted opening leaves Damon one Local Unrest short of the riot line.
  await page.goto("/?dev=preload&seed=311");
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

  // Local Unrest leaves Damon at −3: the hold opens the confirm at the riot line,
  // the last chance to buy calm, instead of ending.
  const confirm = page.getByRole("dialog", { name: "Ending your turn starts a riot" });
  await expect(confirm).toBeVisible();
  await expect(riot).toBeHidden();
  await confirm.getByRole("button", { name: "Face the riot" }).click();

  // The riot blocks the handoff until Damon rolls, then its result stays open for him.
  await expect(riot).toBeVisible();
  await expect(riot).toContainText("Turn end · Damon’s realm");
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toHaveCount(0);
  await riot.getByRole("button", { name: "Roll the Die", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Blood in the streets", exact: true });
  await expect(result).toBeVisible();
  await result.getByRole("button", { name: "Endure It", exact: true }).click();
  await expect(result).toBeHidden();

  // The turn notice names Nikos's turn; the screen is Nikos's once it begins.
  const notice = page.getByRole("dialog", { name: "Nikos’s turn", exact: true });
  await notice.getByRole("button", { name: "Begin", exact: true }).click();
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(decisionTitle ?? "");
  await expect(page.getByRole("img", { name: /Damon is acting/ })).toBeVisible();
});

test("ending a turn short of food asks who leaves, with a way back", async ({ page }) => {
  await page.goto("/?dev=hunger-short&seed=42");

  const endTurn = page.getByRole("button", { name: /^End turn/i });
  await expect(endTurn).toHaveAccessibleName(
    "End turn — press and hold. Ending now, 2 pops leave: you are 2 food short.",
  );
  const hold = async () => {
    await endTurn.focus();
    await page.keyboard.down("Enter");
    await page.waitForTimeout(900);
    await page.keyboard.up("Enter");
  };

  // The hold opens the hunger card instead of ending. Going back keeps the turn,
  // so the food can still be bought.
  const hunger = page.getByRole("dialog", { name: "Hunger", exact: true });
  await hold();
  await expect(hunger).toBeVisible();
  await hunger.getByRole("button", { name: "Go back" }).click();
  await expect(hunger).toBeHidden();
  await expect(endTurn).toBeVisible();

  await hold();
  await hunger.getByRole("button", { name: "Let them go" }).click();
  await expect(hunger).toBeHidden();
  await expect(page.getByRole("dialog", { name: /s turn$/ })).toBeVisible();
});

test("an offer to the table is countered, then the first accept trades", async ({ page }) => {
  await page.goto("/?dev=trade&seed=42");

  // The Trade disc opens the offer card: 2 wood for 1 stone, to the table.
  await page.getByRole("button", { name: /^Trade: Offer/ }).click();
  const compose = page.getByRole("region", { name: "Offer a trade" });
  await compose.getByRole("button", { name: "Add to I give" }).click();
  await compose.getByRole("button", { name: "wood, you hold 8" }).click();
  await compose.getByRole("button", { name: "One more wood" }).click();
  await compose.getByRole("button", { name: "Add to I want" }).click();
  await compose.getByRole("button", { name: "stone", exact: true }).click();
  await compose.getByRole("button", { name: "Offer to the table" }).click();

  // It waits on the alarms row. Its card shows every seat it names at once. One
  // counters by editing the card in place; then another accepts, and the first accept
  // trades: the counter dies with the offer.
  await page.getByRole("button", { name: /offers the table, 0 of 3 answered/ }).click();
  const card = page.getByRole("region", { name: /offers the table$/ });
  await card
    .getByRole("button", { name: / counters$/ })
    .first()
    .click();
  await card.getByRole("button", { name: "One more wood" }).click();
  await expect(card).toContainText("was 2");
  await card.getByRole("button", { name: "Send counter" }).click();
  await expect(card).toContainText("Counters");
  await expect(card.getByRole("button", { name: "Take counter" })).toBeVisible();
  await card
    .getByRole("button", { name: / accepts$/ })
    .first()
    .click();

  // Settled on the offer's terms: the offer closes and every seat is toasted.
  await expect(page.getByRole("button", { name: /offers the table/ })).toHaveCount(0);
  await expect(page.getByText(/^Trade · /)).toBeVisible();
  // Toasts name their goods as terms, icon first: "2 Wood".
  await expect(page.getByText(/gave 2 wood; .* gave 1 stone\./i)).toBeVisible();
});

test("one person plays three bots: they answer at once, and the screen stays with the person", async ({
  page,
}) => {
  // The TUNE panel's seat setting, as the browser keeps it: the first seat a person.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "hegemony-dev-seats",
      JSON.stringify({ 0: "human", 1: "master", 2: "master", 3: "master" }),
    );
  });
  await page.goto("/?dev=trade&seed=42");
  const seat = page.getByRole("button", { name: /, your seat$/ });
  const person = (await seat.getAttribute("aria-label"))!.split(",")[0];

  await page.getByRole("button", { name: /^Trade: Offer/ }).click();
  const compose = page.getByRole("region", { name: "Offer a trade" });
  await compose.getByRole("button", { name: "Add to I give" }).click();
  await compose.getByRole("button", { name: "wood, you hold 8" }).click();
  await compose.getByRole("button", { name: "One more wood" }).click();
  await compose.getByRole("button", { name: "Add to I want" }).click();
  await compose.getByRole("button", { name: "stone", exact: true }).click();
  await compose.getByRole("button", { name: "Offer to the table" }).click();

  // Every bot answers at once: the offer either traded or waits with all three answers,
  // and no bot's row offers the person a button.
  await expect(
    page.getByRole("button", { name: /offers the table, [012] of 3 answered/ }),
  ).toHaveCount(0);
  const open = page.getByRole("button", { name: /offers the table, 3 of 3 answered/ });
  if (await open.count()) {
    await open.click();
    const card = page.getByRole("region", { name: /offers the table$/ });
    await expect(card.getByRole("button", { name: / (accepts|declines|counters)$/ })).toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");
  }

  // Ending the turn hands it to a bot, which plays it while the screen stays here.
  const endTurn = page.getByRole("button", { name: /^End turn/i });
  await endTurn.focus();
  await page.keyboard.down("Enter");
  await page.waitForTimeout(900);
  await page.keyboard.up("Enter");
  await expect(page.getByRole("img", { name: / is acting\.$/ })).not.toHaveAccessibleName(
    `${person} is acting.`,
  );
  await expect(seat).toHaveAccessibleName(`${person}, your seat`);
});
