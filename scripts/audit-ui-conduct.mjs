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
 *              (3:1 for large text and unavailable controls). Ivory-on-bone is
 *              exactly the palette where this goes wrong quietly, and parchment
 *              and glaze are textures, so their pixels are photographed.
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

const ROOT = `${process.cwd()}/.playwright-mcp/audit`;
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

  /**
   * WCAG 2.5.8's Inline exception: "the target is in a sentence, or its size is
   * otherwise constrained by the line-height of non-target text". Both halves of
   * that say the same thing about layout — the control is a WORD on a line it
   * shares with prose, and it cannot be made 24px tall without overlapping what
   * is above and below it.
   *
   * So test the layout, not the markup. The previous version asked whether the
   * immediate parent held more text than the control. Any wrapper element
   * defeats that (AnnotatedText emits one around every run it tokenises), and a
   * short chip like "-3 Food" could not satisfy its four-character slack either,
   * so it reported roughly forty glossary words in running prose as defects. It
   * was also the only reason to believe they were fixable: padding them to 24px
   * was tried, and the geometry auditor came back with 53 fresh COLLISION rows —
   * every one of them the padded word lying over the line above it. That is the
   * exception's whole point.
   *
   * "Non-target text" means text belonging to some OTHER control. Text inside a
   * control that CONTAINS this one still counts — a glossary word inside the top
   * bar's event chip is in a phrase, and the chip being focusable does not make
   * the phrase disappear.
   */
  const INLINE = new Set(["inline", "inline-block", "inline-flex"]);
  const exemptInline = (el) => {
    if (!INLINE.has(getComputedStyle(el).display)) return false;
    const own = [...el.getClientRects()];
    if (own.length === 0) return false;

    let block = el.parentElement;
    while (block && INLINE.has(getComputedStyle(block).display)) block = block.parentElement;
    if (!block) return false;

    const walker = document.createTreeWalker(block, window.NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node.nodeValue || "").trim()) continue;
      if (el.contains(node)) continue;
      const owner = node.parentElement?.closest(CONTROLS);
      if (owner && !owner.contains(el)) continue; // another target's text
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const other of range.getClientRects()) {
        for (const mine of own) {
          const shared = Math.min(other.bottom, mine.bottom) - Math.max(other.top, mine.top);
          if (shared > Math.min(other.height, mine.height) * 0.5) return true;
        }
      }
    }
    return false;
  };

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
    // A box placed by a fractional transform (the living map's labels) measures a
    // hair under its size in floating point: 23.99997 is a 24px target.
    const short = (n) => n < MIN_TARGET - 0.01;
    if (!exemptInline(el) && (short(rect.width) || short(rect.height))) {
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
  // Every text run a sighted player sees, measured against what is painted behind
  // it. A flat backdrop is composed here from the computed colours; a textured
  // one (parchment, glaze, a lacquer gradient) cannot be, so the run is DEFERRED:
  // the runner photographs the page with all text made transparent and samples
  // the real pixels behind each run (SAMPLE below). Text covered by something
  // drawn over it (a scrim, a popover) is not what the player reads, so it is
  // skipped: the topmost element at the run's centre must be the run's own.
  const deferred = [];
  const effOpacity = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement)
      o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  // Hit-testing sees through `pointer-events: none`, which every scrim and the HUD's
  // own canvases wear, so for this pass everything takes the pointer; then the
  // first painted box above the run (a background of its own) covers it, and a
  // bare container (a full-screen canvas) does not.
  const hits = document.createElement("style");
  hits.textContent = "* { pointer-events: auto !important; }";
  document.head.append(hits);
  // A scrim drawn as a page-sized shadow (the trade composer's) has no box to hit:
  // text outside its caster is under it, unless it stands in a layer above it.
  const reach = Math.max(window.innerWidth, window.innerHeight) / 2;
  const shadowScrims = [...document.querySelectorAll("body *")].filter((n) =>
    [
      ...getComputedStyle(n).boxShadow.matchAll(
        /(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px/g,
      ),
    ].some((m) => Number(m[4]) >= reach),
  );
  const covered = (el, rect) => {
    if (
      shadowScrims.some((scrim) => !scrim.contains(el)) &&
      !el.closest(".sharedTooltip, .ch-confirm-scrim")
    )
      return true;
    // A run a card lies across is under that card: its ends are tested as well as
    // its middle, so the card's own paint is never sampled as the run's ground.
    const y = rect.top + rect.height / 2;
    return [rect.left + 2, rect.left + rect.width / 2, rect.right - 2].some((x) =>
      coveredAt(el, x, y),
    );
  };
  const coveredAt = (el, x, y) => {
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return true;
    for (const hit of document.elementsFromPoint(x, y)) {
      if (hit === el || el.contains(hit)) return false;
      // An ancestor hit first: the run is not painted there (scrolled out of its
      // scroller, or clipped by a box that hides it).
      if (hit.contains(el)) return true;
      const s = getComputedStyle(hit);
      if (s.backgroundImage !== "none" || (parse(s.backgroundColor)?.a ?? 0) > 0.05) return true;
    }
    return true;
  };
  /** A text rect cut down to every ancestor box that clips it. */
  const clipToAncestors = (el, rect) => {
    let [left, top, right, bottom] = [rect.left, rect.top, rect.right, rect.bottom];
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const s = getComputedStyle(node);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const box = node.getBoundingClientRect();
      left = Math.max(left, box.left);
      top = Math.max(top, box.top);
      right = Math.min(right, box.right);
      bottom = Math.min(bottom, box.bottom);
    }
    return new window.DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  };
  const walker = document.createTreeWalker(document.body, window.NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
    const value = (textNode.nodeValue || "").trim();
    const el = textNode.parentElement;
    if (!/[\p{L}\p{N}]/u.test(value) || !el || seen.has(el)) continue;
    if (el.closest(".visuallyHidden, script, style, title")) continue;
    seen.add(el);
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    // A line cut with an ellipsis runs on past its box: only what its clipping
    // ancestors let through is drawn, so only that is sampled.
    const rects = [...range.getClientRects()]
      .map((r) => clipToAncestors(el, r))
      .filter((r) => r.width > 1 && r.height > 1);
    if (!rects.length || covered(el, rects[0])) continue;
    const op = effOpacity(el);
    if (op < 0.05) continue;
    const svg = el instanceof window.SVGElement;
    const fill = style.webkitTextFillColor;
    const ink = parse(svg ? style.fill : fill && !/, 0\)$/.test(fill) ? fill : style.color);
    if (!ink || ink.a === 0) continue;
    const fg = { ...ink, a: ink.a * op };
    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    // An unavailable control asks 3:1, like large text (the plan's Standards).
    const inactive = Boolean(el.closest("[disabled], [aria-disabled='true']"));
    const need = large || inactive ? AA_LARGE : AA_NORMAL;
    const label = `${Math.round(size)}px${bold ? " bold" : ""}${inactive ? " disabled" : ""}`;
    const bg = backdrop(el);
    if (bg) {
      const got = ratio(over(fg, bg), bg);
      if (got < need) {
        out.push({
          kind: "CONTRAST",
          el: describe(el),
          detail: `${got.toFixed(2)}:1 needs ${need}:1 (${label})`,
        });
      }
    } else {
      deferred.push({
        el: describe(el),
        fg,
        need,
        label,
        rects: rects.map((r) => [r.left, r.top, r.width, r.height]),
      });
    }
  }
  hits.remove();

  return { defects: out, deferred, controlCount: controls.length };
};

