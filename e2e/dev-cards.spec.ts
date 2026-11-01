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
