import { useSyncExternalStore } from "react";
import { fitScale } from "./canvas";

/**
 * The Text size setting: Standard, Large (115 %) or Largest (130 %). It scales
 * every type token through --text-scale on <html>; boxes keep their size. Kept
 * per browser in localStorage. The menu that sets it comes with the top bar.
 *
 * Until the player chooses, it follows the screen: the 13 px floor is drawn on the
 * 1440×900 canvas, so a canvas scaled under 0.95 (1280×800 draws it at 11.6 css px)
 * starts at Large.
 */
export type TextScale = "standard" | "large" | "largest";

const FACTOR: Record<TextScale, number> = { standard: 1, large: 1.15, largest: 1.3 };
const KEY = "hegemony.textScale";
const listeners = new Set<() => void>();

/** Below this canvas scale, the unchosen setting is Large. */
const LARGE_UNDER = 0.95;

/** The player's choice, or null while they have made none. */
function stored(): TextScale | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && Object.hasOwn(FACTOR, value) ? (value as TextScale) : null;
  } catch {
    return null;
  }
}

/** The setting before any choice: Large on a screen that draws the canvas small. */
export function screenDefault(width: number, height: number): TextScale {
  return fitScale(width, height) < LARGE_UNDER ? "large" : "standard";
}

const unchosen = () =>
  typeof window === "undefined" ? "standard" : screenDefault(window.innerWidth, window.innerHeight);

// Read from storage on first use, not at import.
let current: TextScale | null = null;
const read = () => (current ??= stored() ?? unchosen());

/** Unchosen, the setting follows the window across a resize. */
function follow() {
  if (stored() !== null) return;
  const next = unchosen();
  if (next === current) return;
  current = next;
  apply(next);
  listeners.forEach((listener) => listener());
}

/** Write a scale onto <html>, where the type tokens read it; its name too, for a box
 *  that shows fewer lines at a larger size (a toast's clamp). */
function apply(scale: TextScale) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--text-scale", String(FACTOR[scale]));
  document.documentElement.dataset.textScale = scale;
}

function setTextScale(scale: TextScale) {
  current = scale;
  try {
    localStorage.setItem(KEY, scale);
  } catch {
    // Private mode or blocked storage: the setting holds for this visit only.
  }
  apply(scale);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  // The first reader applies what was stored, so the setting holds from load.
  if (listeners.size === 0) {
    apply(read());
    window.addEventListener("resize", follow);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("resize", follow);
  };
}

/** The Text size setting and its setter. Every reader re-renders when it changes. */
export function useTextScale(): [TextScale, (scale: TextScale) => void] {
  const scale = useSyncExternalStore(subscribe, read, () => "standard" as TextScale);
  return [scale, setTextScale];
}
