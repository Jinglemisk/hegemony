import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveLaw } from "../../../game/assembly";

/**
 * The one piece of state the repeal ceremony needs: a law the engine has already
 * dropped, held long enough for the stone to crack and fall.
 *
 * This is why ASM-11 was deferred twice. An exit animation cannot be written in
 * CSS alone, because the element it would animate is gone from the tree the
 * instant `G.activeLaws` loses its entry — the standing column simply renders one
 * slab fewer and the stele blinks out. Something has to keep rendering a law the
 * engine no longer has.
 *
 * **The engine stays the authority.** This hook owns no laws. It reads
 * `G.activeLaws`, notices what left it between two engine states, and holds a
 * *copy* of the departed entry in a queue until the ceremony that draws it says
 * it is finished. Nothing here can put a law back, keep one alive, or disagree
 * with the board about what stands: the column's heading, its empty-slab count
 * and every rule the game consults all still read `G.activeLaws` directly and are
 * already correct on the frame the law leaves. What is retained is a picture,
 * for as long as the picture is being drawn.
 *
 * **Why a queue and not a "falling" flag on the column's list.** A repeal is
 * enacted during the ballot, and the standing column is not on screen during the
 * ballot — it stands beside the card through proposal, disappears for the vote,
 * and comes back on the closing floor where the sitting's news is read. So the
 * departure is detected while nothing is drawing it. A time-boxed "falling" flag
 * started at detection would expire, unwatched, in a phase with no column in it,
 * and the stele would still blink out when the column returned.
 *
 * A queue separates the two facts. Departure is recorded when the engine drops
 * the law and is held *indefinitely*; the ceremony's clock starts when a slab for
 * it actually mounts, and {@link DepartedLaws.release} is what empties the queue.
 * The hook therefore lives on the floor rather than on the column — one instance
 * spanning proposal, ballot and closing, so a law struck during the vote is still
 * standing when the record comes back, and then falls.
 *
 * Under `prefers-reduced-motion` nothing is ever queued: the law leaves on the
 * frame the engine drops it, which is the end state the ceremony was going to
 * reach anyway. The codebase's rule is that stillness skips the transit, never
 * the destination.
 *
 * Monuments are not diffed. `G.tallyMonuments` is append-only by rule — a
 * resolved Directive is permanent and has no repeal — so there is no departure to
 * catch. The falling treatment still carries `.lawslabMonument` correctly if one
 * ever does leave; nothing here would feed it.
 */
export interface DepartedLaws {
  /** Laws the engine has dropped that no slab has finished burying yet. */
  departing: readonly DepartingLaw[];
  /** Called by the falling slab when its ceremony is over. */
  release: (key: number) => void;
}

export interface DepartingLaw {
  law: ActiveLaw;
  /** Identity for the ceremony, not for the law: a card can be re-enacted and
   *  struck again in a later sitting, and the second fall is not the first. */
  key: number;
}

export function useDepartedLaws(activeLaws: readonly ActiveLaw[]): DepartedLaws {
  const [departing, setDeparting] = useState<readonly DepartingLaw[]>([]);
  // Seeded with the first list we see, so a fresh mount never reads the laws it
  // was born with as five simultaneous repeals.
  const standingBefore = useRef(activeLaws);
  const nextKey = useRef(0);

  useEffect(() => {
    const before = standingBefore.current;
    standingBefore.current = activeLaws;

    if (before === activeLaws) {
      return;
    }

    const standing = new Set(activeLaws.map((law) => law.cardId));
    const gone = prefersReducedMotion() ? [] : before.filter((law) => !standing.has(law.cardId));
    // The keys are minted HERE and not inside the updater below: React may run an
    // updater more than once for one dispatch, and a key that changed on the
    // re-run would remount the slab and restart the fall from the top.
    const entries = gone.map((law) => ({ law, key: nextKey.current++ }));

    setDeparting((current) => {
      // A card the engine has planted again is standing, not falling. It cannot
      // happen inside one sitting — a repealed card goes to its discard pile —
      // but a queue that could contradict the board is the exact failure this
      // hook exists to avoid.
      const held = current.filter((entry) => !standing.has(entry.law.cardId));

      if (entries.length === 0) {
        return held.length === current.length ? current : held;
      }

      return [...held, ...entries];
    });
  }, [activeLaws]);

  // Stable, because it is a falling slab's effect dependency: a `release` that
  // changed identity every render would restart the ceremony's clock every render
  // and the stone would never finish falling.
  const release = useCallback(
    (key: number) =>
      setDeparting((current) => {
        const kept = current.filter((entry) => entry.key !== key);
        return kept.length === current.length ? current : kept;
      }),
    [],
  );

  return { departing, release };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
