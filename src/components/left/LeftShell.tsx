import { useEffect, useEffectEvent, useState } from "react";
import type { BuildingId, PlayerId, Resources } from "../../game/types";
import { isTyping } from "../../ui/keys";
import { Drawer, type DrawerId } from "./Drawer";
import { PlacePanel, type PlacePop, type PlaceSubject } from "./PlacePanel";
import { Sidebar } from "./Sidebar";

/** What the left window asks the board to do: the commands it cannot send itself. */
export type LeftActions = {
  /** Found a colony on a tile: arms the map's Found flow on it (its source and pop). */
  onFound: (tileId: string) => void;
  /** Move a pop out of a settlement: arms the map for its destination. */
  onMoveOut: (tileId: string) => void;
  /** Raise a building, its Port's good named where there is a choice. */
  onBuild: (tileId: string, buildingId: BuildingId, claimVertexId?: string) => void;
  onOpenHand: () => void;
  /** Buy a development card; the board shows what it drew. */
  onBuyCard: () => void;
  /** Open the offer composer, a partner already chosen or the whole table. */
  onCompose: (partner: PlayerId | null, anchor: DOMRect) => void;
  /** The full Idea purchase, for an Idea that also asks for a settler. */
  onIdeasModal: () => void;
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
  income,
  mapArmed,
  placeable,
  actions,
}: {
  /** The board's pick: the sea, a tile or a mooring. */
  subject: PlaceSubject;
  /** Set the board's pick (and its lit tile). */
  onPick: (subject: PlaceSubject) => void;
  /** The viewer's projected net income per turn. */
  income: Resources;
  /** A map mode is armed: Escape is the map's. */
  mapArmed: boolean;
  /** The place panel may open (not while the starting places are set). */
  placeable: boolean;
  actions: LeftActions;
}) {
  // Each window remembers the pick it opened on, and shows only while that pick holds.
  const [drawer, setDrawer] = useState<{ id: DrawerId; at: PlaceSubject } | null>(null);
  const [back, setBack] = useState<{ to: DrawerId; at: PlaceSubject } | null>(null);
  const [pop, setPop] = useState<{ kind: PlacePop; at: PlaceSubject } | null>(null);

  const openDrawer = drawer?.at === subject ? drawer.id : null;
  const placeOpen = placeable && subject.kind !== "realm";
  const backTo = back?.at === subject ? back.to : null;
  const openPop = pop?.at === subject ? pop.kind : null;

  const showDrawer = (id: DrawerId | null) => {
    if (id === null) return setDrawer(null);
    // The sea, picked afresh: the place panel closes and the drawer holds to it.
    const sea: PlaceSubject = subject.kind === "realm" ? subject : { kind: "realm" };
    if (sea !== subject) onPick(sea);
    setDrawer({ id, at: sea });
  };
  const pickFrom = (from: DrawerId) => (next: PlaceSubject) => {
    setBack({ to: from, at: next });
    onPick(next);
  };
  const closePlace = () => onPick({ kind: "realm" });

  // Escape closes the top-most thing on the left: a popover, the drawer, the place.
  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || isTyping(event.target) || mapArmed) return;
    if (document.querySelector('[aria-modal="true"]')) return;
    if (openPop) setPop(null);
    else if (openDrawer) setDrawer(null);
    else if (placeOpen) closePlace();
  });
  useEffect(() => {
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  return (
    <>
      <Sidebar
        open={openDrawer}
        onOpen={(id) => showDrawer(openDrawer !== null && sameDrawer(openDrawer, id) ? null : id)}
      />
      {openDrawer ? (
        <Drawer
          actions={actions}
          id={openDrawer}
          income={income}
          onClose={() => setDrawer(null)}
          onPick={pickFrom(openDrawer)}
          onTab={(id) => setDrawer({ id, at: subject })}
        />
      ) : null}
      {placeOpen ? (
        <PlacePanel
          actions={actions}
          back={backTo}
          onBack={() => (backTo ? showDrawer(backTo) : undefined)}
          onClose={closePlace}
          onPop={(kind) => setPop(kind ? { kind, at: subject } : null)}
          pop={openPop}
          subject={subject}
        />
      ) : null}
    </>
  );
}

/** Realm's three tabs are one drawer: its button closes whichever is open. */
const REALM: readonly DrawerId[] = ["overview", "cities", "people"];
const sameDrawer = (a: DrawerId, b: DrawerId) =>
  a === b || (REALM.includes(a) && REALM.includes(b));
