import { PLAYER_IDS, PLAYER_NAMES } from "../game/data";
import type { PlayerId } from "../game/types";

/**
 * Who each seat is, visually. This is the frontend's business, which is why it
 * lives here and not beside the rules — `src/game/data.ts` used to carry a
 * `PLAYER_COLORS` map of Tailwind primaries (`#1e3a8a`, `#eab308`, `#7c3aed`,
 * `#c1121f`), four saturated web colours in a game otherwise painted entirely in
 * fired clay. They fought the palette everywhere they appeared.
 *
 * Two rules hold this together, and they are the reason four players stay legible
 * on a board of forty tiles:
 *
 * 1. **A glaze is identity and nothing else.** It never says good or bad — that
 *    is `--pos`/`--neg`, on text, next to a sign.
 * 2. **A glaze never travels alone.** Every owner mark carries the seat's Greek
 *    blazon letter and an ivory keyline, so the four are told apart by shape as
 *    well as hue and survive both a colour-blind player and the sea behind them.
 */
export type PlayerGlaze = {
  id: PlayerId;
  name: string;
  /** The glaze's own name — these are real ceramic colours, and the UI says them. */
  glaze: string;
  /** The fired colour. Mirrors --p1…--p4 in base.css; that table is the contract. */
  color: string;
  /** The seat's blazon: the Greek initial of the PLAYER's name, not the glaze's —
   *  two glazes start with kappa, and the blazon has to stay unique. */
  blazon: string;
};

export const PLAYER_GLAZES: Record<PlayerId, PlayerGlaze> = {
  "0": { id: "0", name: PLAYER_NAMES["0"], glaze: "Kyanos", color: "#2f5d9e", blazon: "Δ" },
  "1": { id: "1", name: PLAYER_NAMES["1"], glaze: "Melichron", color: "#dfa437", blazon: "Ν" },
  "2": { id: "2", name: PLAYER_NAMES["2"], glaze: "Porphyra", color: "#7c4d79", blazon: "Θ" },
  "3": { id: "3", name: PLAYER_NAMES["3"], glaze: "Kinnabari", color: "#a83226", blazon: "Κ" },
};

/** The fired colour for a seat. The one call site anything should use for a hex. */
export function glazeOf(playerId: PlayerId): string {
  return PLAYER_GLAZES[playerId].color;
}

export const PLAYER_GLAZE_LIST = PLAYER_IDS.map((id) => PLAYER_GLAZES[id]);
