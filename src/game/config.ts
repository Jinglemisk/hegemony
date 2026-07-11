import type { GameModeId } from "./ruleset";
import type { BoardLayout, PlayerId, Pops } from "./types";

export const GAME_CONFIG = {
  // Dev convenience only: replay the scripted opening below instead of the normal
  // setup flow. OFF for real games (roadmap-appendix D5); the UI re-enables it via
  // the ?dev=preload URL param.
  preloadOpeningSetupForTesting: false,
  // Which game mode a new game starts in (see GAME_MODES). The seam a future mode
  // picker plugs into; the scripted preload only fits the two-city "standard".
  mode: "standard" as GameModeId,
  // "classic" = the authored fixed board; "shuffled" = seeded random layout
  // (roadmap-appendix D3e). The UI overrides via the ?board= URL param.
  boardLayout: "classic" as BoardLayout
};

export type OpeningSetupPlacement = {
  playerID: PlayerId;
  capital: {
    tileId: string;
    pops: Pops;
  };
  secondCity: {
    tileId: string;
    pops: Pops;
  };
};

/**
 * A legal scripted two-city opening for the CLASSIC board (dev preload + tests + sim
 * "fixed" opening). All eight tiles are pairwise non-adjacent, so every placement
 * passes the city-adjacency rule regardless of snake order.
 */
export const TEST_OPENING_SETUP: OpeningSetupPlacement[] = [
  {
    playerID: "0",
    capital: { tileId: "-3,2", pops: { citizens: 1, freemen: 1, slaves: 1 } },
    secondCity: { tileId: "-1,3", pops: { citizens: 0, freemen: 1, slaves: 2 } }
  },
  {
    playerID: "1",
    capital: { tileId: "-1,-2", pops: { citizens: 1, freemen: 2, slaves: 0 } },
    secondCity: { tileId: "-3,0", pops: { citizens: 0, freemen: 2, slaves: 1 } }
  },
  {
    playerID: "2",
    capital: { tileId: "1,2", pops: { citizens: 0, freemen: 1, slaves: 2 } },
    secondCity: { tileId: "0,0", pops: { citizens: 1, freemen: 1, slaves: 1 } }
  },
  {
    playerID: "3",
    capital: { tileId: "3,-1", pops: { citizens: 2, freemen: 0, slaves: 1 } },
    secondCity: { tileId: "1,-3", pops: { citizens: 1, freemen: 1, slaves: 1 } }
  }
];
