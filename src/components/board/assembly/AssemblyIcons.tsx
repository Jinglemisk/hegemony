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
