/**
 * The glyph table — every line icon in Hegemony, drawn once, in one place.
 *
 * Construction rules, and they are not negotiable if the set is to read as one
 * hand:
 *   · 24×24 viewBox, nothing outside 2…22 except a deliberate bleed
 *   · stroke only, `currentColor`, weight set once in icons.css (1.7 at 24px)
 *   · round caps and joins
 *   · at most ONE solid mass per glyph, and only when the mass IS the meaning
 *     (a pupil, a wax seal, a filled half)
 *   · legible at 14px: if a glyph needs a fourth stroke to be understood, it is
 *     the wrong glyph. Draw it simpler.
 *
 * Keeping the path data here rather than in per-glyph components is what holds
 * the line weight and the optical grid uniform — you can read the whole alphabet
 * in one screenful and see immediately when one glyph is drawn heavier than its
 * neighbours.
 *
 * Meaning lives in `iconRegistry.ts`. This module knows shapes, not what they
 * are for; two registry entries pointing at the same glyph is a statement that
 * they are the same *thing* (forest terrain and the wood resource are one tree),
 * never a shortcut.
 */

export type GlyphShape =
  | { readonly kind: "path"; readonly d: string; readonly solid?: true }
  | {
      readonly kind: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly solid?: true;
    }
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    };

const p = (d: string): GlyphShape => ({ kind: "path", d });
const fill = (d: string): GlyphShape => ({ kind: "path", d, solid: true });
const c = (cx: number, cy: number, r: number): GlyphShape => ({ kind: "circle", cx, cy, r });
const dot = (cx: number, cy: number, r: number): GlyphShape => ({
  kind: "circle",
  cx,
  cy,
  r,
  solid: true,
});
const box = (x: number, y: number, w: number, h: number): GlyphShape => ({
  kind: "rect",
  x,
  y,
  w,
  h,
});

/* Shared limbs. A bust is a head, shoulders and a plinth; the four politicians
   differ only in what sits on the head, which is exactly how a herm works. */
const BUST_HEAD = p(
  "M12 4.6a3.5 3.5 0 0 1 3.5 3.5v1.8a3.5 3.5 0 0 1-7 0V8.1A3.5 3.5 0 0 1 12 4.6z",
);
const BUST_BODY = p("M5.6 19c1-3.2 3.3-4.8 6.4-4.8s5.4 1.6 6.4 4.8");
const BUST_PLINTH = p("M4.5 19h15M6.5 19v2.4h11V19");
const bust = (...crown: GlyphShape[]): GlyphShape[] => [
  BUST_HEAD,
  BUST_BODY,
  BUST_PLINTH,
  ...crown,
];

/* The figure, in three states of freedom. Only the mark below the shoulders
   changes: a citizen wears the wreath, a freeman wears nothing, a slave wears
   the bond. Colour never distinguishes them — the game's whole ladder rides on
   these three silhouettes being told apart at 14px. */
const FIGURE_HEAD = c(12, 9, 4);
const FIGURE_BODY = p("M6 20c.8-3.6 3-5.4 6-5.4s5.2 1.8 6 5.4");

/* The store, the vessel and the bowl recur across a dozen effects; drawing them
   from the same three paths is what keeps "your stores" one idea. */
const BOWL = p("M4 13.8c0 3.9 3.6 6.7 8 6.7s8-2.8 8-6.7z");
const CRATES = p("M4 20h16M6 20v-5h5v5M13 20v-8h5v8M6 15v-4h5v4");
const PLINTH = p("M6 20h12M8 20v-3h8v3");
const CYCLE = p("M20 12a8 8 0 1 1-2.3-5.6M20 4.5V8h-3.5");
const STELE = p("M7 21V8.5a5 5 0 0 1 10 0V21z");
const TEMPLE_FRONT = p("M4 20h16M6 20V10m6 10V10m6 10V10M3 10l9-6 9 6z");
const WHEAT = p("M12 21v-8M12 13 8 10m4 3 4-3M12 9.5 8 6.5m4 3 4-3M12 6 9.5 3.5M12 6l2.5-2.5");
const SLASH = p("M4.5 19.5 19.5 4.5");
const MASK_HOLLOW = p("M4 5c2.5 1.2 5.2 1.8 8 1.8S17.5 6.2 20 5v6c0 5-3.5 8.5-8 8.5S4 16 4 11z");

