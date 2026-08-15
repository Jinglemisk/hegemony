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
const LEFT = ["Cities", "Pops", "Build", "Market"];
const RIGHT = ["Chronicle", "Codex", "Victory", "Agora"];

const dismissDialogs = async (p) => {
  for (let i = 0; i < 4; i += 1) {
    const d = p.getByRole("dialog");
    if (!(await d.count())) return;
    const btn = d
      .getByRole("button", {
        name: /^(Endure It|Take It|So Be It|Resolve Choice|Place Pops|Continue|Close)$/,
      })
      .first();
    if (!(await btn.count())) return;
    await btn.click().catch(() => {});
    await p.waitForTimeout(450);
  }
};

const closeTab = async (p, tab) => {
  const t = p.locator(`.tabRail button[aria-label="${tab}"]`).first();
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
  ...LEFT.map((tab) => ({
    name: `tab-${tab.toLowerCase()}`,
    go: async (p) => {
      for (const other of LEFT) if (other !== tab) await closeTab(p, other);
      const t = p.locator(`.tabRail button[aria-label="${tab}"]`).first();
      if ((await t.count()) && (await t.getAttribute("aria-pressed")) !== "true") {
        await t.click().catch(() => {});
      }
      await p.waitForTimeout(500);
    },
  })),
  ...RIGHT.map((tab) => ({
    name: `tab-${tab.toLowerCase()}`,
    go: async (p) => {
      for (const other of RIGHT) if (other !== tab) await closeTab(p, other);
      const t = p.locator(`.tabRail button[aria-label="${tab}"]`).first();
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
      for (const tab of [...LEFT, ...RIGHT]) await closeTab(p, tab);
      await p.waitForTimeout(300);
    },
  },
  {
    name: "targeting-grow",
    go: async (p) => {
      const v = p.locator('.railVerb:has-text("Grow")').first();
      if ((await v.count()) && (await v.getAttribute("aria-disabled")) !== "true") {
        await v.click().catch(() => {});
        await p.waitForTimeout(600);
      }
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "targeting-build",
    go: async (p) => {
      const v = p.locator('.railVerb:has-text("Build")').first();
      if ((await v.count()) && (await v.getAttribute("aria-disabled")) !== "true") {
        await v.click().catch(() => {});
        await p.waitForTimeout(600);
      }
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "calm",
    go: async (p) => {
      const c = p.locator('.railVerb:has-text("Calm")').first();
      if ((await c.count()) && (await c.getAttribute("aria-disabled")) !== "true") {
        await c.click().catch(() => {});
        await p.waitForTimeout(600);
      }
    },
    after: async (p) => {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    },
  },
  {
    name: "venture-pick",
    go: async (p) => {
      const v = p.locator('.railVerb:has-text("Venture")').first();
      if (await v.count()) {
        await v.click().catch(() => {});
        await p.waitForTimeout(600);
      }
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
      const done = p
        .getByRole("dialog")
        .getByRole("button", { name: /continue|close/i })
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
];
