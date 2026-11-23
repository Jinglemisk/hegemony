import { useCallback, useState } from "react";
import { ESCAPE, useEscapeLayer } from "../../overlays/escapeStack";

/**
 * The menu's windows: Codex, Costs and Plates, each a panel the player can move and
 * keep open beside the others. Several stand at once; the last one in `open` is on
 * top. Where each was left is kept in the browser.
 */
export type MenuWindow = "codex" | "costs" | "plates";

export const MENU_WINDOWS: readonly MenuWindow[] = ["codex", "costs", "plates"];

/** Each window's name, sub line, icon and fixed size in design px. */
export const WINDOW_FACE: Record<
  MenuWindow,
  { title: string; sub: string; icon: string; w: number; h: number }
> = {
  codex: {
    title: "Codex",
    sub: "The rules by chapter, with search",
    icon: "chrome/codex",
    w: 720,
    h: 556,
  },
  costs: {
    title: "Costs",
    sub: "Every price under today’s Laws",
    icon: "market/treasury",
    w: 640,
    h: 460,
  },
  plates: {
    title: "Plates",
    sub: "How tile badges look",
    icon: "settlements/slot",
    w: 360,
    h: 268,
  },
};

/** A window's top-left corner in design px, once the player has moved it. */
export type WindowSpot = { x: number; y: number };

const KEY = "hegemony.menuWindows";

function storedSpots(): Partial<Record<MenuWindow, WindowSpot>> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const spots: Partial<Record<MenuWindow, WindowSpot>> = {};
    for (const id of MENU_WINDOWS) {
      const spot = saved[id] as Partial<WindowSpot> | undefined;
      if (typeof spot?.x === "number" && typeof spot.y === "number")
        spots[id] = { x: spot.x, y: spot.y };
    }
    return spots;
  } catch {
    return {};
  }
}

export type MenuWindows = {
  /** Open windows, bottom to top. */
  open: readonly MenuWindow[];
  spots: Partial<Record<MenuWindow, WindowSpot>>;
  /** Each open window's step down the cascade, taken when it opened: the first free
   *  one, so the first window always opens at the top spot and none shares a step. */
  steps: Partial<Record<MenuWindow, number>>;
  /** Opens a window, or brings an open one to the top. */
  show: (id: MenuWindow) => void;
  close: (id: MenuWindow) => void;
  toggle: (id: MenuWindow) => void;
  move: (id: MenuWindow, spot: WindowSpot) => void;
};

/** The windows' view state: which are open, in what order, and where. */
export function useMenuWindows(): MenuWindows {
  const [open, setOpen] = useState<readonly MenuWindow[]>([]);
  const [spots, setSpots] = useState(storedSpots);

  const [steps, setSteps] = useState<Partial<Record<MenuWindow, number>>>({});
  // `steps` holds exactly the open windows: every path that opens or closes one
  // updates both.
  const show = useCallback((id: MenuWindow) => {
    setOpen((now) => [...now.filter((other) => other !== id), id]);
    setSteps((now) => (now[id] === undefined ? { ...now, [id]: firstFree(now) } : now));
  }, []);
  const close = useCallback((id: MenuWindow) => {
    setOpen((now) => now.filter((other) => other !== id));
    setSteps((now) => Object.fromEntries(Object.entries(now).filter(([other]) => other !== id)));
  }, []);
  const toggle = useCallback(
    (id: MenuWindow) => (open.includes(id) ? close(id) : show(id)),
    [open, close, show],
  );
  const move = useCallback((id: MenuWindow, spot: WindowSpot) => {
    setSpots((now) => {
      const next = { ...now, [id]: spot };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the window stays where it was put until the page reloads.
      }
      return next;
    });
  }, []);

  // Escape closes the top window when nothing above it is open (escapeStack).
  useEscapeLayer(ESCAPE.window, () => close(open[open.length - 1]!), open.length > 0);

  return { open, spots, steps, show, close, toggle, move };
}

/** The lowest cascade step no open window holds. */
function firstFree(steps: Partial<Record<MenuWindow, number>>): number {
  const taken = new Set(Object.values(steps));
  let step = 0;
  while (taken.has(step)) step += 1;
  return step;
}
