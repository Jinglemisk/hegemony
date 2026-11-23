import { useLayoutEffect, type RefObject } from "react";

/** Everything a player can reach with Tab. */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A surface that opens takes the focus, and gives it back when it closes. On mount
 * it remembers what had focus (the control that opened it) and moves focus to the
 * first match of the first of `first`'s selectors that matches inside it, else its
 * first control (`false` leaves the focus alone). On unmount it returns focus to that control, unless the player has
 * since put the focus somewhere else that still stands.
 *
 * Layout effects, so the hand-back lands before a surface mounted in the same
 * commit takes the focus (the confirm bar asked from a pop's option).
 */
export function useReturnFocus(
  ref: RefObject<HTMLElement | null>,
  first: string | readonly string[] | false = FOCUSABLE,
) {
  useLayoutEffect(() => {
    const root = ref.current;
    const opener = document.activeElement;
    if (root && first !== false && !root.contains(opener)) {
      for (const selector of [...(typeof first === "string" ? [first] : first), FOCUSABLE]) {
        const target = root.querySelector<HTMLElement>(selector);
        if (!target) continue;
        target.focus({ preventScroll: true });
        break;
      }
    }
    return () => {
      const now = document.activeElement;
      const elsewhere = now && now !== document.body && now.isConnected && !root?.contains(now);
      if (!elsewhere && opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
    // Once per opening: the surface's own content may change under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Traps in the order they were set: only the last one, the top-most surface, holds
 *  Tab (the confirm over the Assembly or the Ideas sheet; a dialog over the table).
 *  It matches the Escape order: whatever opened last over the others closes first. */
const traps: HTMLElement[] = [];
/** A popover portaled out of the surface that opened it, and the control it came from. */
const lent = new WeakMap<Element, HTMLElement>();

/**
 * A popover portaled into the overlay root from inside a trapped surface (the
 * Assembly's bribe): the surface's trap counts it as inside, by the control it came
 * from, until the returned function is called.
 */
export function lendFocus(popover: Element, from: HTMLElement): () => void {
  lent.set(popover, from);
  return () => lent.delete(popover);
}

/** The control a lent popover holding `node` came from, if any. */
function lender(node: Node): HTMLElement | null {
  for (let at: Node | null = node; at; at = at.parentNode) {
    const from = at instanceof Element ? lent.get(at) : undefined;
    if (from) return from;
  }
  return null;
}

/** Inside `surface`, or inside a popover it lent the focus to (and so on outward). */
function within(surface: HTMLElement, node: Node): boolean {
  for (let at: Node | null = node, hops = 0; at && hops < 8; hops++) {
    if (surface.contains(at)) return true;
    at = lender(at);
  }
  return false;
}

/**
 * Keeps Tab inside `surface` until the returned function is called: from its last
 * control Tab goes to its first, and Shift+Tab the other way; focus found outside it
 * comes back in. A surface with no control holds the focus itself. Only the top-most
 * trap acts, and a popover the surface opened counts as inside it: Tab moves through
 * the popover, and off its edge returns to the control that opened it (or, when that
 * control cannot take the focus, comes round to the popover's first control).
 */
export function trapTab(surface: HTMLElement): () => void {
  const doc = surface.ownerDocument;
  const reachable = (root: Element) =>
    [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null || element === surface,
    );
  const trap = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || traps[traps.length - 1] !== surface) return;
    const active = doc.activeElement;
    const inside = active instanceof Node && surface.contains(active);
    // In a popover the surface lent the focus to: its own controls, then back home.
    if (!inside && active instanceof Node && within(surface, active)) {
      const from = lender(active)!;
      const popover = [...reachable(doc.body)].filter((element) => lender(element) === from);
      const edge = event.shiftKey ? popover[0] : popover[popover.length - 1];
      if (popover.length === 0 || active === edge) {
        event.preventDefault();
        from.focus();
        // A lender that cannot hold the focus (a plain box): round the popover instead.
        if (doc.activeElement !== from)
          (event.shiftKey ? popover[popover.length - 1] : popover[0])?.focus();
      }
      return;
    }
    const items = reachable(surface);
    if (items.length === 0) {
      event.preventDefault();
      surface.focus();
      return;
    }
    const edge = event.shiftKey ? items[0] : items[items.length - 1];
    if (!inside || active === edge) {
      event.preventDefault();
      (event.shiftKey ? items[items.length - 1] : items[0])!.focus();
    }
  };
  traps.push(surface);
  doc.addEventListener("keydown", trap, true);
  return () => {
    traps.splice(traps.lastIndexOf(surface), 1);
    doc.removeEventListener("keydown", trap, true);
  };
}

/**
 * Makes everything in `.frame` but `keep` (and the path to it) inert, until the
 * returned function is called: a modal surface's table can't be reached by Tab, by a
 * screen reader or by the pointer. `spare` stays live (the overlay layer a dialog's
 * own tooltips and pickers open in).
 */
export function inertAround(keep: HTMLElement, spare: readonly Element[] = []): () => void {
  const frame = keep.closest(".frame");
  const made: HTMLElement[] = [];
  for (let node: HTMLElement | null = keep; node && node !== frame; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
      if (spare.includes(sibling)) continue;
      sibling.inert = true;
      made.push(sibling);
    }
  }
  return () => made.forEach((element) => (element.inert = false));
}

/**
 * Moves the focus to `target` once the surface that is closing or opening has redrawn:
 * for a hand-back whose target is not the opener `useReturnFocus` remembers (a drawer's
 * sidebar button, a place's Back, the row a place was picked from).
 */
export function focusSoon(target: () => HTMLElement | null) {
  window.setTimeout(() => target()?.focus({ preventScroll: true }), 0);
}
