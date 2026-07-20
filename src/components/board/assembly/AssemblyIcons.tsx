/**
 * The Assembly's glyph set, transcribed from the approved visual reference
 * (docs/design/showcases/assembly-mode-showcase.html §13).
 *
 * All inline SVG on a 24×24 box, `fill="none" stroke="currentColor"`, round caps and
 * joins — so every icon inks itself from its container's colour and none of them need
 * a sprite-sheet cell. That matters here because the Assembly is the first surface in
 * the game with its own colour register (aegean), and the atlas sprites are baked to
 * clay.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round"
} as const;

/**
 * The voting urn — a two-handled kalpis on its base. The Assembly's identity mark,
 * and the one bespoke glyph in the set: the *psephos* was dropped into exactly this
 * vessel, so it carries the whole system's meaning on its own.
 */
export function UrnIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.5}>
      <path d="M7 4h10M8.6 4l.9 3.2M15.4 4l-.9 3.2M9.5 7.2c-3.1 1.4-3.4 9.8 2.5 13 5.9-3.2 5.6-11.6 2.5-13M6.2 20.4h11.6" />
    </svg>
  );
}

/** Cast yea — the pebble went in. */
export function YeaMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20" {...STROKE} strokeWidth={2.6}>
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

/** Cast nay. */
export function NayMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20" {...STROKE} strokeWidth={2.6}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

/** Yet to speak — a dashed ring, the empty place in the urn. */
export function WaitMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20" {...STROKE} strokeWidth={2.2}>
      <circle cx="10" cy="10" r="6" strokeDasharray="3 3" />
    </svg>
  );
}

/** Sealed — a held card no other seat may see until it is proposed. */
export function SealIcon({ size = 10 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.8}>
      <path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5z" />
    </svg>
  );
}

/** Draw — a ruled document with a folded corner. */
export function DrawIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.7}>
      <path d="M5 4.4h9l4 4v11.2H5zM14 4.4V8.4h4M8 12.4h7M8 15.6h7" />
    </svg>
  );
}

/** Bribe — a coin. */
export function BribeIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="6.6" />
      <path d="M12 8.4v7.2M10.2 10.2h2.9a1.4 1.4 0 0 1 0 2.8h-1.8a1.4 1.4 0 0 0 0 2.8H14" />
    </svg>
  );
}

/** Veto — the circle-slash. */
export function VetoIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M6.2 6.2l11.6 11.6" />
    </svg>
  );
}

/** Repeal — a law leaving the record. */
export function RepealIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.7}>
      <path d="M9 5.4H6.4A2.4 2.4 0 0 0 4 7.8v9.6a2.4 2.4 0 0 0 2.4 2.4h11.2a2.4 2.4 0 0 0 2.4-2.4V7.8a2.4 2.4 0 0 0-2.4-2.4H15" />
      <path d="M9.4 12.4h5.2M9 4.2l3 3-3 3" />
    </svg>
  );
}

/** Hold your peace — say nothing this assembly. */
export function PassIcon({ size = 15 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} {...STROKE} strokeWidth={1.7}>
      <path d="M12 4.4v15.2M6.2 9.2h11.6M6.2 14.8h11.6" />
    </svg>
  );
}
