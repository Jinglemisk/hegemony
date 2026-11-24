/** How long the pointer rests on a trigger before its tooltip opens, so sweeping the
 *  pointer across the screen doesn't flash a tooltip at every stop. Keyboard focus
 *  and touch open at once. */
export const TIP_OPEN_MS = 400;

/** How long the pointer rests on a tooltip with underlined terms before it locks. */
export const TIP_LOCK_MS = 600;

/** How long the pointer may cross a gap between a locked tooltip and what it came
 *  from before the stack closes. */
export const TIP_GRACE_MS = 300;

/** How the tooltip on screen is closed: one at a time, so a new one never opens over
 *  the last one's grace (TIP_GRACE_MS) or a trigger that missed its leave. */
let shown: (() => void) | null = null;

/** A tooltip opens: the one before it, if any, closes at once. */
export function claimTip(close: () => void) {
  if (shown !== close) shown?.();
  shown = close;
}

/** A tooltip unmounts: nothing is left to close. */
export function releaseTip(close: () => void) {
  if (shown === close) shown = null;
}