/** Every glyph made transparent, and nothing moving, for the backdrop's photograph. */
const HIDE_TEXT = `*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; transition: none !important; }
svg text, svg tspan { fill: transparent !important; stroke: transparent !important; }`;

/**
 * In the page: the contrast of each deferred run against the photographed
 * backdrop under its line boxes. Reported at the 2nd percentile of its pixels, so
 * the darkest grains of a texture count and a stray pixel of a neighbouring icon
 * does not.
 */
const SAMPLE = async ({ dataUrl, items }) => {
  const img = new window.Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const dpr = img.width / window.innerWidth;
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return items.map(({ fg, rects }) => {
    const ratios = [];
    for (const [x, y, w, h] of rects) {
      // A line box runs from ascent to descent, over a chip's own keyline or rim at
      // its top and foot: sample its middle band, where the glyphs stand.
      const dy = Math.max(1, h * 0.15);
      const x0 = Math.max(0, Math.floor((x + 1) * dpr));
      const y0 = Math.max(0, Math.floor((y + dy) * dpr));
      const x1 = Math.min(canvas.width, Math.ceil((x + w - 1) * dpr));
      const y1 = Math.min(canvas.height, Math.ceil((y + h - dy) * dpr));
      if (x1 <= x0 || y1 <= y0) continue;
      const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      for (let i = 0; i < d.length; i += 4) {
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
        const l1 = lum(
          fg.r * fg.a + r * (1 - fg.a),
          fg.g * fg.a + g * (1 - fg.a),
          fg.b * fg.a + b * (1 - fg.a),
        );
        const l2 = lum(r, g, b);
        ratios.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
      }
    }
    if (!ratios.length) return null;
    ratios.sort((a, b) => a - b);
    return ratios[Math.floor(ratios.length * 0.02)];
  });
};

