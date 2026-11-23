/**
 * The surfaces both auditors walk.
 *
 * Extracted so audit-ui-geometry.mjs and audit-ui-conduct.mjs cannot drift apart
 * about what "every surface" means — a checker that quietly stops visiting a
 * page is worse than no checker, because its clean run reads as proof.
 *
 * A surface is a name plus a function that drives the app into that state, and
 * optionally an `after` that leaves the app somewhere the next surface can start
 * from. They run in order and share one page, so each one inherits the last.
 */
// AUDIT_BASE points the audits at another checkout's dev server.
export const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:5199";
const visit = async (p, search, waitMs) => {
  await p.goto(`${BASE}/?${search}`, { waitUntil: "networkidle" });
  // The map shows once its first frame is drawn.
  await p.waitForFunction(() => !document.querySelector(".living-map:not([data-ready])"));
  await p.waitForTimeout(waitMs);
};

export const SIZES = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
];

// ── surfaces ─────────────────────────────────────────────────────────────────
// The sidebar's drawers (Realm's tabs among them) and the menu's windows.
const LEFT = [
  ["Realm", null],
  ["Realm", "Cities"],
  ["Realm", "People"],
  ["Ideas", null],
  ["Agora", null],
  ["Trade", null],
  ["Victory", null],
  ["Cards", null],
];
const RIGHT = ["Codex", "Costs", "Plates"];

const dismissDialogs = async (p) => {
  for (let i = 0; i < 4; i += 1) {
    const d = p.getByRole("dialog");
    if (!(await d.count())) return;
    const btn = d
      .getByRole("button", {
        name: /^(Endure It|Take It|Take the .+|So Be It|Place Pop|Place Unrest|Clear Unrest|Continue|Close)$/,
      })
      .first();
    if (!(await btn.count())) return;
    await btn.click().catch(() => {});
    await p.waitForTimeout(450);
  }
};

const menuWindow = (p, name) => p.locator(`.menu-window[data-window="${name.toLowerCase()}"]`);

/** Open one of the menu's windows: the menu's plaque, then its row. */
const openWindow = async (p, name) => {
  if (await menuWindow(p, name).count()) return;
  await p
    .locator('[data-c="menu-btn"]')
    .click()
    .catch(() => {});
  await p.waitForTimeout(250);
  await p
    .locator(`[data-c="menu-row"][data-window="${name.toLowerCase()}"]`)
    .click()
    .catch(() => {});
  await p.waitForTimeout(250);
};
const sidebar = (p, name) =>
  p.getByRole("navigation", { name: "Drawers" }).getByRole("button", { name, exact: true });
/** Open a drawer from the sidebar (a pressed button stays open), then a tab in it. */
const openDrawer = async (p, name, tab) => {
  const b = sidebar(p, name);
  if ((await b.count()) && (await b.getAttribute("aria-pressed")) !== "true") {
    await b.click().catch(() => {});
    await p.waitForTimeout(350);
  }
  if (tab) {
    const t = p.locator(".lw-tabs").getByRole("tab", { name: tab, exact: true });
    if (await t.count()) await t.click().catch(() => {});
  }
  await p.waitForTimeout(400);
};
/** Pick the first tile whose name plate and label pass `test`, and wait for its page.
 *  The plates float apart from the tile buttons; a tile's label names its lead
 *  settlement after the semicolon. */
/* global document */
const pickTile = async (p, test) => {
  const id = await p.evaluate((source) => {
    const fits = new Function(`return ${source}`)();
    const plate = (e) => e.getAttribute("aria-label")?.match(/; ([^,]+),/)?.[1] ?? "";
    const tile = [...document.querySelectorAll(".lm-tile")].find((e) =>
      fits(plate(e), e.getAttribute("aria-label") ?? ""),
    );
    return tile?.dataset.tileId ?? null;
  }, test.toString());
  if (id)
    await p
      .locator(`[data-tile-id="${id}"]`)
      .click({ force: true })
      .catch(() => {});
  await p.waitForTimeout(400);
};

/** The Chronicle rises from the dock's line; it stays open until the line is
 *  pressed again. */
const setChronicle = async (p, open) => {
  const t = p.locator(".rd-line");
  if ((await t.count()) && ((await t.getAttribute("aria-expanded")) === "true") !== open) {
    await t.click().catch(() => {});
    await p.waitForTimeout(250);
  }
};

const closeWindow = async (p, name) => {
  const close = menuWindow(p, name).getByRole("button", { name: `Close ${name}`, exact: true });
  if (await close.count()) {
    await close.click().catch(() => {});
    await p.waitForTimeout(250);
  }
};

