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
export const BASE = "http://127.0.0.1:5199";

export const SIZES = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
];

// ── surfaces ─────────────────────────────────────────────────────────────────
// The realm sheet's pages (tabs) and the bar's consult pages (toggle buttons).
const LEFT = ["Cities", "Ladder", "Build", "Market"];
const RIGHT = ["Chronicle", "Codex", "Victory", "Agora"];

const dismissDialogs = async (p) => {
  for (let i = 0; i < 4; i += 1) {
    const d = p.getByRole("dialog");
    if (!(await d.count())) return;
    const btn = d
      .getByRole("button", {
        name: /^(Endure It|Take It|Take the .+|So Be It|Resolve Choice|Place Pops|Continue|Close)$/,
      })
      .first();
    if (!(await btn.count())) return;
    await btn.click().catch(() => {});
    await p.waitForTimeout(450);
  }
};

const realmTab = (p, tab) => p.locator(".realm-tabs").getByRole("tab", { name: tab, exact: true });
const consultButton = (p, tab) => p.locator(`.consult-btn[aria-label="${tab}"]`).first();
const verb = (p, name) => p.locator(`.verb-btn[aria-label^="${name}"]`).first();

/** Open a verb's fan from the keyboard (Enter never runs the disc's own
 *  option), then take each named option in turn: a second fan, or the act. */
const pressVerb = async (p, group, options = []) => {
  const disc = verb(p, group);
  if (!(await disc.count())) return;
  await disc.focus().catch(() => {});
  await p.keyboard.press("Enter");
  await p.waitForTimeout(400);
  for (const option of options) {
    const item = p
      .locator(`.is-open > .fan > .fan-item > .fan-btn[aria-label^="${option}."]`)
      .first();
    if (!(await item.count()) || (await item.getAttribute("aria-disabled")) === "true") break;
    await item.click().catch(() => {});
    await p.waitForTimeout(400);
  }
  await p.waitForTimeout(400);
};