export const GLYPHS = {
  /* ── Resources ─────────────────────────────────────────────────────────────
     Six materials, six silhouettes. These replace the alpha-keyed PNG masks so
     the whole set shares one line weight — the masks were painted at a different
     density and always read heavier than everything beside them. */
  wood: [p("M12 3 8 10h1.5l-4 7h13l-4-7H16z"), p("M12 17v4")],
  /* Squat and lumpy with a flat bottom, deliberately NOT the mountain's peak —
     the first draft was a pointed crag and the two were indistinguishable at
     14px, which matters because one is a resource and one is ground. */
  stone: [
    p("M3 19.5c-.5-4 2-7.5 6-7.5 1.5-3 6-3.5 8 0 3 .5 4.5 3.5 4 7.5z"),
    p("M9 12 10.5 19.5M17 12l-1.5 7.5"),
  ],
  gold: [
    p("M5 9c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z"),
    p("M5 9v5c0 1.7 3.1 3 7 3s7-1.3 7-3V9"),
    p("M5 11.5c0 1.7 3.1 3 7 3s7-1.3 7-3"),
  ],
  food: [WHEAT],
  /* A ribboned medal. Influence is spendable but it is not money — a second coin
     glyph beside gold would have been unreadable, and standing to be honoured is
     what the resource actually models. (The first draft was an Ionic capital and
     read as a table.) */
  influence: [c(12, 8, 4), p("M9.4 11.3 7 20.5l3.2-1.6L12 21l1.8-2.1 3.2 1.6-2.4-9.2")],
  /* The theatre mask. The old happiness PNG had no alpha channel at all and
     always rendered as a beige square — this is the glyph that finally replaces
     it, in the two moods the game actually has. */
  happiness: [
    MASK_HOLLOW,
    p("M8.5 10.5v1.8M15.5 10.5v1.8"),
    p("M8 15c1.2 1.3 2.5 2 4 2s2.8-.7 4-2"),
  ],
  unhappiness: [
    MASK_HOLLOW,
    p("M8.5 11.5l2 1.2m5-1.2-2 1.2"),
    p("M8 16.5c1.2-1.3 2.5-2 4-2s2.8.7 4 2"),
  ],
  maskPlain: [MASK_HOLLOW],

  /* ── The ladder: three classes and the two rungs between them ─────────────── */
  citizens: [FIGURE_HEAD, FIGURE_BODY, p("M5 6c2-2 4-3 7-3s5 1 7 3")],
  freemen: [FIGURE_HEAD, FIGURE_BODY],
  slaves: [FIGURE_HEAD, FIGURE_BODY, p("M8 12l8 2")],
  promote: [p("M6 20h12M6 14h12"), p("M12 11V3m-3.5 3.5L12 3l3.5 3.5")],
  demote: [p("M6 4h12M6 10h12"), p("M12 13v8m-3.5-3.5L12 21l3.5-3.5")],

  /* ── Settlements ───────────────────────────────────────────────────────────
     One family, three ranks: the capital is the temple with the sacred mark in
     its tympanum, a city is the same front with fewer columns, a colony is a
     roof and four walls. Rank reads by column count, never by size. */
  capital: [TEMPLE_FRONT, p("M12 4V1.6M10.6 2.4h2.8"), dot(12, 8, 1.2)],
  city: [p("M4 20h16M7 20V11m10 9V11M3.5 11 12 6l8.5 5z")],
  colony: [p("M4 20h16M6 20v-7l6-4 6 4v7")],

  /* ── Terrain ───────────────────────────────────────────────────────────────
     Ground, drawn as ground. The board carries terrain KIND by these emblems,
     which is what lets the terrain colour ramp stay almost flat.
     Plains are crops on a furrow line: drawn as two wave lines first, which read
     as the sea — the one thing plains must never be mistaken for on this board. */
  plains: [
    p("M3 19.5h18"),
    p("M7 19.5v-4m0 0-2-2m2 2 2-2M12 19.5v-6m0 0-2-2m2 2 2-2M17 19.5v-4m0 0-2-2m2 2 2-2"),
  ],
  hill: [p("M3 18l5-7 4 5 3-3 6 5z")],
  mountain: [p("M2 19l6.5-11L13 15l2.5-3.5L21 19z"), p("M6.5 15h3.4M14.6 14h2.6")],
  /* A tripod over the chasm — the oracle is a place you consult, not a resource
     you take, so it gets cult furniture rather than landscape. */
  oracle: [
    p("M12 4.5a3.8 3.8 0 0 1 3.8 3.8c0 1.9-1.5 2.9-3.8 2.9s-3.8-1-3.8-2.9A3.8 3.8 0 0 1 12 4.5z"),
    p("M9.2 11.2 6.5 20M14.8 11.2 17.5 20M12 11.2V20"),
  ],

  /* ── The seven verbs, plus the seal ───────────────────────────────────────── */
  grow: [p("M12 21V11m0 0C12 7 9 5 5 5c0 4 3 6 7 6zm0-2c0-3 2.5-5 6-5 0 3-2.5 5-6 5z")],
  move: [
    p("M7 20c-1-3 0-5 2-6m6-8c1 3 0 5-2 6M9 4C7 5 6 7 7 9m8 8c2-1 3-3 2-5"),
    c(8, 11.5, 1.6),
    c(15.5, 8, 1.6),
  ],
  found: [box(5, 13, 14, 7), p("M8 13V9l4-3 4 3v4")],
  upgrade: [p("M6 20h12M8 20V8m8 12V8M6 8h12M9 8V5h6v3")],
  build: [p("M4 20l6-6m2-2 8-8m-8 8 3 3M12 12 9 9m5 11h6v-6")],
  calm: [p("M5 13c2-2 5-2 7 0s5 2 7 0M8 13V7a4 4 0 0 1 8 0v6")],
  venture: [p("M3 15c4 3 14 3 18 0M5 15V9l7-4v10m0-6 6 3v3")],
  hourglass: [p("M7 3h10M7 21h10M8.5 3v3.4L12 11l3.5-4.6V3M8.5 21v-3.4L12 13l3.5 4.6V21")],

  /* ── Buildings ─────────────────────────────────────────────────────────────
     Each is the building's own architecture, never a generic "structure" box:
     the player learns nine rooflines, and the Build tab stops being a word list. */
  marketplace: [p("M4 10h16M5 10V6h14v4M6 10v10h12V10m-9 4h6")],
  temple: [TEMPLE_FRONT],
  workshop: [box(4, 12, 7, 8), box(13, 6, 7, 14), p("M7.5 12V8.5L11 6")],
  granary: [p("M5 20V9l7-5 7 5v11M9 20v-6h6v6M5 20h14")],
  /* The scales — the forum is where things are weighed and argued, and the same
     glyph carries the bank's exchange rate for exactly that reason. */
  forum: [p("M12 4v3m0 0L5 9m7-2 7 2M5 9l-2 5h6L7 9zm14 0-2 5h6l-2-5zM12 7v13m-4 0h8")],
  aqueduct: [
    p("M2 5h20M2 8h20M4 8v12M20 8v12M2 20h20"),
    p("M7 20v-4.6a2.2 2.2 0 0 1 4.4 0V20M12.6 20v-4.6a2.2 2.2 0 0 1 4.4 0V20"),
  ],
  odeon: [p("M4 19c2-6 6-9 8-9s6 3 8 9M12 10V5m-3 2.5L12 5l3 2.5")],
  villa: [p("M4 20h16M6 20v-8h12v8M4 12l8-5 8 5M9.5 20v-4h3.5v4")],
  /* The peristyle court, in plan: a colonnade around an open yard, with the way
     in at the bottom. The first draft was a running track and read as an eye,
     which the omen already owns. */
  gymnasion: [box(3.5, 3.5, 17, 17), box(8, 8, 8, 8), p("M10.5 20.5h3")],

  /* ── The four seasons ──────────────────────────────────────────────────────
     Read as a set on the season wheel, so they share a weight and each is a
     single unmistakable idea: a shoot, the sun, a leaf, a flake. */
  /* A bud, not a shoot: the Grow verb already owns the two-leaf sprout, and the
     season wheel sits a few hundred pixels from the verb rail. */
  spring: [
    p("M12 21v-8"),
    p(
      "M12 16c-2.8 0-4.6-1.9-4.6-4.7 2.8 0 4.6 1.9 4.6 4.7zm0 2.6c2.3 0 3.8-1.6 3.8-3.9-2.3 0-3.8 1.6-3.8 3.9z",
    ),
    c(12, 7, 3),
  ],
  summer: [
    c(12, 12, 4.2),
    p(
      "M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9",
    ),
  ],
  autumn: [
    p("M5 19C5 11 11 5 19 5c0 8-6 14-14 14z"),
    p("M19 5 9.5 14.5M14 8.5l.9 3.6M11 11.5l.9 3.6"),
  ],
  winter: [
    p("M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"),
    p("M12 6.6 9.6 4.6M12 6.6l2.4-2M12 17.4l-2.4 2M12 17.4l2.4 2"),
  ],

  /* ── The Assembly ──────────────────────────────────────────────────────────
     The politics register's own furniture. None of these appears on the board —
     seeing one is how the player knows they are in the agora. */
  law: [
    p(
      "M12 21V9M12 12c0-3-2-4.5-4.5-4.5C7.5 10 9 12 12 12zm0 0c0-3 2-4.5 4.5-4.5C16.5 10 15 12 12 12zm0 5c0-2.6-1.7-4-4-4 0 2.3 1.6 4 4 4zm0 0c0-2.6 1.7-4 4-4 0 2.3-1.6 4-4 4z",
    ),
  ],
  directive: [p("M5 3h10l4 4v14H5z"), p("M15 3v4h4"), p("M8.5 11h7M8.5 14.5h7M8.5 18h4")],
  stele: [STELE, p("M9.5 12h5M9.5 15.5h5")],
  repeal: [STELE, p("M12.5 8.5 10.5 13.5l3 1-2 7")],
  ostrakon: [p("M6 8.5 11.5 4l7 3-1.2 8.5L11 20 5.5 15z")],
  bema: [p("M3 20h18M5.5 20v-3h13v3M7.5 17v-3h9v3M9.5 14v-3h5v3")],
  veto: [c(12, 12, 8.5), p("M6 18 18 6")],
  bribe: [p("M6 8.5h12l1.5 11.5H4.5z"), p("M9 8.5V7a3 3 0 0 1 6 0v1.5"), p("M12 12.5v4")],

  /* ── The four orators ──────────────────────────────────────────────────────
     One bust, four crowns. Demosthenes wears the philosopher's beard, Perdiccas
     the magistrate's fillet, Kleistophenes the rustic's wreath, Stratokles the
     traveller's petasos — the populist is the one who dresses like the crowd. */
  /* Each crown is drawn OUTSIDE the head's silhouette. The first pass put the
     beard and the fillet inside it, where at 14px they vanished and all four
     orators became the same man. */
  demosthenes: bust(p("M9.5 12.6c.6 3.6 1.5 5.4 2.5 5.4s1.9-1.8 2.5-5.4")),
  perdiccas: bust(p("M7.4 8.2h9.2M7.4 8.2 5.8 12.4M16.6 8.2l1.6 4.2")),
  kleistophenes: bust(p("M7 6.6c1.4-2.8 8.6-2.8 10 0M7 6.6 5.2 5.2M17 6.6l1.8-1.4")),
  stratokles: bust(p("M5.5 6.8h13M8.4 6.8c0-2.4 1.6-3.8 3.6-3.8s3.6 1.4 3.6 3.8")),

  /* ── Tables and omens ──────────────────────────────────────────────────────── */
  riot: [
    p(
      "M6 21v-8M6 13 3.5 9M6 13l2.5-4M12 21V11M12 11 9.2 6.6M12 11l2.8-4.4M18 21v-8M18 13l-2.5-4M18 13l2.5-4",
    ),
  ],
  convoy: [box(3, 9, 13, 7), p("M16 11h3.5l1.5 3v2H16"), c(7, 19, 1.9), c(18, 19, 1.9)],
  /* The kerykeion — a herald's staff is what an embassy IS. */
  embassy: [
    p("M12 21V7"),
    c(12, 5, 1.8),
    p(
      "M12 8.5c-1.8-1.8-3.8-2-5.2-.6 1.4 1.4 3.4 1.6 5.2.6zm0 0c1.8-1.8 3.8-2 5.2-.6-1.4 1.4-3.4 1.6-5.2.6z",
    ),
    p("M9.5 13c2.5 0 2.5 3 5 3M9.5 17c2.5 0 2.5 3 5 3"),
  ],
  omen: [
    p("M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"),
    c(12, 12, 3.2),
    dot(12, 12, 1.3),
  ],
  /* Pips are drawn as rings, not filled dots: three solid masses would make the
     die the one glyph in the set that reads as a sticker, and at 14px a 1.6r ring
     closes up into a dot anyway. */
  die: [box(4.5, 4.5, 15, 15), c(9, 9, 1.6), c(12, 12, 1.6), c(15, 15, 1.6)],

  /* ── Victory ───────────────────────────────────────────────────────────────── */
  laurel: [
    p("M12 21C7.5 19 5 15 5 11c0-3.5 2.5-6.5 7-7.5M12 21c4.5-2 7-6 7-10 0-3.5-2.5-6.5-7-7.5"),
    p(
      "M6.6 14.5 4 13.5M7.8 10.7 5.4 9.2M10 7.3 8.2 5.4M17.4 14.5 20 13.5M16.2 10.7l2.4-1.5M14 7.3l1.8-1.9",
    ),
  ],
  treasury: [p("M12 4v10m0 0-3-3m3 3 3-3M5 20h14M7 20v-3h10v3")],
  voice: [p("M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm-6-3a6 6 0 0 0 12 0M12 18v3")],

  /* ── Effect grammar ────────────────────────────────────────────────────────
     Modifiers are MARKS, not objects: arrows, cycles, brackets, slashes. That is
     the whole trick that keeps ~50 effect glyphs apart from ~30 noun glyphs —
     you can tell at a glance whether an icon names a thing or a change to it. */
  stockpile: [CRATES],
  gain: [BOWL, p("M12 3v8m-3-3 3 3 3-3")],
  loss: [BOWL, p("M12 11V3m-3 3 3-3 3 3")],
  income: [CYCLE],
  suppress: [CYCLE, SLASH],
  /* The year dial: a full turn with the four seasons ticked and a needle. */
  yearCycle: [c(12, 12, 8), p("M12 4v2M20 12h-2M12 20v-2M4 12h2"), p("M12 12l4-4")],
  freeGrant: [CYCLE, p("M11 9v6m-3-3h6")],
  costDown: [PLINTH, p("M12 3v9m-3.5-3.5L12 12l3.5-3.5")],
  costUp: [PLINTH, p("M12 12V3m-3.5 3.5L12 3l3.5 3.5")],
  cross: [p("M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5")],
  exchange: [p("M4 9h13.5M14 5.5 17.5 9 14 12.5"), p("M20 15H6.5M10 11.5 6.5 15 10 18.5")],
  convert: [p("M3.5 4h17l-6.5 7.5V20l-4-2.5v-6z")],
  choice: [
    p("M12 21v-7L6.5 8.5V4M12 14l5.5-5.5V4"),
    p("M4.5 5.5 6.5 3.5 8.5 5.5M15.5 5.5 17.5 3.5 19.5 5.5"),
  ],
  /* Half the jar, taken. The one solid mass earns its place: the fraction IS the
     filled part. */
  fraction: [c(12, 12, 8.5), fill("M12 3.5a8.5 8.5 0 0 1 0 17z")],
  threshold: [p("M3 13h18"), p("M6.5 20v-4m5.5 4V8m5.5 12v-9")],
  capacity: [p("M6.5 4.5h11l-1.5 15h-8z"), p("M7.7 12.5h8.6")],
  starvation: [WHEAT, SLASH],
  crowd: [
    c(6, 10, 2.2),
    c(12, 8.5, 2.4),
    c(18, 10, 2.2),
    p(
      "M3 20c0-2.6 1.4-4 3-4s3 1.4 3 4M9 20c0-3.2 1.4-5 3-5s3 1.8 3 5M15 20c0-2.6 1.4-4 3-4s3 1.4 3 4",
    ),
  ],
  perPop: [c(8, 8, 3), p("M2.5 19c.6-3.4 2.6-5 5.5-5s4.9 1.6 5.5 5"), p("M16 20v-6h6v6z")],
  moodCrowd: [
    p("M8 3c1.2.6 2.6.9 4 .9s2.8-.3 4-.9v3.4c0 2.6-1.7 4.4-4 4.4S8 9 8 6.4z"),
    c(5, 17, 2.2),
    c(12, 17, 2.2),
    c(19, 17, 2.2),
  ],
  popGain: [c(10, 9, 3.4), p("M4 20c.7-3.8 3-5.6 6-5.6s5.3 1.8 6 5.6"), p("M19 4v6M16 7h6")],
  popLoss: [c(10, 9, 3.4), p("M4 20c.7-3.8 3-5.6 6-5.6s5.3 1.8 6 5.6"), p("M16 7h6")],
  popIncome: [
    c(8, 8, 3),
    p("M2.5 19c.6-3.4 2.6-5 5.5-5s4.9 1.6 5.5 5"),
    p("M19 7v8m-2.5-2.5L19 15l2.5-2.5"),
  ],
  cityIncome: [
    p("M3 18h11M4.5 18v-7m8 7v-7M2.5 11 8.5 7l6 4z"),
    p("M19 6v9m-2.5-2.5L19 15l2.5-2.5"),
  ],
  tileYield: [p("M12 2.5l8 4.6v9.2l-8 4.6-8-4.6V7.1z"), p("M12 16.5v-7m-2.5 2.5L12 9.5l2.5 2.5")],
  /* A column snapped at the drum: the only way to say "and it is gone" without
     writing the word. */
  ruin: [p("M5 21h14M8.5 21V6.5M6 6.5h5"), p("M15.5 21v-8m0 0-2-2 3-1.5-2-2.5V6.5")],
  equalVotes: [c(12, 12, 8.5), p("M8 10h8M8 14h8")],

  /* ── UI micro ──────────────────────────────────────────────────────────────── */
  chevronDown: [p("M6 9.5 12 15.5 18 9.5")],
  chevronRight: [p("M9.5 6 15.5 12 9.5 18")],
  plus: [p("M12 5v14M5 12h14")],
  minus: [p("M5 12h14")],
  search: [c(10.5, 10.5, 6), p("M15 15l5.5 5.5")],
  pin: [p("M12 21.5c4-5 6-8.4 6-11.5a6 6 0 1 0-12 0c0 3.1 2 6.5 6 11.5z"), c(12, 10, 2.2)],
} as const satisfies Record<string, readonly GlyphShape[]>;

export type GlyphId = keyof typeof GLYPHS;

export const GLYPH_IDS = Object.keys(GLYPHS) as readonly GlyphId[];
