import { useEffect, useEffectEvent } from "react";

/**
 * The shell's one Escape route. Every surface that Escape closes registers a layer
 * with its rank; one press closes only the top-most open layer: the highest rank,
 * and among equals the one opened last. A dialog over the table (`ESCAPE.dialog`)
 * hides every layer opened before it, whatever its rank, so Escape never reaches
 * past it; a blocking dialog's layer does nothing. A field that wants the key first
 * (a search clearing its text) calls `preventDefault` in its own handler.
 */
export const ESCAPE = {
  /** The confirm bar. */
  confirm: 90,
  /** A dialog over the table (ModalShell): the composer's card picker, the hand, the
   *  Assembly. Layers opened before it wait under it; those opened over it close first. */
  dialog: 85,
  /** The pops: Grow, Build, Move, Found, and the map armed for them. */
  pop: 80,
  /** A card: the composer, a deal or offer, the happiness card, an alarm's card. */
  card: 70,
  /** The menu's card. */
  menu: 60,
  /** The Chronicle's log. */
  chronicle: 50,
  /** The top-most of the menu's windows. */
  window: 40,
  /** The drawer or the place panel. */
  left: 30,
  /** A folded Assembly sitting, returned by Escape. */
  sitting: 20,
} as const;

type Layer = { rank: number; order: number; close: () => void };

const layers = new Set<Layer>();
let opened = 0;

/** The layer one Escape closes: the top one opened after the last dialog, else that dialog. */
function topLayer(): Layer | null {
  let dialog: Layer | null = null;
  for (const layer of layers)
    if (layer.rank === ESCAPE.dialog && (!dialog || layer.order > dialog.order)) dialog = layer;
  let top: Layer | null = null;
  for (const layer of layers) {
    if (dialog && layer.order <= dialog.order) continue;
    if (!top || layer.rank > top.rank || (layer.rank === top.rank && layer.order > top.order))
      top = layer;
  }
  return top ?? dialog;
}

function onKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const top = topLayer();
  if (!top) return;
  event.preventDefault();
  top.close();
}

function add(layer: Layer) {
  if (layers.size === 0) window.addEventListener("keydown", onKey);
  layers.add(layer);
  return () => {
    layers.delete(layer);
    if (layers.size === 0) window.removeEventListener("keydown", onKey);
  };
}

/** Registers a layer Escape closes while `active`; `onEscape` runs when it is the top one. */
export function useEscapeLayer(rank: number, onEscape: () => void, active = true) {
  const close = useEffectEvent(onEscape);
  useEffect(() => {
    if (!active) return;
    return add({ rank, order: ++opened, close: () => close() });
  }, [rank, active]);
}
