/**
 * The UI auditor — mechanical defect detection.
 *
 * Spillage, truncation, off-screen escape and label collision are all
 * *geometric* facts. Eyeballing screenshots finds some of them; this finds all
 * of them, at every width, every time, and prints a stable list you can diff
 * between runs.
 *
 * It reports four defect classes per surface:
 *
 *   OVERFLOW   an element's box exceeds the nearest ancestor that clips it
 *   TRUNCATED  an element's content is wider/taller than its own clipped box
 *   OFFSCREEN  a visible element sits outside the viewport
 *   COLLISION  two unrelated text-bearing elements overlap
 *
 * Usage:  node .playwright-mcp/audit.mjs [--shots] [--only <surface>]
 * Output: .playwright-mcp/audit/report.json  + a printed summary
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const ROOT = "/Users/jinglemisk/Desktop/hegemony-ui-overhaul/.playwright-mcp/audit";
const BASE = "http://127.0.0.1:5199";
// PROBE below is serialised and evaluated inside the page, not in node — hence
// the browser globals, which eslint cannot infer from a file under scripts/.
/* global document, getComputedStyle, window */

const SHOTS = process.argv.includes("--shots");
const onlyIndex = process.argv.indexOf("--only");
const ONLY = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];

const SIZES = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
];

// ── the probe, run inside the page ────────────────────────────────────────────
const PROBE = () => {
  const TOL = 1.5; // sub-pixel layout noise; anything under this is not a defect
  const out = [];

  // ── what is NOT a defect ────────────────────────────────────────────────────
  // Three honest exclusions, each for a reason, not to make the number smaller:
  //
  // · Screen-reader-only text is clipped to 1px BY DESIGN. Reporting it as
  //   TRUNCATED would train us to ignore the class that matters.
  // · Inside an SVG the viewBox is the coordinate system; a <g> "escaping" its
  //   <svg> is how a map pans, not a bug. Only HTML boxes are audited.
  // · When a modal is open the board sits under it. Every label on the board
  //   then "collides" with the dialog, which is what a modal is for. With a
  //   dialog up we audit the dialog and the fixed chrome, nothing beneath.
  const HIDDEN_TEXT = /(^|\s)(visuallyHidden|srOnly|sr-only|visually-hidden)(\s|$)/;
  const isHiddenText = (el) => typeof el.className === "string" && HIDDEN_TEXT.test(el.className);

  const dialog = document.querySelector('[role="dialog"], dialog[open]');
  const beneathModal = (el) => dialog !== null && !dialog.contains(el) && !el.contains(dialog);

  const visible = (el, rect, style) =>
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    Number(style.opacity) > 0.05;

  const clips = (style) =>
    style.overflowX !== "visible" || style.overflowY !== "visible" || style.clipPath !== "none";

  const describe = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const id = el.id ? "#" + el.id : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` «${text}»` : ""}`;
  };

  const all = [...document.querySelectorAll("body *")].filter((el) => {
    if (el.closest("[data-audit-ignore]")) return false;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;
    if (isHiddenText(el) || el.closest(".visuallyHidden")) return false;
    if (beneathModal(el)) return false;
    return true;
  });

  const info = new Map();
  for (const el of all) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!visible(el, rect, style)) continue;
    info.set(el, { style, rect });
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  for (const [el, { style, rect }] of info) {
    // Inside an <svg> the viewBox is the coordinate system, so the three box
    // checks below are meaningless there. COLLISION still applies — it is pure
    // screen geometry — so SVG text stays in `info` for the pass after this one.
    if (el.ownerSVGElement) continue;

    // ── OFFSCREEN ────────────────────────────────────────────────────────────
    // Only leaves and small boxes: a full-bleed container legitimately bleeds.
    const smallish = rect.width < vw * 0.9 && rect.height < vh * 0.9;
    if (smallish && style.position !== "fixed") {
      const out_l = -rect.left,
        out_r = rect.right - vw,
        out_t = -rect.top,
        out_b = rect.bottom - vh;
      const worst = Math.max(out_l, out_r, out_t, out_b);
      if (worst > TOL) {
        const side = [
          [out_l, "left"],
          [out_r, "right"],
          [out_t, "top"],
          [out_b, "bottom"],
        ].sort((a, b) => b[0] - a[0])[0][1];
        out.push({ kind: "OFFSCREEN", el: describe(el), by: Math.round(worst), side });
      }
    }

    // ── TRUNCATED ────────────────────────────────────────────────────────────
    // Content larger than its own clipped box, and it is not a scroll region
    // the user is meant to scroll.
    const scrollable =
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll";
    if (!scrollable && clips(style)) {
      const dx = el.scrollWidth - el.clientWidth;
      const dy = el.scrollHeight - el.clientHeight;
      if (dx > TOL || dy > TOL) {
        out.push({
          kind: "TRUNCATED",
          el: describe(el),
          by: Math.round(Math.max(dx, dy)),
          axis: dx > dy ? "x" : "y",
        });
      }
    }

    // ── OVERFLOW ─────────────────────────────────────────────────────────────
    // Escaping the nearest ancestor that would clip it. Walk up to find it.
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const p = info.get(parent);
      if (p && clips(p.style)) {
        const pr = p.rect;
        const scrollX = p.style.overflowX === "auto" || p.style.overflowX === "scroll";
        const scrollY = p.style.overflowY === "auto" || p.style.overflowY === "scroll";
        const bleed = Math.max(
          scrollX ? 0 : pr.left - rect.left,
          scrollX ? 0 : rect.right - pr.right,
          scrollY ? 0 : pr.top - rect.top,
          scrollY ? 0 : rect.bottom - pr.bottom,
        );
        if (bleed > TOL) {
          out.push({
            kind: "OVERFLOW",
            el: describe(el),
            by: Math.round(bleed),
            container: describe(parent),
          });
        }
        break;
      }
      parent = parent.parentElement;
    }
  }

  // ── COLLISION ──────────────────────────────────────────────────────────────
  // Leaf text elements that overlap and are not related by containment. This is
  // the one that catches two map labels sitting on top of each other.
  const leaves = [...info.entries()].filter(([el, { rect }]) => {
    if (rect.width > 400 || rect.height > 200) return false;
    if (!el.textContent || !el.textContent.trim()) return false;
    return ![...el.children].some((c) => (c.textContent || "").trim());
  });

  for (let i = 0; i < leaves.length; i += 1) {
    for (let j = i + 1; j < leaves.length; j += 1) {
      const [a, ra] = [leaves[i][0], leaves[i][1].rect];
      const [b, rb] = [leaves[j][0], leaves[j][1].rect];
      if (a.contains(b) || b.contains(a)) continue;
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w <= TOL || h <= TOL) continue;
      const area = w * h;
      const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (smaller <= 0) continue;
      const share = area / smaller;
      if (share < 0.18) continue; // a hair of overlap is a shadow, not a bug
      out.push({
        kind: "COLLISION",
        el: describe(a),
        other: describe(b),
        by: Math.round(share * 100),
      });
    }
  }

  return out;
};

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
const SURFACES = [
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
        const seats = p.locator(".roster .seat");
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

// ── run ──────────────────────────────────────────────────────────────────────
await mkdir(ROOT, { recursive: true });
const browser = await chromium.launch();
const report = [];
const consoleErrors = [];

for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => consoleErrors.push({ w, text: e.message }));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push({ w, text: m.text() });
  });

  for (const surface of SURFACES) {
    if (ONLY && surface.name !== ONLY) {
      // Still drive the state so later surfaces are reachable.
      await surface.go(page).catch(() => {});
      if (surface.after) await surface.after(page).catch(() => {});
      continue;
    }
    await surface
      .go(page)
      .catch((e) => consoleErrors.push({ w, text: `drive ${surface.name}: ${e.message}` }));
    const defects = await page.evaluate(PROBE);
    if (SHOTS) {
      await page.screenshot({ path: `${ROOT}/${surface.name}-${w}.png` });
    }
    for (const d of defects) report.push({ surface: surface.name, width: w, ...d });
    if (surface.after) await surface.after(page).catch(() => {});
  }
  await page.close();
}
await browser.close();

// ── summarise ────────────────────────────────────────────────────────────────
// Fold identical defects across widths so the list reads by cause, not by run.
const folded = new Map();
for (const d of report) {
  const key = `${d.surface}|${d.kind}|${d.el}|${d.other ?? d.container ?? ""}`;
  const seen = folded.get(key);
  if (seen) {
    seen.widths.push(d.width);
    seen.by = Math.max(seen.by, d.by);
  } else {
    folded.set(key, { ...d, widths: [d.width] });
  }
}
const rows = [...folded.values()].sort((a, b) => b.by - a.by);

await writeFile(
  `${ROOT}/report.json`,
  JSON.stringify({ rows, consoleErrors: [...new Set(consoleErrors.map((e) => e.text))] }, null, 2),
);

const bySurface = new Map();
for (const r of rows) bySurface.set(r.surface, [...(bySurface.get(r.surface) ?? []), r]);

console.log(`\n${rows.length} distinct defects across ${bySurface.size} surfaces\n`);
for (const [surface, list] of [...bySurface.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`── ${surface} (${list.length})`);
  for (const r of list.slice(0, 24)) {
    const where = r.container ? ` in ${r.container}` : r.other ? ` × ${r.other}` : "";
    console.log(
      `   ${r.kind.padEnd(9)} ${String(r.by).padStart(4)}${r.kind === "COLLISION" ? "%" : "px"} [${r.widths.join(",")}] ${r.el}${where}`,
    );
  }
  if (list.length > 24) console.log(`   … ${list.length - 24} more`);
}
console.log(
  consoleErrors.length
    ? `\nCONSOLE ERRORS:\n${[...new Set(consoleErrors.map((e) => e.text))].join("\n")}`
    : "\nno console errors",
);
