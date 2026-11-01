import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.locator(".living-map[data-ready]").waitFor();
}

test("proposes a Law kept at the last sitting, or opens a new draw", async ({ page }) => {
  await visit(page, "/?dev=assembly-kept&seed=42");
  const sheet = page.getByRole("dialog", { name: "The Assembly" });
  await expect(sheet).toContainText("Your kept Law");
  await expect(sheet).toContainText("Proposing it costs no draw.");

  // The politicians wait behind "Draw a new card".
  const draw = sheet.getByRole("button", { name: "Draw from Demosthenes" });
  await expect(draw).toBeHidden();
  await sheet.getByRole("button", { name: "Draw a new card" }).click();
  await expect(draw).toBeVisible();

  // Sealed like any proposal: the Chronicle names the card only when the ballot is read.
  await sheet.getByRole("button", { name: "Propose it" }).click();
  await expect(
    page.getByRole("button", {
      name: /^Chronicle: .*seals a resolution to lay before the Assembly\./,
    }),
  ).toBeVisible();
});

test("seals a Law blocked when drawn, and keeps it when it is still blocked", async ({ page }) => {
  // Tenant Rights stands in its tenure; Sacred Fields, on top of the deck, would replace it.
  await visit(page, "/?dev=assembly-blocked&seed=42");
  const sheet = page.getByRole("dialog", { name: "The Assembly" });
  await sheet.getByRole("button", { name: "Draw from Demosthenes" }).click();
  await expect(sheet).toContainText("You may still seal it.");
  await sheet.getByRole("button", { name: "Seal this Law" }).click();

  // The other seats hold their peace, and every seat is Ready.
  for (let seat = 0; seat < 3; seat++) {
    await page.getByRole("button", { name: "Begin" }).click();
    await page.getByRole("button", { name: "Hold your peace" }).click();
  }
  const ready = page.getByRole("button", { name: /is Ready for the ballots/ });
  for (let seat = 0; seat < 4; seat++) await ready.first().click();

  const ballot = page.getByRole("dialog", { name: "The ballot" });
  await expect(ballot).toContainText("Repeals are voted first");
  await expect(ballot).toContainText("Still blocked · you keep it");
  await ballot.getByRole("button", { name: "Read the results" }).click();
  const result = page.getByRole("dialog", { name: "Sacred Fields" });
  await expect(result).toContainText("Kept, not voted");
  await result.getByRole("button", { name: "The house rises" }).click();
  await expect(page.getByRole("dialog", { name: "The Assembly rises" })).toContainText(
    "you keep it for the next sitting",
  );
});
