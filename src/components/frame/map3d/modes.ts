import { PLAYER_IDS } from "../../../game/data";
import { happinessContributions } from "../../../game/happiness";
import type { HappinessContribution } from "../../../game/happiness";
import { unrestStatus } from "../../../game/unrest";
import type { UnrestOutcome, UnrestTier } from "../../../game/unrest";
import { victoryThreats } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { publicCensus } from "../../../ui/frameSelectors";
import type { Census } from "../../../ui/frameSelectors";

/**
 * The living map's five modes, after the prototype. Each is a view of the same board:
 * what fades in and out (`bandAlphas`), how the tiles are washed, which labels show
 * and what the map key says. Keys 1 to 5 pick them, in this order. The mode is the
 * shell's view state; nothing here touches the game.
 *
 * Nothing here imports three.js: the shell reads it too, for the key and the keys.
 */

export type MapMode = "terrain" | "political" | "economy" | "unrest" | "trade";

/** Each mode: its name, its icon, and what it shows, said. */
export const MAP_MODES: readonly { id: MapMode; label: string; icon: string; note: string }[] = [
  {
    id: "terrain",
    label: "Terrain",
    icon: "terrain/plains",
    note: "The whole board. Far out, owners' colours and each tile's slots; in the middle, names, slots and yield chips; close in, buildings, fields, trees, rocks and pops.",
  },
  {
    id: "political",
    label: "Political",
    icon: "settlements/city",
    note: "Each tile in its owner's colour, and the realms' names.",
  },
  {
    id: "economy",
    label: "Economy",
    icon: "market/income",
    note: "What every settlement makes and eats a turn, its slots and its buildings; the land dimmed.",
  },
  {
    id: "unrest",
    label: "Unrest",
    icon: "unrest/riot",
    note: "Each realm's happiness, its tier at the riot and revolt lines, and its Unrest tokens.",
  },
  {
    id: "trade",
    label: "Trade",
    icon: "market/handshake",
    note: "Ports, claimed and open goods, ship routes and pops on the move.",
  },
];

/** A realm as the modes show it: every number an engine selector's. */
export type MapRealm = {
  owner: PlayerId;
  /** Its pops (those on the move counted), cities and colonies. */
  census: Census;
  /** The tiles it stands on: one settlement on each. */
  tiles: number;
  /** The level the riot and revolt lines test, its terms, and its tier. */
  happiness: number;
  terms: HappinessContribution[];
  tier: UnrestTier;
  tokens: number;
  /** What ending its turn at this level sets off: torches and smoke over its cities. */
  riot: Exclude<UnrestOutcome["tier"], "none"> | null;
  /** The titles it holds when they win at its next turn (the laurel), else 0. */
  titles: number;
};

export function mapRealms(G: HegemonyState): MapRealm[] {
  const threats = victoryThreats(G);
  return PLAYER_IDS.map((owner) => {
    const status = unrestStatus(G, owner);
    return {
      owner,
      census: publicCensus(G, owner),
      tiles: G.players[owner].settlements.length,
      happiness: status.happiness,
      terms: happinessContributions(G, owner),
      tier: status.tier,
      tokens: status.outcome.tokens,
      riot: status.outcome.tier === "none" ? null : status.outcome.tier,
      titles: threats.find((threat) => threat.seat === owner)?.titles.length ?? 0,
    };
  });
}
