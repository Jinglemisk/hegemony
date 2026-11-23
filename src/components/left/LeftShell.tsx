import { useEffect, useEffectEvent, useState } from "react";
import type { NationalIdeaId } from "../../game/ideaTypes";
import type { BuildingId, PlayerId, Resources } from "../../game/types";
import { isTyping } from "../../ui/keys";
import { Drawer, type DrawerId } from "./Drawer";
import { isRealmDrawer, type LeftDrawer } from "./drawerState";
import { PlacePanel, type PlaceSubject } from "./PlacePanel";
import { Sidebar } from "./Sidebar";

/** What the left window asks the board to do: the commands it cannot send itself. */
export type LeftActions = {
  /** Found a colony: arms the map, lighting every legal site; a site picked opens its
   *  place panel with the Found pop beside it. */
  onFound: () => void;
  /** Move a pop out of a settlement: arms the map for its destination. */
  onMoveOut: (tileId: string) => void;
  /** Raise a building, its Port's good named where there is a choice. */
  onBuild: (tileId: string, buildingId: BuildingId, claimVertexId?: string) => void;
  onOpenHand: () => void;
  /** Buy a development card; the board shows what it drew. */
  onBuyCard: () => void;
  /** Open the offer composer, a partner already chosen or the whole table. */
  onCompose: (partner: PlayerId | null, anchor: DOMRect) => void;
  /** The full Idea purchase, for an Idea that also asks for a settler, that Idea chosen. */
  onIdeasModal: (idea: NationalIdeaId) => void;
};

/**
 * The left of the screen: the sidebar's column of drawers, one drawer at a time,
 * and the place panel. One left window at a time: opening a drawer closes the place
 * panel, picking a place closes the drawer, and a place picked from a drawer carries
 * a back button to it. A window is shown only while the board's pick is the one it
 * opened on, so a pick on the map or a click on the sea closes it without a word
 * from the board.
 */
export function LeftShell({
  subject,
  onPick,
  drawer,
  income,
  mapArmed,
  placeable,
  actions,
}: {
  /** The board's pick: the sea, a tile or a mooring. */
  subject: PlaceSubject;
  /** Set the board's pick (and its lit tile). */
  onPick: (subject: PlaceSubject) => void;
  /** The open drawer and place pop (see {@link useLeftDrawer}). */
  drawer: LeftDrawer;
  /** The viewer's projected net income per turn. */
  income: Resources;
  /** A map mode is armed: Escape is the map's. */
  mapArmed: boolean;
  /** The place panel may open (not while the starting places are set). */
  placeable: boolean;
  actions: LeftActions;
}) {
  // The drawer a place was picked from, and the row it was picked by, for Back.
  const [back, setBack] = useState<{ to: DrawerId; at: PlaceSubject; row: string | null } | null>(
    null,
  );
  // What had focus when the place opened (a map tile, an outliner row), for Close.
  const [opener, setOpener] = useState<{ at: PlaceSubject; element: Element | null } | null>(null);

  const openDrawer = drawer.open;
  const placeOpen = placeable && subject.kind !== "realm";
  const backTo = back?.at === subject ? back.to : null;
  const openPop = drawer.pop;

  // A place opening remembers what picked it, before anything inside takes focus.
  if (placeOpen && opener?.at !== subject) {
    setOpener({ at: subject, element: document.activeElement });
  }

  const pickFrom = (from: DrawerId) => (next: PlaceSubject) => {
    const row = rowKey(document.activeElement);
    setBack({ to: from, at: next, row });
    onPick(next);
    // The row goes with its drawer: a keyboard pick lands on the place's Back.
    if (row) returnFocus(() => document.querySelector<HTMLElement>(".pp .ch-back"));
  };
  const closeDrawer = () => {
    const id = openDrawer;
    drawer.show(null);
    if (id) returnFocus(sidebarButton(id));
  };
  const closePlace = () => {
    const from = back?.at === subject ? back.to : null;
    const element = opener?.at === subject ? opener.element : null;
    onPick({ kind: "realm" });
    // Back to what picked it; a drawer's row went with its drawer, so its button.
    returnFocus(() =>
      element instanceof HTMLElement && element.isConnected && element !== document.body
        ? element
        : from
          ? sidebarButton(from)()
          : null,
    );
  };
  const goBack = () => {
    if (!backTo) return;
    const row = back?.row ?? null;
    drawer.show(backTo);
    returnFocus(
      () =>
        (row ? document.querySelector<HTMLElement>(`.lw-drawer [data-row="${row}"]`) : null) ??
        document.querySelector<HTMLElement>(".lw-drawer .ch-close"),
    );
  };

  // Escape closes the top-most thing on the left: a popover, the drawer, the place.
  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || isTyping(event.target) || mapArmed) return;
    if (document.querySelector('[aria-modal="true"]')) return;
    if (openPop) drawer.setPop(null);
    else if (openDrawer) closeDrawer();
    else if (placeOpen) closePlace();
  });
  useEffect(() => {
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  return (
    <>
      <Sidebar open={openDrawer} onOpen={drawer.toggle} />
      {openDrawer ? (
        <Drawer
          actions={actions}
          id={openDrawer}
          income={income}
          onClose={closeDrawer}
          onPick={pickFrom(openDrawer)}
          onTab={drawer.tab}
        />
      ) : null}
      {placeOpen ? (
        <PlacePanel
          actions={actions}
          back={backTo}
          onBack={goBack}
          onClose={closePlace}
          onPop={drawer.setPop}
          pop={openPop}
          subject={subject}
        />
      ) : null}
    </>
  );
}

/** A drawer's sidebar button (a Realm tab's is the Realm button). */
const sidebarButton = (id: DrawerId) => () =>
  document.querySelector<HTMLElement>(
    `.lw-side-btn[data-drawer="${isRealmDrawer(id) ? "overview" : id}"]`,
  );

/** The drawer row or tile an element is, by its foot-line key. */
const rowKey = (element: Element | null) =>
  element instanceof HTMLElement ? (element.dataset.row ?? null) : null;

/** Focus goes back once the left window has redrawn. */
function returnFocus(target: () => HTMLElement | null) {
  window.setTimeout(() => target()?.focus(), 0);
}
