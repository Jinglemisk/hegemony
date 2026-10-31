/**
 * How the map draws each tile's resource badge: a player's display choice, changed from
 * the dock's Plates menu and kept in the browser until a settings screen takes it.
 * Ivory, large and kept close in is the plate as it stood before 2026-10-30.
 */
export type Plates = {
  /** A dark chip, the old ivory plate, or the slots as dots. */
  look: "dark" | "ivory" | "dots";
  /** The numeral 0.3 of the hex's width up to 24px, or 0.55 up to 32px. */
  size: "small" | "large";
  /** Close in the badges fade (but in Economy), or stay. */
  close: "fade" | "keep";
};

export const PLATE_DEFAULTS: Plates = { look: "dark", size: "small", close: "fade" };

export const PLATE_CHOICES = [
  {
    key: "look",
    label: "Look",
    options: [
      { value: "dark", label: "Dark" },
      { value: "ivory", label: "Ivory" },
      { value: "dots", label: "Dots" },
    ],
  },
  {
    key: "size",
    label: "Size",
    options: [
      { value: "small", label: "Small" },
      { value: "large", label: "Large" },
    ],
  },
  {
    key: "close",
    label: "Close in",
    options: [
      { value: "fade", label: "Fade" },
      { value: "keep", label: "Keep" },
    ],
  },
] as const;

const STORAGE_KEY = "hegemony-map-plates";

export function loadPlates(): Plates {
  if (typeof window === "undefined") return PLATE_DEFAULTS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      unknown
    >;
    // Only the choices the menu still offers; anything else falls back to the default.
    const plates = { ...PLATE_DEFAULTS };
    for (const choice of PLATE_CHOICES) {
      const value = saved[choice.key];
      if (choice.options.some((o) => o.value === value))
        Object.assign(plates, { [choice.key]: value });
    }
    return plates;
  } catch {
    return PLATE_DEFAULTS;
  }
}

export function savePlates(plates: Plates): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plates));
  } catch {
    // Storage unavailable (private mode etc.): the choice holds until the page reloads.
  }
}
