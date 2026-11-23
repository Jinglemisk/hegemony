/**
 * The outliner's view settings: which sections show, which are folded, how your places
 * sort, and whether the whole column is tucked into its tab. A player's display choice,
 * kept in the browser like the map's plates.
 */
export type OutlinerSection = "settle" | "trade" | "assembly" | "rivals";
export type OutlinerSort = "needs" | "people" | "az";

export type OutlinerSettings = {
  show: Record<OutlinerSection, boolean>;
  shut: Record<OutlinerSection, boolean>;
  sort: OutlinerSort;
  tucked: boolean;
};

const DEFAULTS: OutlinerSettings = {
  show: { settle: true, trade: true, assembly: true, rivals: false },
  shut: { settle: false, trade: false, assembly: false, rivals: false },
  sort: "needs",
  tucked: false,
};

const STORAGE_KEY = "hegemony-outliner";
const SORTS: readonly OutlinerSort[] = ["needs", "people", "az"];

const flags = (saved: unknown, fallback: Record<OutlinerSection, boolean>) => {
  const out = { ...fallback };
  if (saved && typeof saved === "object")
    for (const key of Object.keys(out) as OutlinerSection[]) {
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value === "boolean") out[key] = value;
    }
  return out;
};

export function loadOutliner(): OutlinerSettings {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      unknown
    >;
    return {
      show: flags(saved.show, DEFAULTS.show),
      shut: flags(saved.shut, DEFAULTS.shut),
      sort: SORTS.includes(saved.sort as OutlinerSort) ? (saved.sort as OutlinerSort) : "needs",
      tucked: saved.tucked === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveOutliner(settings: OutlinerSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // A browser that keeps nothing still plays; the choice lasts the session.
  }
}
