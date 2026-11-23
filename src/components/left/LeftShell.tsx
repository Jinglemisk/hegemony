import { useState } from "react";
import type { BuildingId, PlayerId, Resources } from "../../game/types";
import { ESCAPE, useEscapeLayer } from "../overlays/escapeStack";
import { Drawer, type DrawerId } from "./Drawer";
import type { LeftDrawer } from "./drawerState";
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
  drawer,
  income,
  placeable,
  actions,
}: {
  /** The board's pick: the sea, a tile or a mooring. */
  subject: PlaceSubject;
  /** Set the board's pick (and its lit tile). */
  onPick: (subject: PlaceSubject) => void;
  /** The open drawer (see {@link useLeftDrawer}). */
  drawer: LeftDrawer;
  /** The viewer's projected net income per turn. */
  income: Resources;
  /** The place panel may open (not while the starting places are set). */
  placeable: boolean;
  actions: LeftActions;
}) {
  const [back, setBack] = useState<{ to: DrawerId; at: PlaceSubject } | null>(null);
  const [pop, setPop] = useState<{ kind: PlacePop; at: PlaceSubject } | null>(null);

  const openDrawer = drawer.open;
  const placeOpen = placeable && subject.kind !== "realm";
  const backTo = back?.at === subject ? back.to : null;
  const openPop = pop?.at === subject ? pop.kind : null;

  const pickFrom = (from: DrawerId) => (next: PlaceSubject) => {
    setBack({ to: from, at: next });
    onPick(next);
  };
  const closePlace = () => onPick({ kind: "realm" });

  // Escape closes a pop first, then the drawer or the place (escapeStack: anything
  // open above them, a card or a menu window, closes before them).
  useEscapeLayer(ESCAPE.pop, () => setPop(null), Boolean(openPop) && placeOpen);
  useEscapeLayer(
    ESCAPE.left,
    () => (openDrawer ? drawer.show(null) : closePlace()),
    Boolean(openDrawer) || placeOpen,
  );

  return (
    <>
      <Sidebar open={openDrawer} onOpen={drawer.toggle} />
      {openDrawer ? (
        <Drawer
          actions={actions}
          id={openDrawer}
          income={income}
          onClose={() => drawer.show(null)}
          onPick={pickFrom(openDrawer)}
          onTab={drawer.tab}
        />
      ) : null}
      {placeOpen ? (
        <PlacePanel
          actions={actions}
          back={backTo}
          onBack={() => (backTo ? drawer.show(backTo) : undefined)}
          onClose={closePlace}
          onPop={(kind) => setPop(kind ? { kind, at: subject } : null)}
          pop={openPop}
          subject={subject}
        />
      ) : null}
    </>
  );
}