/** Press a control and let its window settle. */
const press = async (p, locator, wait = 400) => {
  if (await locator.count())
    await locator
      .first()
      .click()
      .catch(() => {});
  await p.waitForTimeout(wait);
};
const outliner = (p) => p.getByRole("complementary", { name: "Outliner" });
/** Close whatever the left window holds (a popover, a drawer, the place panel). */
const clearLeft = async (p) => {
  for (let i = 0; i < 3; i += 1) {
    if (!(await p.locator('[data-c="drawer"], [data-c="place"]').count())) return;
    await p.keyboard.press("Escape");
    await p.waitForTimeout(250);
  }
};
/** The board's own settlement: the outliner's first place row picks it as the map does. */
const pickOwn = async (p) => {
  await clearLeft(p);
  await press(
    p,
    outliner(p).getByRole("region", { name: "Your settlements" }).getByRole("button").nth(1),
  );
};

/** Each surface: a name and a function that drives the page into that state. */
export const SURFACES = [
  {
    name: "fate",
    go: async (p) => {
      await visit(p, "dev=preload&seed=42", 1300);
    },
  },
  { name: "table", go: async (p) => dismissDialogs(p) },
  // ── the sidebar's drawers, Realm's tabs among them; the seal opens Realm too ──
  ...LEFT.map(([drawer, tab]) => ({
    name: `drawer-${(tab ?? drawer).toLowerCase()}`,
    go: (p) => openDrawer(p, drawer, tab),
  })),
  {
    name: "seal-realm",
    go: async (p) => {
      await clearLeft(p);
      await press(p, p.locator('[data-c="top-seal"]'));
    },
    after: clearLeft,
  },
  // ── the place panel, each variant; a rival's coin opens their card ──
  { name: "place-own", go: pickOwn },
  {
    name: "place-grow",
    go: (p) => press(p, p.locator('[data-c="place"]').getByRole("button", { name: /^Grow here/ })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    },
  },
  {
    name: "place-build",
    go: (p) =>
      press(p, p.locator('[data-c="place"]').getByRole("button", { name: /^Raise a building/ })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    },
  },
  {
    name: "place-rival",
    go: async (p) => {
      await clearLeft(p);
      await pickTile(p, (plate) => plate && !["PHLIOUS", "NEMEA"].includes(plate));
    },
  },
  {
    name: "seat-card",
    go: (p) => press(p, p.locator('[data-c="place"] .ch-head-coinbtn')),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "composer-partner",
    go: (p) =>
      press(p, p.locator('[data-c="place"]').getByRole("button", { name: /^Offer .+ a trade/ })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "place-land",
    go: (p) => pickTile(p, (plate, label) => !plate && !/oracle/i.test(label)),
  },
  { name: "place-oracle", go: (p) => pickTile(p, (_plate, label) => /oracle/i.test(label)) },
  {
    name: "place-luxury-free",
    go: async (p) => {
      await p
        .locator(".lm-moor:not(.is-faded)")
        .first()
        .click({ force: true })
        .catch(() => {});
      await p.waitForTimeout(400);
    },
    after: clearLeft,
  },
  // ── the top: the happiness card, the menu and its windows ──
  {
    name: "happiness-card",
    go: (p) => press(p, p.locator('[data-c="mood"]')),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    },
  },
  {
    name: "menu",
    go: (p) => press(p, p.locator('[data-c="menu-btn"]')),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    },
  },
  ...RIGHT.map((tab) => ({
    name: `window-${tab.toLowerCase()}`,
    go: async (p) => {
      await openWindow(p, tab);
      await p.waitForTimeout(500);
    },
  })),
  {
    name: "codex-cards",
    go: async (p) => {
      // The Codex opens on its contents page; a chapter is one click from there.
      await openWindow(p, "Codex");
      for (const name of [/How to Win/i, /^The Cards$/i]) {
        const t = p.getByRole("button", { name }).first();
        if (await t.count()) await t.click().catch(() => {});
        await p.waitForTimeout(400);
      }
    },
    after: async (p) => {
      for (const tab of RIGHT) await closeWindow(p, tab);
      await p.waitForTimeout(300);
    },
  },
  // ── the right: the dock's log and legend, the outliner's settings, folds and tuck ──
  {
    name: "dock-log",
    go: (p) => setChronicle(p, true),
    after: (p) => setChronicle(p, false),
  },
  {
    name: "legend",
    go: (p) =>
      press(
        p,
        p.getByRole("group", { name: "Map mode" }).getByRole("button", { name: "Political" }),
      ),
    after: (p) =>
      press(p, p.getByRole("group", { name: "Map mode" }).getByRole("button", { name: "Terrain" })),
  },
  {
    name: "outliner-settings",
    go: (p) => press(p, outliner(p).getByRole("button", { name: "Outliner settings" })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(250);
    },
  },
  {
    name: "outliner-folded",
    go: async (p) => {
      for (const head of await outliner(p).locator(".rd-sec-head").all())
        await head.click().catch(() => {});
      await p.waitForTimeout(300);
    },
    after: async (p) => {
      for (const head of await outliner(p).locator(".rd-sec-head").all())
        await head.click().catch(() => {});
      await p.waitForTimeout(300);
    },
  },
  {
    name: "outliner-tucked",
    go: (p) => press(p, outliner(p).getByRole("button", { name: "Tuck the outliner away" })),
    after: (p) => press(p, p.getByRole("button", { name: "Show the outliner" })),
  },
  // ── the dock's acts: the composer, and the confirm bar before a spend ──
  {
    name: "composer",
    go: (p) => press(p, p.locator(".rd-acts").getByRole("button", { name: /^Trade/ })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "confirm-bar",
    go: (p) => press(p, p.locator(".rd-acts").getByRole("button", { name: /^Buy a card/ })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "card-drawn",
    go: async (p) => {
      await openDrawer(p, "Cards", null);
      const buy = p.locator(".lw-drawer").getByRole("button", { name: /^Buy a card/ });
      if ((await buy.count()) && (await buy.getAttribute("aria-disabled")) !== "true") {
        await buy.click().catch(() => {});
        await p.waitForTimeout(300);
        await p
          .getByRole("alertdialog")
          .getByRole("button", { name: "Buy a card" })
          .click()
          .catch(() => {});
      }
      await p.waitForTimeout(1000);
    },
    after: async (p) => {
      // A yield's commit names what it gave ("Take the Food"); a held card is kept.
      const done = p
        .getByRole("dialog")
        .getByRole("button", { name: /keep it|take the/i })
        .first();
      if (await done.count()) await done.click().catch(() => {});
      await p.keyboard.press("Escape");
      await p.waitForTimeout(400);
      await clearLeft(p);
    },
  },
  // ── the hand: its tray holding cards, and the hand's view ──
  {
    name: "hand-tray",
    go: async (p) => {
      await visit(p, "dev=cards&seed=42", 1300);
      await dismissDialogs(p);
    },
  },
  {
    name: "hand-view",
    go: (p) =>
      press(p, p.locator('[data-c="hand-tray"]').getByRole("button", { name: "View the hand" })),
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  // ── late in the game: a luxury good someone holds ──
  {
    name: "place-luxury-held",
    go: async (p) => {
      await visit(p, "dev=late-game&seed=42", 1300);
      await dismissDialogs(p);
      await press(p, outliner(p).getByRole("button", { name: /, held by / }));
    },
  },
  // ── trade on the alarms row: a deal's card ──
  {
    name: "deal-card",
    go: async (p) => {
      await visit(p, "dev=deal-short&seed=42", 1300);
      await dismissDialogs(p);
      await press(p, p.locator('[data-c="deal-disc"]'));
    },
  },
  // ── moments: the year card, the riot warning, the Assembly and its pill ──
  {
    name: "year-card",
    go: async (p) => {
      await visit(p, "dev=year&seed=42", 1300);
    },
  },
  {
    name: "riot-warning",
    go: async (p) => {
      await visit(p, "dev=riot-confirm&seed=42", 1300);
      await dismissDialogs(p);
    },
  },
  {
    name: "assembly-proposal",
    go: async (p) => {
      await visit(p, "dev=assembly&seed=42", 1400);
    },
  },
  {
    name: "assembly-pill",
    go: (p) => press(p, p.getByRole("button", { name: /Minimise/ })),
  },
  {
    // Year 8 exposes standing Laws and eligible Year 4 repeals.
    name: "assembly-standing",
    go: async (p) => {
      await visit(p, "dev=assembly4&seed=42", 2200);
    },
  },
  {
    name: "assembly-vote",
    go: async (p) => {
      // Year 4 seats can afford a draw. A Directive has no protected replacement.
      await visit(p, "dev=assembly2&seed=42", 1400);
      await p.getByRole("button", { name: "Draw from Stratokles", exact: true }).click();
      // A draw spends influence, so it asks first.
      await p.getByRole("alertdialog").getByRole("button", { name: "Draw" }).click();
      await p.locator(".sit-pick").first().click();
      await p.getByRole("button", { name: /^Seal against/ }).click();
      // The other seats propose in turn, each after its turn notice, and hold their peace.
      for (let seat = 0; seat < 4; seat += 1) {
        const begin = p.locator(".turn-notice .confirm-btn");
        if (await begin.count()) await begin.click().catch(() => {});
        await p.waitForTimeout(320);
        const peace = p.getByRole("button", { name: "Hold your peace", exact: true });
        if (!(await peace.count())) break;
        await peace.click().catch(() => {});
        await p.waitForTimeout(320);
      }
      await p
        .getByRole("button", { name: /^Open the vote/ })
        .click()
        .catch(() => {});
      await p.waitForTimeout(400);
    },
  },
];
