import { expect, test } from "@playwright/test";

test("the living map: a tile's button places the metropolis, and arrows walk the tiles", async ({
  page,
}) => {
  // Playwright's renderer is a software one: each frame of the map takes a while.
  test.slow();
  await page.goto("/?setup=manual&seed=42&board=scenario&map=3d");
  await page.locator(".living-map[data-ready]").waitFor();

  // The tile buttons sit over the drawn hexes, so the smoke test's click works here too.
  await expect(page.getByText("Select a tile for your metropolis", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Hex -2,0,/ }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeVisible();
  // The map's mode keys keep still behind a dialog.
  const modes = page.getByRole("group", { name: "Map mode" });
  await page.keyboard.press("3");
  await expect(modes.getByRole("button", { name: "Terrain" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Place metropolis" }).click();
  await expect(page.getByRole("heading", { name: "Choose metropolis pops" })).toBeHidden();
  await expect(page.getByRole("img", { name: /Nikos is acting/ })).toBeVisible();
  // The tile's name says what its plate and pips show.
  await expect(
    page.getByRole("button", {
      name: /^Hex -2,0, .*; .+'s city: \d+ pops? \((\d+ (citizens?|freem[ae]n|slaves?)(, )?)+\), \d+ built, \d+ worked, \d+ open$/,
    }),
  ).toBeAttached();

  // One tab stop for the board; the arrows move it by where the tiles are drawn.
  const from = page.getByRole("button", { name: /Hex -2,0,/ });
  await from.focus();
  await page.keyboard.press("ArrowRight");
  const focused = page.locator(".lm-tile:focus");
  await expect(focused).toHaveAttribute("data-tile-id", "-1,0");
  await expect(focused).toHaveAttribute("tabindex", "0");
  await expect(from).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowLeft");
  await expect(from).toBeFocused();

  // Keys 1 to 5 switch the map mode, and the tile says what it makes. The map key stays
  // shut until its row is pressed, then follows the mode; Escape shuts it again.
  await page.keyboard.press("3");
  await expect(from).toHaveAccessibleName(/; .+ makes .+$/);
  await page.getByRole("button", { name: "Economy key" }).click();
  await expect(page.getByRole("region", { name: "Economy map key" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByRole("region", { name: "Terrain map key" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: /map key/ })).toBeHidden();
  await expect(page.getByRole("button", { name: "Terrain key" })).toBeFocused();

  // The corner dock: a mode's button switches the map, and the Chronicle's line opens
  // the log upward out of the dock; Escape closes it and leaves focus on the line.
  const political = modes.getByRole("button", { name: "Political" });
  await political.click();
  await expect(political).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Political key" })).toBeVisible();
  const line = page.getByRole("button", { name: /^Chronicle: / });
  await line.click();
  await expect(line).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Action log" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Action log" })).toBeHidden();
  await expect(line).toBeFocused();
});
