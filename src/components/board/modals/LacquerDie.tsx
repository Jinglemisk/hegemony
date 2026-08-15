import { useEffect, useState } from "react";

/**
 * The die, as an object on the table: a lacquer cube with ivory pips.
 *
 * It **flips through faces for 400ms and settles**, because a number that simply
 * appears is a number the engine told you, and a number that lands is a number
 * you rolled. The result is already decided — nothing here touches the outcome,
 * and the settle is unconditional even if the component unmounts mid-flip.
 *
 * Two things have to be true for that to read as a roll rather than a glitch:
 *
 *  1. The first painted frame must NOT be the answer. It used to be — the state
 *     started on the settled face and the first interval tick was 70ms away, so
 *     the die showed its result, then scrambled, then showed it again. The
 *     opening face is drawn during the initial render for that reason.
 *  2. The cube has to MOVE. Faces changing in a cube that never budges is the
 *     one thing on the table that reads as a refresh. `.lacquerDie` carries the
 *     tumble in `ceremony.css`, keyed to `dieRolling` so the animation restarts
 *     with every roll rather than only on mount.
 *
 * `prefers-reduced-motion` settles instantly, and never paints a face the table
 * did not roll. Not a lesser version: for a player who asked for stillness, the
 * flip IS the harm.
 */

const FLIP_MS = 400;
const FLIP_INTERVAL_MS = 70;

/** Which of the nine cells a face lights, in the usual arrangement. */
const FACES: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const randomFace = () => 1 + Math.floor(Math.random() * 6);

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function LacquerDie({ value }: { value: number }) {
  const settled = Math.min(6, Math.max(1, Math.round(value)));
  // Lazy, so the opening face is chosen before the first paint — a die whose
  // very first frame is the answer has already given the game away.
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? settled : randomFace()));
  const [rolling, setRolling] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(settled);
      setRolling(false);
      return;
    }

    setRolling(true);
    const flip = window.setInterval(() => setShown(randomFace()), FLIP_INTERVAL_MS);
    const stop = window.setTimeout(() => {
      window.clearInterval(flip);
      setShown(settled);
      setRolling(false);
    }, FLIP_MS);

    return () => {
      window.clearInterval(flip);
      window.clearTimeout(stop);
      // The face the table rolled, always — a die left mid-flip by an unmount
      // would be the one thing on screen the engine never said.
      setShown(settled);
      setRolling(false);
    };
  }, [settled]);

  const lit = new Set(FACES[shown] ?? FACES[1]);

  return (
    <div
      className={rolling ? "lacquerDie dieRolling" : "lacquerDie"}
      role="img"
      // The accessible name is the RESULT from the first frame. A screen reader
      // must never be read a face that was only ever decoration.
      aria-label={`The die shows ${settled}`}
    >
      <div className="diePips" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <i className={lit.has(index) ? "pip" : "pip pipOff"} key={index} />
        ))}
      </div>
    </div>
  );
}
