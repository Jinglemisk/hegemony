import { PLAYER_IDS } from "../../../game/data";
import { tradeLean } from "../../../game/trade";
import type { LeanSide } from "../../../game/trade";
import { unrestOutcome } from "../../../game/unrest";
import type { UnrestOutcome } from "../../../game/unrest";
import { victoryThreats } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { publicCensus } from "../../../ui/frameSelectors";
import type { Census } from "../../../ui/frameSelectors";

/**
 * The living map's four modes, after the prototype (the owner folded Unrest into
 * Political on 2026-10-26). Each is a light filter over the same 3D board: what fades
 * in and out (`bandAlphas`), how the tiles are tinted and which labels show. Keys 1 to
 * 4 pick them, in this order. The mode is the shell's view state; nothing here touches
 * the game.
 *
 * Nothing here imports three.js: the shell reads it too, for the dock's buttons and the keys.
 */

export type MapMode = "terrain" | "political" | "economy" | "trade";

/** Each mode: its name, its icon, and what it shows, said. */
export const MAP_MODES: readonly { id: MapMode; label: string; icon: string; note: string }[] = [
  {
    id: "terrain",
    label: "Terrain",
    icon: "terrain/plains",
    note: "The whole board. Each tile's slots and resource with its owner's icon, and the capitals' names; close in, every settlement's name, its buildings, fields, trees, rocks and pops.",
  },
  {
    id: "political",
    label: "Political",
    icon: "settlements/city",
    note: "Each owned tile and its town tinted in its owner's colour, the realms' borders, and each realm's name and Unrest tokens under its capital.",
  },
  {
    id: "economy",
    label: "Economy",
    icon: "market/income",
    note: "Under each tile, what its worked slots make and how many slots are free; close in, what each settlement makes and eats a turn, and its buildings; the land's trees, rocks and fields faded.",
  },
  {
    id: "trade",
    label: "Trade",
    icon: "market/handshake",
    note: "Each luxury good's name and holder, each Port's good, ship routes and pops on the move, and under each capital what its realm has to export and needs to import.",
  },
];

/** A realm as the modes show it: every number an engine selector's. */
export type MapRealm = {
  owner: PlayerId;
  /** Its first settlement's tile (its capital's), where its name and trade hint hang. */
  home: string | null;
  /** Its pops (those on the move counted), cities and colonies. */
  census: Census;
  /** The tiles it stands on: one settlement on each. */
  tiles: number;
  /** The level the riot and revolt lines test, and its Unrest tokens. */
  happiness: number;
  tokens: number;
  /** What ending its turn at this level sets off: torches and smoke over its cities. */
  riot: Exclude<UnrestOutcome["tier"], "none"> | null;
  /** The titles it holds when they win at its next turn (the laurel), else 0. */
  titles: number;
  /** Trade's hint by its capital: what it makes most beyond its needs, and what it lacks. */
  lean: { exports: LeanSide | null; imports: LeanSide | null };
};

export function mapRealms(G: HegemonyState): MapRealm[] {
  const threats = victoryThreats(G);
  return PLAYER_IDS.map((owner) => {
    const outcome = unrestOutcome(G, owner);
    return {
      owner,
      home: G.players[owner].settlements[0] ?? null,
      census: publicCensus(G, owner),
      tiles: G.players[owner].settlements.length,
      happiness: outcome.level,
      tokens: outcome.tokens,
      riot: outcome.tier === "none" ? null : outcome.tier,
      titles: threats.find((threat) => threat.seat === owner)?.titles.length ?? 0,
      lean: tradeLean(G, owner),
    };
  });
}