/** Pick the first tile whose name plate and label pass `test`, and wait for its page. */
/* global document */
const pickTile = async (p, test) => {
  const id = await p.evaluate((source) => {
    const fits = new Function(`return ${source}`)();
    const tile = [...document.querySelectorAll(".island [data-tile-id]")].find((e) =>
      fits(e.querySelector(".plate-text")?.textContent ?? "", e.getAttribute("aria-label") ?? ""),
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

const closeConsult = async (p, tab) => {
  const t = consultButton(p, tab);
  if ((await t.count()) && (await t.getAttribute("aria-pressed")) === "true") {
    await t.click().catch(() => {});
    await p.waitForTimeout(250);
  }
};

/** Each surface: a name and a function that drives the page into that state. */
export const SURFACES = [
  {
    name: "fate",
    go: async (p) => {
      await p.goto(`${BASE}/?dev=preload&seed=42`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1300);
    },
  },
  { name: "table", go: async (p) => dismissDialogs(p) },
  {
    name: "tab-subject",
    go: async (p) => {
      const t = p.locator(".realm-tab.is-subject").first();
      if (await t.count()) await t.click().catch(() => {});
      await p.waitForTimeout(400);
    },
  },
  ...LEFT.map((tab) => ({
    name: `tab-${tab.toLowerCase()}`,
    go: async (p) => {
      const t = realmTab(p, tab);
      if (await t.count()) await t.click().catch(() => {});
      await p.waitForTimeout(500);
    },
  })),
  ...RIGHT.map((tab) => ({
    name: `tab-${tab.toLowerCase()}`,
    go: async (p) => {
      const t = consultButton(p, tab);
      if ((await t.count()) && (await t.getAttribute("aria-pressed")) !== "true") {
        await t.click().catch(() => {});
      }
      await p.waitForTimeout(500);
    },
  })),
  {
    name: "codex-cards",
    go: async (p) => {
      const t = p.getByRole("button", { name: /^The Cards$/i }).first();
      if (await t.count()) await t.click().catch(() => {});
      await p.waitForTimeout(400);
    },
  },
  {
    name: "board-clear",
    go: async (p) => {
      for (const tab of RIGHT) await closeConsult(p, tab);
      await p.waitForTimeout(300);
    },
  },
  {
    name: "targeting-grow",
    go: async (p) => {
      await pressVerb(p, "Grow", ["Slave"]);
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "targeting-build",
    go: async (p) => {
      await pressVerb(p, "Build", ["Freemen"]);
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "fan-civic",
    go: async (p) => {
      await pressVerb(p, "Civic");
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "fan-build-slaves",
    go: async (p) => {
      await pressVerb(p, "Build", ["Slaves"]);
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "fan-exchange-wood",
    go: async (p) => {
      await pressVerb(p, "Exchange", ["Wood"]);
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "venture-pick",
    go: async (p) => {
      await pressVerb(p, "Civic", ["Venture"]);
    },
  },
  {
    name: "venture-rolled",
    go: async (p) => {
      const roll = p.getByRole("dialog").getByRole("button", { name: /fund/i }).first();
      if (await roll.count()) {
        await roll.click().catch(() => {});
        await p.waitForTimeout(1000);
      }
    },
    after: async (p) => {
      // The venture's commit verb is the outcome now ("Take the Gold"), not a
      // generic Continue — the dismissal has to follow the copy.
      const done = p
        .getByRole("dialog")
        .getByRole("button", { name: /continue|close|take the/i })
        .first();
      if (await done.count()) await done.click().catch(() => {});
      await p.waitForTimeout(400);
    },
  },
  {
    name: "assembly-proposal",
    go: async (p) => {
      await p.goto(`${BASE}/?dev=assembly&seed=42`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1400);
    },
  },
  {
    // The FIRST Assembly always convenes at 0 of 6 laws with every orator on zero,
    // so half of this surface — the law cap, a stele carrying more than one pip, a
    // repeal that is actually armed, a voice ledger with a number in it — never
    // appeared in either auditor. `?dev=assembly2` plays the first sitting out and
    // stops at the second, which is where all of that is standing.
    name: "assembly-standing",
    go: async (p) => {
      await p.goto(`${BASE}/?dev=assembly2&seed=42`, { waitUntil: "networkidle" });
      await p.waitForTimeout(2200);
    },
  },
  {
    name: "assembly-vote",
    go: async (p) => {
      for (let round = 0; round < 6; round += 1) {
        const pass = p.getByRole("button", { name: /^Pass/i }).first();
        if (await pass.count()) {
          await pass.click().catch(() => {});
          await p.waitForTimeout(400);
        }
        const seats = p.locator(".asmSeat, .roster .seat");
        for (let i = 0, n = await seats.count(); i < n; i += 1) {
          await seats
            .nth(i)
            .click()
            .catch(() => {});
          await p.waitForTimeout(180);
          const again = p.getByRole("button", { name: /^Pass/i }).first();
          if (await again.count()) {
            await again.click().catch(() => {});
            await p.waitForTimeout(320);
          }
        }
        if (await p.locator(".voteTally").count()) break;
      }
      await p.waitForTimeout(400);
    },
  },
  {
    // The realm's last tab shows whatever the map last picked. These start from
    // their own `goto` because they run after the Assembly surfaces and would
    // inherit their scene otherwise.
    name: "pick-rival",
    go: async (p) => {
      await p.goto(`${BASE}/?dev=preload&seed=42`, { waitUntil: "networkidle" });
      await p.waitForTimeout(1300);
      await dismissDialogs(p);
      await pickTile(p, (plate) => plate && !["PHLIOUS", "NEMEA"].includes(plate));
    },
  },
  { name: "pick-land", go: (p) => pickTile(p, (plate, label) => !plate && !/oracle/i.test(label)) },
  { name: "pick-oracle", go: (p) => pickTile(p, (_plate, label) => /oracle/i.test(label)) },
  {
    name: "pick-mooring",
    go: async (p) => {
      await p
        .locator(".island .moor")
        .first()
        .click({ force: true })
        .catch(() => {});
      await p.waitForTimeout(400);
    },
  },
  {
    name: "pick-sea",
    go: async (p) => {
      await p.mouse.click(60, 300);
      await p.waitForTimeout(400);
    },
  },
];
