import { useState } from "react";
import type { DrawerId } from "./Drawer";
import type { PlaceSubject } from "./PlacePanel";

/** The open drawer and the pick it opened on; a drawer shows only while that pick holds. */
type DrawerState = { id: DrawerId; at: PlaceSubject } | null;

/** The sidebar's drawer state, held by the board so the seal and the outliner can open
 *  a drawer too. */
export function useLeftDrawer(subject: PlaceSubject, onPick: (subject: PlaceSubject) => void) {
  const [drawer, setDrawer] = useState<DrawerState>(null);
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
  };
}
export type LeftDrawer = ReturnType<typeof useLeftDrawer>;

/** Realm's three tabs are one drawer: its button closes whichever is open. */
const REALM: readonly DrawerId[] = ["overview", "cities", "people"];
const sameDrawer = (a: DrawerId, b: DrawerId) =>
  a === b || (REALM.includes(a) && REALM.includes(b));
/** A Realm tab is open (the seal is pressed). */
export const isRealmDrawer = (id: DrawerId | null) => id !== null && REALM.includes(id);
