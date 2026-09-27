#!/usr/bin/env node
/* global document, getComputedStyle, innerHeight, innerWidth -- used inside page.evaluate callbacks, which run in the browser */
/*
 * Fidelity gates for a static shell candidate.
 *
 * Why: the owner's verdict on the first Katalogos mock was "random gaps between
 * components, very amateurish". These gates turn that into numbers a builder can
 * drive to zero: every gap on the declared spacing scale, region edges on the grid,
 * no near-miss alignments, no clipped or undersized text, one icon size set, hit
 * targets above the floor, no chrome over the island.
 *
 * Usage:
 *   node docs/reference/design/shell-v2/gates.mjs <candidate-dir | page.html>
 *        [--select "<css>"] [--query "?a=b"] [--out <dir>]
 *
 * Writes gates.json and shot-1280.png / shot-1440.png / shot-1920.png next to the
 * page (or into --out) and prints a one-line summary per width.
 *
 * Contract a candidate declares on :root (defaults in brackets):
 *   --gate-space  allowed gaps and insets in px     ["0 4 8 12 16 24 32 48 64"]
 *   --gate-grid   grid unit for region edges in px  [4]
 *   --gate-icons  allowed icon edge lengths in px   ["12 16 20 24 32 48"]
 *   --gate-hit    minimum hit target edge in px     [24]
 *   --gate-text   minimum font size in px           [12]
 * Markup contract:
 *   data-c                 on every component box (panel, section, row, cell, button)
 *   data-gate-flex         on a component whose children are deliberately distributed
 *                          (space-between); gaps between its children are not checked
 *   data-gate-skip         excludes a subtree (e.g. a hidden-by-default tooltip layer)
 *   data-gate-hover        on an element to hover at 1440; saves hover-<name>.png
 *   data-gate-hover-wait   optional, next to data-gate-hover: ms to dwell before the
 *                          shot when a layer opens on a hover delay (default 300)
 *   data-gate-hover-next   optional, next to data-gate-hover: a css selector hovered
 *                          after that dwell, then dwelt on again before the shot
 *                          (a second-level layer that opens from the first)
 *   #board                 the island SVG; its [data-tile] groups are checked for cover
 */
import { chromium } from "@playwright/test";
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const target = args.find((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!target) {
  console.error(
    "usage: gates.mjs <candidate-dir | page.html> [--select css] [--query ?q] [--out dir]",
  );
  process.exit(2);
}
let page = resolve(target);
if (existsSync(page) && statSync(page).isDirectory()) page = join(page, "index.html");
if (!existsSync(page)) {
  console.error(`no page at ${page}`);
  process.exit(2);
}
const outDir = resolve(opt("--out", dirname(page)));
mkdirSync(outDir, { recursive: true });
const select = opt("--select", "[data-c]");
const query = opt("--query", "");
const WIDTHS = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
];
const LIST_CAP = 30;

