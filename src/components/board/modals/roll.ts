/** How long the riot's die tumbles before it lands (owner, 2026-11-25: about a second).
 *  `dieTumble` in ceremony.css runs the same length. */
export const TUMBLE_MS = 1000;

/** Whether the player asked for stillness: then the die lands at once and nothing moves. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
