import { useEffect, useRef, useState } from "react";

/**
 * The die, as an object on the table: a lacquer cube with ivory pips.
 *
 * It **flips through faces for 400ms and settles**, because a number that simply
 * appears is a number the engine told you, and a number that lands is a number
 * you rolled. The result is already decided — nothing here touches the outcome,
 * and the settle is unconditional even if the component unmounts mid-flip.
 *
 * `prefers-reduced-motion` settles instantly. Not a lesser version: for a player
 * who asked for stillness, the flip IS the harm.
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

export function LacquerDie({ value }: { value: number }) {
  const settled = Math.min(6, Math.max(1, Math.round(value)));
  const [shown, setShown] = useState(settled);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setShown(settled);
      return;
    }

    const flip = window.setInterval(() => {
      setShown(1 + Math.floor(Math.random() * 6));
    }, FLIP_INTERVAL_MS);
    const stop = window.setTimeout(() => {
      window.clearInterval(flip);
      setShown(settled);
    }, FLIP_MS);

    timers.current = [flip, stop];

    return () => {
      window.clearInterval(flip);
      window.clearTimeout(stop);
      // The face the table rolled, always — a die left mid-flip by an unmount
      // would be the one thing on screen the engine never said.
      setShown(settled);
    };
  }, [settled]);

  const lit = new Set(FACES[shown] ?? FACES[1]);

  return (
    <div className="lacquerDie" role="img" aria-label={`The die shows ${settled}`}>
      <div className="diePips" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <i className={lit.has(index) ? "pip" : "pip pipOff"} key={index} />
        ))}
      </div>
    </div>
  );
}
