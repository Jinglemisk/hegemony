/**
 * The Assembly's two bespoke verbs.
 *
 * Inline SVG on a 24×24 box, `fill="none" stroke="currentColor"`, round caps and
 * joins — so each inks itself from its container's colour and neither needs a
 * sprite-sheet cell. That matters here because the scene runs on a dark ground
 * and the atlas sprites are baked to clay.
 *
 * The set used to be seven. The scene rebuild spent five of them: the urn (the
 * head is a Greek kicker over a title now), the yea / nay / waiting marks (an
 * ostrakon bears ΝΑΙ, ΟΥ or a middot — Greek, not a check and a cross) and the
 * draw document (the seal reads DRAW n ⟨influence⟩, and the influence glyph is
 * the one that matters on it).
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Repeal — a law leaving the record. */
export function RepealIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...STROKE}
      strokeWidth={1.7}
    >
      <path d="M9 5.4H6.4A2.4 2.4 0 0 0 4 7.8v9.6a2.4 2.4 0 0 0 2.4 2.4h11.2a2.4 2.4 0 0 0 2.4-2.4V7.8a2.4 2.4 0 0 0-2.4-2.4H15" />
      <path d="M9.4 12.4h5.2M9 4.2l3 3-3 3" />
    </svg>
  );
}

/**
 * The fracture that opens across a struck stele, drawn as it PROPAGATES: each
 * path carries `pathLength={1}` so `assemblyScene.css` can walk one normalised
 * dash offset from 1 to 0 and the split runs, rather than appearing whole.
 *
 * It is the one glyph here that is not on a 24×24 box. A crack has to fit the
 * stone it is in — the slab is a wide, short box of no fixed ratio — so the
 * viewBox is stretched to the slab (`preserveAspectRatio="none"`) and the sheet
 * pins the stroke with `vector-effect` so the hairline stays a hairline at any
 * width instead of being fattened by the horizontal stretch.
 *
 * Light, not dark. On the house's night ground the slab is barely lighter than
 * the floor, and a dark fissure drawn on it disappears; a fresh break in bone
 * catches what light there is, which is also what it would do.
 */
export function SteleCrack() {
  return (
    <svg
      aria-hidden="true"
      className="asmCrack"
      preserveAspectRatio="none"
      viewBox="0 0 100 40"
      {...STROKE}
      strokeWidth={1.4}
    >
      <path d="M41 0 46 7 38 13 45 20 37 27 44 33 39 40" pathLength={1} />
      <path d="M38 13 25 10" pathLength={1} />
      <path d="M45 20 61 25" pathLength={1} />
      <path d="M44 33 54 37" pathLength={1} />
    </svg>
  );
}

/** Hold your peace — say nothing this assembly. */
export function PassIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...STROKE}
      strokeWidth={1.7}
    >
      <path d="M12 4.4v15.2M6.2 9.2h11.6M6.2 14.8h11.6" />
    </svg>
  );
}
