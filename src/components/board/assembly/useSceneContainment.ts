import { useEffect, type RefObject } from "react";

/** Everything the browser will let a player reach with Tab. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The pickers and tooltips portal to <body> and run their own roving focus. A
 *  containment that yanked Tab back out of them would break the repeal picker and
 *  the Directive target menu, both of which are opened FROM the scene. */
const PORTALLED = ".sharedPopover, .sharedTooltip";

/** The dev TUNE dashboard is not part of the game and must stay reachable while
 *  the house sits — half the reason to open it is to retune a balance value the
 *  Assembly just made you doubt. */
const DEV_FURNITURE = ".tune-fab, .tune-panel";

/**
 * Focus containment for a full-viewport takeover.
 *
 * The Assembly covers everything for the mouse and, before this, nothing for the
 * keyboard: 77 of the app's 93 focusable elements sat outside the scene and came
 * FIRST in DOM order, so the scene's own controls began at tab stop 77. A player
 * tabbed through zoom buttons, map modes and seventy invisible hex tiles to reach
 * a house that was waiting on them, every covered control stayed operable, and
 * tabbing off the last verb walked straight back out into the hidden board.
 *
 * Three things fix that together, and none of them is sufficient alone:
 *
 * · focus MOVES IN on mount and is restored to the opener on unmount,
 * · Tab is trapped, so the covered controls are unreachable,
 * · everything outside the scene goes `inert`, so a screen reader's virtual
 *   cursor and a stray programmatic focus cannot reach it either.
 *
 * This is the same pattern `ModalShell` implements for dialogs. It is duplicated
 * rather than shared because the scene is not a modal *surface* — it has no
 * backdrop, no dismiss and no ceremony register — and because hoisting the shell's
 * effect into a hook touches every dialog in the app. If a third takeover ever
 * appears, that hoist is the right move.
 */
export function useSceneContainment(sceneRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const scene = active ? sceneRef.current : null;

    if (!scene) {
      return;
    }

    const document_ = scene.ownerDocument;
    const opener = document_.activeElement;

    // Everything that is not on the scene's own ancestor line, marked at mount.
    // Portals opened LATER are new children of <body> and are untouched, which is
    // exactly right: a picker the scene opens must stay live.
    const silenced: HTMLElement[] = [];

    for (let node = scene; node.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (
          sibling !== node &&
          sibling instanceof HTMLElement &&
          !sibling.inert &&
          !sibling.matches(DEV_FURNITURE)
        ) {
          sibling.inert = true;
          silenced.push(sibling);
        }
      }
    }

    // The scene itself, not its first control: a screen reader announces the whole
    // takeover on entry, and no verb arrives wearing a focus ring nobody asked for.
    scene.focus();

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      const active = document_.activeElement;

      if (active instanceof Element && active.closest(PORTALLED)) {
        return;
      }

      const items = [...scene.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      const inside = active instanceof Node && scene.contains(active);

      if (items.length === 0) {
        event.preventDefault();
        scene.focus();
        return;
      }

      const edge = event.shiftKey ? items[0] : items[items.length - 1];

      if (!inside || active === edge) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    document_.addEventListener("keydown", trap, true);

    return () => {
      document_.removeEventListener("keydown", trap, true);

      for (const element of silenced) {
        element.inert = false;
      }

      if (opener instanceof HTMLElement && document_.contains(opener)) {
        opener.focus();
      }
    };
  }, [sceneRef, active]);
}
