import { TEST_OPENING_SETUP } from "../config";
import { PLAYER_EVENT_CARDS, SEASONAL_EVENT_CARDS } from "../data";
import { placeCapital, placeColony } from "../actions";
import { clonePops } from "../core/pops";
import type { MoveResult } from "../core/results";
import { createInitialState } from "../state";
import { GAME_MODES, deriveRuleset, setupCapitalCount } from "../ruleset";
import type { GameModeId } from "../ruleset";
import { advanceSetupTurn, beginGameplayTurn } from "../turn";
import type {
  EventCard,
  HegemonyState,
  HexTile,
  PlayerId,
  Pops,
  Resources,
  Settlement,
  SettlementKind,
} from "../types";

/**
 * Test/sim state construction. One home for the helpers the suites used to
 * re-declare per file, plus a chainable builder for mid-game states so a test
 * (or a sim experiment) can start from "player 2 has three cities and -8
 * happiness" without replaying setup by hand.
 *
 * Builder pokes write state directly and skip legality on purpose — isolating
 * a rule under test is the point. Use the real mutators when the path to the
 * state IS what you're testing.
 */

/** The fixed seed the test suites share so deck draws stay reproducible. */
export const TEST_SEED = 0xc0ffee;

export function tile(G: HegemonyState, id: string): HexTile {
  const found = G.board.tiles.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no tile ${id}`);
  return found;
}

export function owned(G: HegemonyState, tileId: string, owner: PlayerId): Settlement {
  const settlement = tile(G, tileId).settlements.find((candidate) => candidate.owner === owner);
  if (!settlement) throw new Error(`no ${owner} settlement on ${tileId}`);
  return settlement;
}

/** A material-resource tile (wood/stone) so tile yield never collides with the
 *  gold/food/influence/happiness columns the pop formulas write to. */
export function materialTile(G: HegemonyState): HexTile {
  const found = G.board.tiles.find(
    (candidate) => candidate.resource.type === "wood" || candidate.resource.type === "stone",
  );
  if (!found) throw new Error("no material tile on the board");
  return found;
}

export type ScenarioOptions = {
  seed?: number;
  mode?: GameModeId;
  /** Ruleset overrides layered on the mode via {@link deriveRuleset}. */
  patch?: Parameters<typeof deriveRuleset>[1];
};

export function scenario(options: ScenarioOptions = {}): ScenarioBuilder {
  return new ScenarioBuilder(options);
}

export class ScenarioBuilder {
  private readonly G: HegemonyState;

  constructor({ seed = TEST_SEED, mode = "standard", patch }: ScenarioOptions) {
    const base = GAME_MODES[mode].ruleset;
    this.G = createInitialState(seed, patch ? deriveRuleset(base, patch) : base);
  }

  /**
   * Replay the scripted 4-player opening through the real mutators, landing in
   * gameplay with player 0's first turn already bootstrapped (upkeep + income +
   * event draw — so a pending event may be waiting). Stack any deck riggings
   * BEFORE calling this if they should influence that first draw.
   */
  opening(): this {
    const { G } = this;

    if (G.ruleset.setup.length !== 2) {
      throw new Error("The scripted opening only fits the capital+colony setup.");
    }

    for (const placement of TEST_OPENING_SETUP) {
      assertOk(placeCapital(G, placement.playerID, placement.city.tileId, placement.city.pops), placement.playerID, placement.city.tileId);
      advanceSetupTurn(G, setupCapitalCount(G.ruleset), "setupColony");
    }

    for (const placement of TEST_OPENING_SETUP) {
      assertOk(placeColony(G, placement.playerID, placement.colony.tileId, placement.colony.pops), placement.playerID, placement.colony.tileId);
      advanceSetupTurn(G, G.ruleset.setup.length, "gameplay");
    }

    beginGameplayTurn(G);
    return this;
  }

  withResources(playerID: PlayerId, resources: Partial<Resources> | "wealthy"): this {
    const target = this.G.players[playerID].resources;

    if (resources === "wealthy") {
      Object.assign(target, { wood: 200, stone: 200, gold: 200, food: 200, influence: 0, happiness: 0 });
    } else {
      Object.assign(target, resources);
    }

    return this;
  }

  withHappiness(playerID: PlayerId, happiness: number): this {
    this.G.players[playerID].resources.happiness = happiness;
    return this;
  }

  /** Drop a settlement straight onto the board — no placement legality, no cost. */
  withSettlement(playerID: PlayerId, tileId: string, kind: SettlementKind, pops: Pops): this {
    tile(this.G, tileId).settlements.push({
      owner: playerID,
      kind,
      buildings: [],
      pops: clonePops(pops),
    });
    this.G.players[playerID].settlements.push(tileId);
    return this;
  }

  setPops(playerID: PlayerId, tileId: string, pops: Pops): this {
    owned(this.G, tileId, playerID).pops = clonePops(pops);
    return this;
  }

  /** Rig the player deck: the named card becomes the next draw. */
  stackPlayerEvent(cardId: string): this {
    this.G.playerDrawPile.unshift(findCard(PLAYER_EVENT_CARDS, cardId));
    return this;
  }

  /**
   * Rig the seasonal deck. Note the seasonal draw prefers cards suited to the
   * current season — a stacked card only jumps the queue if it suits the season
   * (or carries no season tags).
   */
  stackSeasonalEvent(cardId: string): this {
    this.G.seasonalDrawPile.unshift(findCard(SEASONAL_EVENT_CARDS, cardId));
    return this;
  }

  /** Escape hatch for pokes the named steps don't cover. */
  mutate(fn: (G: HegemonyState) => void): this {
    fn(this.G);
    return this;
  }

  build(): HegemonyState {
    return this.G;
  }
}

function findCard(deck: EventCard[], cardId: string): EventCard {
  const card = deck.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`no event card ${cardId}`);
  return card;
}

function assertOk(result: MoveResult, playerID: PlayerId, tileId: string) {
  if (!result.ok) {
    throw new Error(`scenario opening: ${playerID} cannot place on ${tileId}`);
  }
}
