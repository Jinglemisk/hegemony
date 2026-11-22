import { useSyncExternalStore } from "react";

/**
 * The Text size setting: Standard, Large (115 %) or Largest (130 %). It scales
 * every type token through --text-scale on <html>; boxes keep their size. Kept
 * per browser in localStorage. The menu that sets it comes with the top bar.
 */
export type TextScale = "standard" | "large" | "largest";

const FACTOR: Record<TextScale, number> = { standard: 1, large: 1.15, largest: 1.3 };
const KEY = "hegemony.textScale";
const listeners = new Set<() => void>();

function stored(): TextScale {
  try {
    const value = localStorage.getItem(KEY);
    return value && Object.hasOwn(FACTOR, value) ? (value as TextScale) : "standard";
  } catch {
    return "standard";
  }
}

// Read from storage on first use, not at import.
let current: TextScale | null = null;
const read = () => (current ??= stored());

/** Write a scale onto <html>, where the type tokens read it. */
function apply(scale: TextScale) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--text-scale", String(FACTOR[scale]));
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
  if (listeners.size === 0) apply(read());
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The Text size setting and its setter. Every reader re-renders when it changes. */
export function useTextScale(): [TextScale, (scale: TextScale) => void] {
  const scale = useSyncExternalStore(subscribe, read, () => "standard" as TextScale);
  return [scale, setTextScale];
}
