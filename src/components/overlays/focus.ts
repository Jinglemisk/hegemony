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

/**
 * Keeps Tab inside `surface` until the returned function is called: from its last
 * control Tab goes to its first, and Shift+Tab the other way; focus found outside it
 * comes back in. A surface with no control holds the focus itself.
 */
export function trapTab(surface: HTMLElement): () => void {
  const doc = surface.ownerDocument;
  const reachable = () =>
    [...surface.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.offsetParent !== null || element === surface,
    );
  const trap = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const items = reachable();
    const active = doc.activeElement;
    const inside = active instanceof Node && surface.contains(active);
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
  doc.addEventListener("keydown", trap, true);
  return () => doc.removeEventListener("keydown", trap, true);
}

/**
 * Makes everything in `.frame` but `keep` (and the path to it) inert, until the
 * returned function is called: a modal surface's table can't be reached by Tab, by a
 * screen reader or by the pointer.
 */
export function inertAround(keep: HTMLElement): () => void {
  const frame = keep.closest(".frame");
  const made: HTMLElement[] = [];
  for (let node: HTMLElement | null = keep; node && node !== frame; node = node.parentElement) {
    for (const sibling of node.parentElement?.children ?? []) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
      sibling.inert = true;
      made.push(sibling);
    }
  }
  return () => made.forEach((element) => (element.inert = false));
}