/** The deferred runs' contrast, measured on a photograph of the page with no text. */
const sampleDeferred = async (page, deferred) => {
  if (!deferred.length) return [];
  const style = await page.addStyleTag({ content: HIDE_TEXT });
  const shot = await page.screenshot();
  await style.evaluate((el) => el.remove());
  const got = await page.evaluate(SAMPLE, {
    dataUrl: `data:image/png;base64,${shot.toString("base64")}`,
    items: deferred,
  });
  return deferred.flatMap((item, i) =>
    got[i] !== null && got[i] < item.need
      ? [
          {
            kind: "CONTRAST",
            el: item.el,
            detail: `${got[i].toFixed(2)}:1 needs ${item.need}:1 (${item.label}, on texture)`,
          },
        ]
      : [],
  );
};

/** Wait out every finite animation: a card mid-settle is still fading in. */
const settle = (page) =>
  page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .every(
            (a) =>
              a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity,
          ),
      null,
      { timeout: 3000 },
    )
    .catch(() => {});

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
 *
 * Two things the first version of this got wrong, both of which manufactured
 * findings rather than hiding them:
 *
 * · The rest seal was read BEFORE blurring whatever the last surface left
 *   focused, so a control that happened to be focused when we arrived was
 *   compared against its own focused self and always came back "identical".
 *   That is the whole of the tune fab and the armed Grow verb. Blur first.
 * · A ring is often painted on a CHILD, and an element-only seal cannot see it.
 *   The seal now covers the control and its first few descendants, and carries
 *   SVG paint (stroke, stroke-width, fill) as well as CSS box paint, because on
 *   an icon a stroke can be the ring.
 * · The map draws a focused tile's ring on its canvas, not on the tile's button,
 *   so a tile's seal also reads which tile the stage rings.
 */
const INSTALL_SEAL = () => {
  const props = (style) => [
    style.outlineWidth,
    style.outlineColor,
    style.outlineStyle,
    style.boxShadow,
    style.backgroundColor,
    style.borderColor,
    style.color,
    style.filter,
    style.transform,
    style.stroke,
    style.strokeWidth,
    style.fill,
    style.opacity,
  ];
  window.__auditSeal = (el) => {
    const parts = props(getComputedStyle(el));
    for (const child of [...el.querySelectorAll("*")].slice(0, 8)) {
      parts.push(...props(getComputedStyle(child)));
    }
    // The map draws its focus ring on the canvas; the stage names the ringed tile.
    if (el.classList.contains("lm-tile"))
      parts.push(el.closest(".living-map")?.dataset.focusRing === el.dataset.tileId);
    return parts.join("|");
  };
};

const STAMP_AND_REST = () => {
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

  // Blur BEFORE sealing: a control the previous surface left focused would
  // otherwise record its focused look as its resting one.
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }

  controls.forEach((el, i) => {
    el.setAttribute("data-audit-idx", String(i));
    rest[i] = { seal: window.__auditSeal(el), el: describe(el) };
  });

  return rest;
};

/** What is focused right now, and how does it look? */
const FOCUSED_NOW = () => {
  const el = document.activeElement;
  if (!el || el === document.body || !el.getAttribute) return null;
  const idx = el.getAttribute("data-audit-idx");
  if (idx === null) return null;
  return { idx, seal: window.__auditSeal(el) };
};

/**
 * Walk the real tab order and report every stop whose appearance does not change.
 * Stops after a full cycle or 80 presses, whichever comes first.
 *
 * The second look matters. Half this UI transitions its state changes over
 * 160ms, and `getComputedStyle` mid-transition returns the INTERPOLATED value —
 * read the instant after the key press and a control that is visibly lighting up
 * still reads exactly as it did at rest. Every hex on the board came back
 * "unfocusable" for that reason alone. So: read immediately, and only if it
 * looks unchanged wait out the transition and read once more. The cost is paid
 * on suspects only, which is a handful per surface rather than eighty.
 */
const tabThrough = async (page) => {
  await page.evaluate(INSTALL_SEAL);
  const rest = await page.evaluate(STAMP_AND_REST);
  const out = [];
  const seenIdx = new Set();

  for (let press = 0; press < 80; press += 1) {
    await page.keyboard.press("Tab");
    let now = await page.evaluate(FOCUSED_NOW);
    if (!now) continue; // focus left the stamped set (browser chrome, body)
    if (seenIdx.has(now.idx)) break; // wrapped around
    seenIdx.add(now.idx);

    const idx = now.idx;
    const resting = rest[idx];
    if (!resting || resting.seal !== now.seal) continue;

    await page.waitForTimeout(240); // longer than the longest transition in the app
    now = await page.evaluate(FOCUSED_NOW);
    if (now && now.idx === idx && resting.seal === now.seal) {
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
      await settle(page);
      const { defects, deferred, controlCount } = await page.evaluate(PROBE);
      defects.push(...(await sampleDeferred(page, deferred)));
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
