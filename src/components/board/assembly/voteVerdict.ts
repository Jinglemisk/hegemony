/**
 * The dramatic read on a ballot — the headline the card counter used to occupy.
 *
 * It lives in its own module because it is a pure function of four numbers and
 * the scene is the only thing that draws it: a rule with five bands wants to be
 * asserted band by band, not driven through a browser five times.
 *
 * The zero branch is not a nicety. A ballot OPENS at 0–0 with votes pending, and
 * 0 === 0 fell into the tie test, so the scene's one dramatic line announced a
 * cliffhanger about a vote nobody had cast — every seed, every width, and on a
 * short ballot it was the only verdict the scene ever showed. A tie is only a tie
 * once someone has spoken; before that, the honest headline is that nobody has.
 */
export function verdict(yea: number, nay: number, pending: number, cast: number): string {
  if (cast === 0) {
    return "The floor is open";
  }
  if (pending === 0) {
    return yea > nay ? "It carries" : yea === nay ? "Tied — the law falls" : "It is voted down";
  }
  if (yea === nay) {
    return "On the knife's edge";
  }
  if (pending >= Math.abs(yea - nay)) {
    return "Still in the balance";
  }
  return yea > nay ? "It cannot be stopped" : "It cannot be saved";
}
