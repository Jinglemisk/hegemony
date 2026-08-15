/**
 * The conduct auditor — does this UI behave like a product?
 *
 * Its sibling, audit-ui-geometry.mjs, asks whether things sit where they should.
 * This one asks the questions that decide whether a UI is shippable rather than
 * merely tidy, and every one of them has been a real defect in this codebase
 * before:
 *
 *   NAMELESS   a control that announces nothing. The End Turn seal shipped this
 *              way for a whole phase — its art is aria-hidden, so the button had
 *              no accessible name at all and the e2e test could not find it.
 *   TINY       a target under 24x24 CSS px (WCAG 2.2 AA, 2.5.8). A 15px badge or
 *              an 8px dot is not something a hand can reliably hit.
 *   CONTRAST   text under 4.5:1 against what is actually painted behind it
 *              (3:1 for large text). Ivory-on-bone is exactly the palette where
 *              this goes wrong quietly.
 *   NOFOCUS    a control whose focused state is visually identical to its
 *              resting state — keyboard users cannot see where they are.
 *   DUPNAME    two controls in one group announcing the same thing, so the
 *              announcement does not identify either.
 *
 * Usage:  node scripts/audit-ui-conduct.mjs [--only <surface>]
 * Output: .playwright-mcp/audit/conduct.json + a printed summary
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { SURFACES, SIZES } from "./audit-ui-surfaces.mjs";

const ROOT = "/Users/jinglemisk/Desktop/hegemony-ui-overhaul/.playwright-mcp/audit";
const onlyIndex = process.argv.indexOf("--only");
const ONLY = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];

// PROBE is serialised into the page, so it carries browser globals eslint cannot
// infer from a file under scripts/.
/* global document, getComputedStyle, window */
const PROBE = () => {
  const out = [];
  const MIN_TARGET = 24; // WCAG 2.2 AA 2.5.8
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3;

  // ── colour ────────────────────────────────────────────────────────────────
  const parse = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    return Number.isFinite(r) ? { r, g, b, a } : null;
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const luminance = ({ r, g, b }) => {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };

  const ratio = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  /**
   * What is actually painted behind this element. Walks up compositing over
   * every translucent layer until it reaches an opaque one. An image or gradient
   * background is unknowable this way, so we bail rather than guess — a wrong
   * "pass" is worse than an absent one.
   */
  const backdrop = (el) => {
    let layers = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none") return null; // unknowable, honestly
      const c = parse(style.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    if (!layers.length) return null;
    let base = layers[layers.length - 1];
    if (base.a < 0.999) return null;
    for (let i = layers.length - 2; i >= 0; i -= 1) base = over(layers[i], base);
    return base;
  };

  // ── identity ──────────────────────────────────────────────────────────────
  const describe = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls}${text ? ` «${text}»` : ""}`;
  };

  /** The name a screen reader would announce. Deliberately conservative. */
  const accessibleName = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();

    const labelledby = el.getAttribute("aria-labelledby");
    if (labelledby) {
      const named = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      if (named) return named;
    }

    // Visible text, minus anything hidden from the accessibility tree.
    const clone = el.cloneNode(true);
    for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    const text = (clone.textContent || "").trim();
    if (text) return text;

    const title = el.getAttribute("title");
    if (title && title.trim()) return title.trim();

    const img = el.querySelector("img[alt]");
    if (img && img.getAttribute("alt").trim()) return img.getAttribute("alt").trim();

    return "";
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      Number(style.opacity) > 0.05 &&
      !el.closest('[aria-hidden="true"]') &&
      !el.closest(".visuallyHidden")
    );
  };

  const CONTROLS =
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const controls = [...document.querySelectorAll(CONTROLS)].filter(visible);

  const groups = new Map();

  for (const el of controls) {
    const rect = el.getBoundingClientRect();
    const name = accessibleName(el);

    // ── NAMELESS ─────────────────────────────────────────────────────────────
    if (!name) {
      out.push({ kind: "NAMELESS", el: describe(el) });
    } else {
      const key = `${el.closest("[role], nav, section, header, footer")?.className ?? "root"}|${name}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    // ── TINY ─────────────────────────────────────────────────────────────────
    // WCAG 2.5.8 exempts a target that sits *in a sentence*, because moving it
    // would break the sentence. This app leans on that heavily: a rich token
    // ("Gold", "Metropolis") is a glossary link inside running text, and there
    // are hundreds of them. Test it the way the spec means it — is the control
    // laid out inline, inside text? — rather than by listing container classes,
    // which missed most of them and buried the real findings.
    const display = getComputedStyle(el).display;
    const inline = display === "inline" || display === "inline-block" || display === "inline-flex";
    const inSentence =
      inline &&
      el.parentElement &&
      (el.parentElement.textContent || "").trim().length > (el.textContent || "").trim().length + 4;
    if (!inSentence && (rect.width < MIN_TARGET || rect.height < MIN_TARGET)) {
      out.push({
        kind: "TINY",
        el: describe(el),
        detail: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      });
    }
  }

  // ── DUPNAME ────────────────────────────────────────────────────────────────
  for (const [key, count] of groups) {
    if (count > 1) {
      out.push({ kind: "DUPNAME", el: key.split("|")[1], detail: `${count} controls` });
    }
  }

  // ── CONTRAST ───────────────────────────────────────────────────────────────
  const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let textNode = walker.nextNode();
  while (textNode) {
    const value = (textNode.nodeValue || "").trim();
    const el = textNode.parentElement;
    if (value.length > 1 && el && visible(el) && !seen.has(el)) {
      seen.add(el);
      const style = getComputedStyle(el);
      const fg = parse(style.color);
      const bg = backdrop(el);
      if (fg && bg) {
        const size = parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const need = large ? AA_LARGE : AA_NORMAL;
        const got = ratio(over(fg, bg), bg);
        if (got < need) {
          out.push({
            kind: "CONTRAST",
            el: describe(el),
            detail: `${got.toFixed(2)}:1 needs ${need}:1 (${Math.round(size)}px${bold ? " bold" : ""})`,
          });
        }
      }
    }
    textNode = walker.nextNode();
  }

  return { defects: out, controlCount: controls.length };
};

