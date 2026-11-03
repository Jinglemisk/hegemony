import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.locator(".living-map[data-ready]").waitFor();
}

/** Open the Civic disc's fan from the keyboard (a click runs its own option), then take
 *  the named option. */
async function civic(page: Page, option: string) {
  await page.locator('.verb-btn[aria-label^="Civic"]').first().focus();
  await page.keyboard.press("Enter");
  await page.locator(`.is-open > .fan > .fan-item > .fan-btn[aria-label^="${option}."]`).click();
}

test("buys a development card, then plays one from the hand", async ({ page }) => {
  await visit(page, "/?dev=cards&seed=42");

  // The seat holds a Caravan from an earlier turn: its disc counts one card.
  await expect(page.getByRole("button", { name: /acting, 1 card, your seat/ })).toBeVisible();

  // Buying draws the Foraging on top of the pile: a yield, which lands at once.
  await civic(page, "Buy a card");
  const drawn = page.getByRole("dialog", { name: "Foraging", exact: true });
  await expect(drawn).toContainText(/\+\d+ food/i);
  await drawn.getByRole("button", { name: "Take the Food" }).click();
  await expect(drawn).toBeHidden();

  // The hand plays the Caravan, its kind chosen; the table is told what it did.
  await civic(page, "Your hand");
  const hand = page.getByRole("dialog", { name: "Your hand", exact: true });
  await expect(hand.getByRole("button", { name: "Play Caravan" })).toBeDisabled();
  await hand.getByRole("option", { name: /^Wood/ }).click();
  await hand.getByRole("button", { name: "Play Caravan" }).click();
  const played = page.getByRole("dialog", { name: "Caravan", exact: true });
  await expect(played).toContainText(/\+\d+ wood/i);
  await played.getByRole("button", { name: "Done", exact: true }).click();
  await expect(played).toBeHidden();
  await expect(page.getByRole("button", { name: /acting, your seat/ })).toBeVisible();
});

test("a riot takes a held card in place of a pop, the seat's choice", async ({ page }) => {
  // The riot rolled on Revolt spreads, two pops, and the seat holds two cards.
  await visit(page, "/?dev=riot-cards&seed=42");
  const riot = page.getByRole("dialog", { name: "Riot", exact: true });
  await expect(riot).toContainText(/2 pops to answer/i);
  await expect(riot).toContainText("2 in hand");

  // Only the count shows: the card is drawn after the choice.
  await riot.getByRole("button", { name: "Give Up a Card" }).click();
  await expect(riot).toContainText(/One pop to answer/i);
  await expect(riot).toContainText("1 in hand, 1 given up");

  await riot.getByRole("button", { name: /^Lose the slave/ }).click();
  const result = page.getByRole("dialog", { name: "Revolt spreads", exact: true });
  await expect(result).toContainText("went in place of a pop.");
  await expect(result).toContainText(/A slave left/);
  await result.getByRole("button", { name: "Endure It", exact: true }).click();
  await expect(result).toBeHidden();
});

test("a seat gives a held card in trade, picked in private behind a handover", async ({ page }) => {
  // Every seat holds a Caravan and a Raiders from an earlier turn.
  await visit(page, "/?dev=trade-cards&seed=42");
  const seat = page.getByRole("button", { name: /, your seat$/ });
  const person = (await seat.getAttribute("aria-label"))!.split(",")[0];

  // 2 wood for a card, to the table: the offer names a card, never which.
  await page.getByRole("button", { name: /^Trade: Offer/ }).click();
  const compose = page.getByRole("region", { name: "Offer a trade" });
  await compose.getByRole("button", { name: "Add to I give" }).click();
  await compose.getByRole("button", { name: "wood, you hold 8" }).click();
  await compose.getByRole("button", { name: "One more wood" }).click();
  await compose.getByRole("button", { name: "Add to I want" }).click();
  await compose.getByRole("button", { name: "card", exact: true }).click();
  await compose.getByRole("button", { name: "Offer to the table" }).click();

  // A seat accepts: the screen passes to it for its pick, then comes back.
  await page.getByRole("button", { name: /offers the table, 0 of 3 answered/ }).click();
  const card = page.getByRole("region", { name: /offers the table$/ });
  await card
    .getByRole("button", { name: / accepts$/ })
    .first()
    .click();
  const handover = page.getByRole("dialog", { name: /chooses a card$/ });
  await handover.getByRole("button", { name: "Show the hand" }).click();
  const pick = page.getByRole("dialog", { name: "Choose a card to give" });
  await expect(pick.getByRole("button", { name: "Give 0 of 1" })).toBeDisabled();
  await pick.locator(".hand-card").last().click();
  await pick.getByRole("button", { name: "Give a card" }).click();

  await expect(page.getByText(/gave 2 wood; .* gave 1 card\./i)).toBeVisible();
  await expect(seat).toHaveAccessibleName(`${person}, acting, 3 cards, your seat`);
});
