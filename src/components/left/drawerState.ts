import { useState } from "react";
import type { DrawerId } from "./Drawer";
import type { PlacePop, PlaceSubject } from "./PlacePanel";

/** The open drawer and the pick it opened on; a drawer shows only while that pick holds. */
type DrawerState = { id: DrawerId; at: PlaceSubject } | null;
/** What opens beside the place panel, and the pick it opened on. */
type PopState = { kind: PlacePop; at: PlaceSubject } | null;

/** The left window's state, held by the board so the seal, the outliner and the map can
 *  open a drawer or a place's pop too. Every part holds to the pick it opened on, so a
 *  fresh pick (the sea, another place, another seat taking the screen) closes it. */
export function useLeftDrawer(subject: PlaceSubject, onPick: (subject: PlaceSubject) => void) {
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [pop, setPop] = useState<PopState>(null);
  const open = drawer?.at === subject ? drawer.id : null;
  const show = (id: DrawerId | null) => {
    if (id === null) return setDrawer(null);
    // The sea, picked afresh: the place panel closes and the drawer holds to it.
    const sea: PlaceSubject = subject.kind === "realm" ? subject : { kind: "realm" };
    if (sea !== subject) onPick(sea);
    setDrawer({ id, at: sea });
  };
  return {
    open,
    show,
    /** A sidebar button: opens its drawer, or closes it when it is the one open. */
    toggle: (id: DrawerId) => show(open !== null && sameDrawer(open, id) ? null : id),
    /** Another tab of the open drawer. */
    tab: (id: DrawerId) => setDrawer({ id, at: subject }),
    /** What is open beside the place panel. */
    pop: pop?.at === subject ? pop.kind : null,
    setPop: (kind: PlacePop | null) => setPop(kind ? { kind, at: subject } : null),
    /** Pick a place with something already open beside it (a site picked to found on). */
    pickWith: (next: PlaceSubject, kind: PlacePop) => {
      setPop({ kind, at: next });
      onPick(next);
    },
  };
}
export type LeftDrawer = ReturnType<typeof useLeftDrawer>;

/** Realm's three tabs are one drawer: its button closes whichever is open. */
const REALM: readonly DrawerId[] = ["overview", "cities", "people"];
const sameDrawer = (a: DrawerId, b: DrawerId) =>
  a === b || (REALM.includes(a) && REALM.includes(b));
/** A Realm tab is open (the seal is pressed). */
export const isRealmDrawer = (id: DrawerId | null) => id !== null && REALM.includes(id);