/**
 * Focus visibility, tested the only way that is honest: with the Tab key.
 *
 * `element.focus()` does NOT make `:focus-visible` match — that pseudo-class
 * deliberately withholds the ring when focus was moved programmatically or by a
 * mouse, and paints it for keyboard users. A probe that calls .focus() therefore
 * reports every correctly-styled control in the app as unfocusable. The first
 * run of this file did exactly that and produced 277 findings, all fiction.
 *
 * So: stamp every control, record how each one looks at rest, then walk the real
 * tab order with real key presses and compare.
 */
const STAMP_AND_REST = () => {
  const seal = (style) =>
    [
      style.outlineWidth,
      style.outlineColor,
      style.outlineStyle,
      style.boxShadow,
      style.backgroundColor,
      style.borderColor,
      style.color,
      style.filter,
      style.transform,
    ].join("|");

  const describe = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    return `${el.tagName.toLowerCase()}${cls}${text ? ` «${text}»` : ""}`;
  };

  const rest = {};
  const controls = [
    ...document.querySelectorAll('button, a[href], [role="button"], [role="tab"], input, select'),
  ].filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.hasAttribute("disabled");
  });

  controls.forEach((el, i) => {
    el.setAttribute("data-audit-idx", String(i));
    rest[i] = { seal: seal(getComputedStyle(el)), el: describe(el) };
  });

  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  return rest;
};

/** What is focused right now, and how does it look? */
const FOCUSED_NOW = () => {
  const el = document.activeElement;
  if (!el || el === document.body || !el.getAttribute) return null;
  const idx = el.getAttribute("data-audit-idx");
  if (idx === null) return null;
  const style = getComputedStyle(el);
  return {
    idx,
    seal: [
      style.outlineWidth,
      style.outlineColor,
      style.outlineStyle,
      style.boxShadow,
      style.backgroundColor,
      style.borderColor,
      style.color,
      style.filter,
      style.transform,
    ].join("|"),
  };
};

/**
 * Walk the real tab order and report every stop whose appearance does not change.
 * Stops after a full cycle or 80 presses, whichever comes first.
 */
const tabThrough = async (page) => {
  const rest = await page.evaluate(STAMP_AND_REST);
  const out = [];
  const seenIdx = new Set();

  for (let press = 0; press < 80; press += 1) {
    await page.keyboard.press("Tab");
    const now = await page.evaluate(FOCUSED_NOW);
    if (!now) continue; // focus left the stamped set (browser chrome, body)
    if (seenIdx.has(now.idx)) break; // wrapped around
    seenIdx.add(now.idx);

    const resting = rest[now.idx];
    if (resting && resting.seal === now.seal) {
      out.push({ kind: "NOFOCUS", el: resting.el });
    }
  }
  return out;
};

// ── run ──────────────────────────────────────────────────────────────────────
await mkdir(ROOT, { recursive: true });
const browser = await chromium.launch();
const report = [];
const consoleErrors = [];
let controlsSeen = 0;

for (const [w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });

  for (const surface of SURFACES) {
    // Progress goes to stderr as it happens. A checker that prints only at the
    // end is indistinguishable from a hung one, which cost a run to learn.
    process.stderr.write(`  ${w} ${surface.name} … `);
    const started = Date.now();
    await surface.go(page).catch((e) => consoleErrors.push(`drive ${surface.name}: ${e.message}`));
    if (!ONLY || surface.name === ONLY) {
      const { defects, controlCount } = await page.evaluate(PROBE);
      const focus = await tabThrough(page);
      controlsSeen = Math.max(controlsSeen, controlCount);
      for (const d of [...defects, ...focus])
        report.push({ surface: surface.name, width: w, ...d });
      process.stderr.write(`${defects.length + focus.length} in ${Date.now() - started}ms\n`);
    } else {
      process.stderr.write("skipped\n");
    }
    if (surface.after) await surface.after(page).catch(() => {});
  }
  await page.close();
}
await browser.close();

// Fold across widths — a nameless button is one defect, not three.
const folded = new Map();
for (const d of report) {
  const key = `${d.surface}|${d.kind}|${d.el}|${d.detail ?? ""}`;
  const seen = folded.get(key);
  if (seen) seen.widths.push(d.width);
  else folded.set(key, { ...d, widths: [d.width] });
}
const rows = [...folded.values()];

await writeFile(
  `${ROOT}/conduct.json`,
  JSON.stringify({ rows, consoleErrors: [...new Set(consoleErrors)] }, null, 2),
);

const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;

console.log(
  `\n${rows.length} conduct defects across ${new Set(rows.map((r) => r.surface)).size} surfaces`,
);
console.log(byKind, `\n(${controlsSeen} controls inspected at the busiest surface)\n`);

const bySurface = new Map();
for (const r of rows) bySurface.set(r.surface, [...(bySurface.get(r.surface) ?? []), r]);
for (const [surface, list] of [...bySurface.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`── ${surface} (${list.length})`);
  for (const r of list.slice(0, 16)) {
    console.log(`   ${r.kind.padEnd(9)} ${r.el}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  if (list.length > 16) console.log(`   … ${list.length - 16} more`);
}
console.log(
  consoleErrors.length
    ? `\nCONSOLE ERRORS:\n${[...new Set(consoleErrors)].join("\n")}`
    : "\nno console errors",
);