function measure({ select, listCap }) {
  const root = getComputedStyle(document.documentElement);
  const nums = (name, dflt) => {
    const raw = root.getPropertyValue(name).replace(/["']/g, "").trim();
    const v = (raw || dflt)
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return v;
  };
  const tokens = {
    space: nums("--gate-space", "0 4 8 12 16 24 32 48 64"),
    grid: nums("--gate-grid", "4")[0] || 4,
    icons: nums("--gate-icons", "12 16 20 24 32 48"),
    hit: nums("--gate-hit", "24")[0] || 24,
    text: nums("--gate-text", "12")[0] || 12,
  };
  const maxSpace = Math.max(...tokens.space);
  const vw = innerWidth,
    vh = innerHeight;
  const TOL = 0.5;
  const onScale = (g) => tokens.space.some((s) => Math.abs(g - s) <= TOL);
  const onGrid = (x) =>
    Math.abs(x / tokens.grid - Math.round(x / tokens.grid)) * tokens.grid <= TOL;
  const board = document.getElementById("board");
  const skipped = (el) => !!el.closest("[data-gate-skip]") || (board && board.contains(el));
  const visible = (el) => {
    if (skipped(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0)
        return false;
    }
    return true;
  };
  const name = (el) => {
    if (el.dataset && el.dataset.c) return `${el.dataset.c}${el.id ? "#" + el.id : ""}`;
    const cls =
      typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls}`;
  };
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  };
  const round = (n) => Math.round(n * 10) / 10;

  const comps = [...document.querySelectorAll(select)].filter(visible);
  const compSet = new Set(comps);
  const parentOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) if (compSet.has(n)) return n;
    return null;
  };
  const groups = new Map();
  for (const c of comps) {
    const p = parentOf(c);
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(c);
  }

  const spacing = [],
    grid = [],
    nearMiss = [],
    overlaps = [];
  for (const [parent, kids] of groups) {
    const rs = kids.map((k) => ({ el: k, r: rectOf(k) }));
    const flex = parent && parent.hasAttribute("data-gate-flex");
    const topLevel = parent === null;
    // gaps to nearest right and lower neighbour
    for (const a of rs) {
      let right = null,
        below = null;
      for (const b of rs) {
        if (a === b) continue;
        const vOverlap = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
        const hOverlap = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l);
        if (vOverlap > 1 && b.r.l >= a.r.r - TOL) {
          const g = b.r.l - a.r.r;
          if (!right || g < right.g) right = { b, g };
        }
        if (hOverlap > 1 && b.r.t >= a.r.b - TOL) {
          const g = b.r.t - a.r.b;
          if (!below || g < below.g) below = { b, g };
        }
      }
      for (const [dir, n] of [
        ["x", right],
        ["y", below],
      ]) {
        if (!n) continue;
        const g = Math.max(0, n.g);
        if (topLevel && g > maxSpace) continue; // panels separated by the island
        if (flex && g > maxSpace) continue;
        if (!onScale(g))
          spacing.push({
            kind: `gap-${dir}`,
            a: name(a.el),
            b: name(n.b.el),
            px: round(g),
            in: parent ? name(parent) : "viewport",
          });
      }
    }
    // insets: leftmost and topmost child to the parent's padding box, or to the viewport
    if (parent) {
      const pr = parent.getBoundingClientRect();
      const pl = pr.left + parent.clientLeft,
        pt = pr.top + parent.clientTop;
      const minL = Math.min(...rs.map((x) => x.r.l)),
        minT = Math.min(...rs.map((x) => x.r.t));
      for (const x of rs) {
        if (Math.abs(x.r.l - minL) <= TOL) {
          const g = x.r.l - pl;
          if (g >= -TOL && !onScale(Math.max(0, g)))
            spacing.push({ kind: "inset-left", a: name(x.el), px: round(g), in: name(parent) });
        }
        if (Math.abs(x.r.t - minT) <= TOL) {
          const g = x.r.t - pt;
          if (g >= -TOL && !onScale(Math.max(0, g)))
            spacing.push({ kind: "inset-top", a: name(x.el), px: round(g), in: name(parent) });
        }
      }
    } else {
      for (const x of rs) {
        const edges = { left: x.r.l, top: x.r.t, right: vw - x.r.r, bottom: vh - x.r.b };
        for (const [k, g] of Object.entries(edges))
          if (g > TOL && g <= maxSpace && !onScale(g))
            spacing.push({ kind: `viewport-${k}`, a: name(x.el), px: round(g), in: "viewport" });
      }
    }
    // grid: region edges (top-level: all four; depth one: left and top)
    const depthOne = parent && parentOf(parent) === null;
    if (topLevel || depthOne) {
      for (const x of rs) {
        const es = topLevel
          ? { left: x.r.l, top: x.r.t, right: x.r.r, bottom: x.r.b }
          : { left: x.r.l, top: x.r.t };
        for (const [k, v] of Object.entries(es))
          if (!onGrid(v)) grid.push({ a: name(x.el), edge: k, px: round(v), grid: tokens.grid });
      }
    }
    // near-miss alignment inside the group: edges 0.5–3px apart
    const seen = new Set();
    for (const a of rs)
      for (const b of rs) {
        if (a === b) continue;
        for (const k of ["l", "r", "t", "b"]) {
          const d = Math.abs(a.r[k] - b.r[k]);
          const key = [name(a.el), name(b.el), k].sort().join("|");
          if (d > TOL && d <= 3 && !seen.has(key)) {
            seen.add(key);
            nearMiss.push({
              a: name(a.el),
              b: name(b.el),
              edge: { l: "left", r: "right", t: "top", b: "bottom" }[k],
              px: round(d),
            });
          }
        }
      }
    // overlaps between top-level panels
    if (topLevel)
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i].r,
            b = rs[j].r;
          const w = Math.min(a.r, b.r) - Math.max(a.l, b.l),
            h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          if (w > 2 && h > 2)
            overlaps.push({ a: name(rs[i].el), b: name(rs[j].el), px: `${round(w)}×${round(h)}` });
        }
  }

  // text: clipped, truncated, spilling out of its component or the viewport, undersized
  const clipped = [],
    smallText = [];
  const all = [...document.body.querySelectorAll("*")].filter((el) => !skipped(el));
  for (const el of all) {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const label = `${name(el)} “${el.textContent.trim().slice(0, 32)}”`;
    if (fs < tokens.text - 0.01) smallText.push({ a: label, px: round(fs) });
    if (cs.display !== "inline") {
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "visible")
        clipped.push({ kind: cs.textOverflow === "ellipsis" ? "ellipsis" : "clipped-x", a: label });
      if (el.scrollHeight > el.clientHeight + 1 && cs.overflowY === "hidden")
        clipped.push({ kind: "clipped-y", a: label });
    }
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)
      clipped.push({ kind: "off-viewport", a: label });
    const host = el.closest(select);
    if (host && host !== el) {
      const hr = host.getBoundingClientRect();
      if (
        r.left < hr.left - 1 ||
        r.right > hr.right + 1 ||
        r.top < hr.top - 1 ||
        r.bottom > hr.bottom + 1
      )
        clipped.push({ kind: "spills-component", a: label, in: name(host) });
    }
  }

  // icons: every img and outermost svg outside the board
  const icons = [];
  for (const el of document.querySelectorAll("img, svg")) {
    if (el.tagName.toLowerCase() === "svg" && el.parentElement && el.parentElement.closest("svg"))
      continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width),
      h = Math.round(r.height);
    if (!tokens.icons.includes(w) || !tokens.icons.includes(h))
      icons.push({
        a: name(el.closest(select) || el),
        src: el.getAttribute("src") || "svg",
        px: `${w}×${h}`,
      });
  }

  // hit targets
  const hits = [];
  for (const el of document.querySelectorAll(
    'button, a[href], [role="button"], input, select, [tabindex]:not([tabindex="-1"])',
  )) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < tokens.hit - TOL || r.height < tokens.hit - TOL)
      hits.push({ a: name(el), px: `${round(r.width)}×${round(r.height)}` });
  }

  // the island: share of the viewport, tiles under chrome, tiles off screen
  let boardInfo = { present: false };
  if (board) {
    const br = board.getBoundingClientRect();
    const iw = Math.max(0, Math.min(br.right, vw) - Math.max(br.left, 0));
    const ih = Math.max(0, Math.min(br.bottom, vh) - Math.max(br.top, 0));
    const tops = (groups.get(null) || []).map(rectOf);
    const tiles = [...board.querySelectorAll("[data-tile]")];
    let covered = [],
      off = 0;
    let hull = null;
    for (const t of tiles) {
      const poly = t.querySelector("polygon") || t;
      const r = poly.getBoundingClientRect();
      hull = hull
        ? {
            l: Math.min(hull.l, r.left),
            t: Math.min(hull.t, r.top),
            r: Math.max(hull.r, r.right),
            b: Math.max(hull.b, r.bottom),
          }
        : { l: r.left, t: r.top, r: r.right, b: r.bottom };
      if (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh) off++;
      // shrink to the hexagon's inscribed box so corner kisses do not count
      const ins = {
        l: r.left + r.width * 0.15,
        r: r.right - r.width * 0.15,
        t: r.top + r.height * 0.1,
        b: r.bottom - r.height * 0.1,
      };
      if (
        tops.some(
          (c) =>
            Math.min(ins.r, c.r) - Math.max(ins.l, c.l) > 2 &&
            Math.min(ins.b, c.b) - Math.max(ins.t, c.t) > 2,
        )
      )
        covered.push(t.getAttribute("data-tile"));
    }
    const hullArea = hull ? (hull.r - hull.l) * (hull.b - hull.t) : 0;
    boardInfo = {
      present: true,
      share: round((iw * ih * 100) / (vw * vh)),
      islandShare: round((hullArea * 100) / (vw * vh)),
      islandPx: hull ? `${Math.round(hull.r - hull.l)}×${Math.round(hull.b - hull.t)}` : null,
      tiles: tiles.length,
      tilesCovered: covered.length,
      coveredIds: covered.slice(0, listCap),
      tilesOffscreen: off,
    };
  }

  const cap = (l) => l.slice(0, listCap);
  return {
    tokens,
    components: comps.length,
    counts: {
      spacing: spacing.length,
      grid: grid.length,
      nearMiss: nearMiss.length,
      overlaps: overlaps.length,
      clipped: clipped.length,
      smallText: smallText.length,
      icons: icons.length,
      hitTargets: hits.length,
      tilesCovered: boardInfo.tilesCovered || 0,
      tilesOffscreen: boardInfo.tilesOffscreen || 0,
    },
    board: boardInfo,
    spacing: cap(spacing),
    grid: cap(grid),
    nearMiss: cap(nearMiss),
    overlaps: cap(overlaps),
    clipped: cap(clipped),
    smallText: cap(smallText),
    icons: cap(icons),
    hitTargets: cap(hits),
  };
}

const browser = await chromium.launch();
const report = { page, select, widths: {}, pass: true };
try {
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
    });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on("pageerror", (e) => errors.push(String(e.message || e)));
    await pg.goto(pathToFileURL(page).href + query, { waitUntil: "load" });
    await pg.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pg.evaluate(() => document.fonts && document.fonts.ready);
    await pg.waitForTimeout(250);
    const m = await pg.evaluate(measure, { select, listCap: LIST_CAP });
    m.pageErrors = errors;
    await pg.screenshot({ path: join(outDir, `shot-${w}.png`) });
    if (w === 1440) {
      // hover states the page asks for: data-gate-hover="<name>" → hover-<name>.png
      const hovers = await pg.$$eval("[data-gate-hover]", (els) =>
        els.map((e) => e.getAttribute("data-gate-hover")),
      );
      const dwell = await pg.$$eval("[data-gate-hover-wait]", (els) =>
        Object.fromEntries(
          els.map((e) => [
            e.getAttribute("data-gate-hover"),
            Number(e.getAttribute("data-gate-hover-wait")) || 0,
          ]),
        ),
      );
      const next = await pg.$$eval("[data-gate-hover-next]", (els) =>
        Object.fromEntries(
          els.map((e) => [
            e.getAttribute("data-gate-hover"),
            e.getAttribute("data-gate-hover-next"),
          ]),
        ),
      );
      m.hoverShots = [];
      for (const hname of [...new Set(hovers)]) {
        await pg.hover(`[data-gate-hover="${hname}"]`).catch(() => {});
        await pg.waitForTimeout(Math.max(300, dwell[hname] || 0));
        if (next[hname]) {
          await pg.hover(next[hname]).catch(() => {});
          await pg.waitForTimeout(Math.max(300, dwell[hname] || 0));
        }
        const file = `hover-${hname.replace(/[^a-z0-9-]/gi, "_")}.png`;
        await pg.screenshot({ path: join(outDir, file) });
        m.hoverShots.push(file);
        await pg.mouse.move(2, 2);
        await pg.waitForTimeout(150);
      }
    }
    const failing = Object.entries(m.counts)
      .filter(([, n]) => n > 0)
      .map(([k]) => k);
    if (!m.board.present) failing.push("no-board");
    if (errors.length) failing.push("page-errors");
    if (m.components === 0) failing.push("no-components");
    m.pass = failing.length === 0;
    m.failing = failing;
    report.widths[w] = m;
    if (!m.pass) report.pass = false;
    const c = m.counts;
    console.log(
      `${w}: ${m.pass ? "PASS" : "FAIL"} · comps ${m.components} · spacing ${c.spacing} · grid ${c.grid} · nearMiss ${c.nearMiss} · overlaps ${c.overlaps} · clipped ${c.clipped} · smallText ${c.smallText} · icons ${c.icons} · hit ${c.hitTargets} · tiles covered ${c.tilesCovered}/${m.board.tiles ?? "-"} off ${c.tilesOffscreen} · board ${m.board.share ?? "-"}% island ${m.board.islandShare ?? "-"}%${errors.length ? " · errors " + errors.length : ""}`,
    );
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(outDir, "gates.json"), JSON.stringify(report, null, 2));
console.log(`${report.pass ? "ALL PASS" : "FAIL"} → ${join(outDir, "gates.json")}`);
process.exit(report.pass ? 0 : 1);
