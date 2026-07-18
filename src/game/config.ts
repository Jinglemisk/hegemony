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
  // "shuffled" = seeded random layout (owner call 2026-07-18: the board should vary
  // each game — the oracle and landmarks land wherever the shuffle drops them);
  // "classic" = the authored fixed board. The UI overrides via ?board=, and
  // ?dev=preload always forces classic (its scripted opening is tied to fixed tiles).
  // NOTE: the shuffle is still UNCONSTRAINED — landmarks can cluster and seats can be
  // uneven; the constrained shuffle (landmarks non-adjacent, breadbasket off-rim, fair
  // seats) is the deferred proper version. Sims stay on classic for reproducible A/B.
  boardLayout: "shuffled" as BoardLayout,
  // Dev testing default: auto-play the opening (seed-driven legal placements) so a
  // reload lands straight in gameplay. ?setup=manual restores hand placement.
  autoOpeningForDev: true
};

/**
 * Ten premade seeds the dev auto-opening rotates through — each reload advances to
 * the next (tracked in localStorage), so repeated testing sees varied openings
 * without hand-placing towns. ?seed=N pins one instead.
 */
export const DEV_ROTATION_SEEDS = [11, 42, 77, 101, 137, 202, 314, 555, 777, 909];

export type OpeningSetupPlacement = {
  playerID: PlayerId;
  capital: {
    tileId: string;
    pops: Pops;
  };
  colony: {
    tileId: string;
    pops: Pops;
  };
};

/**
 * A legal scripted metropolis+founding-colony opening for the CLASSIC board (dev
 * preload + tests + sim "fixed" opening). Metropolis tiles are pairwise non-adjacent
 * (city rule); founding colonies sit on the coastal rim, so they are legal regardless
 * of distance (the founding voyage, roadmap-appendix Q12).
 */
export const TEST_OPENING_SETUP: OpeningSetupPlacement[] = [
  {
    playerID: "0",
    capital: { tileId: "-2,0", pops: { citizens: 1, freemen: 2, slaves: 1 } },
    colony: { tileId: "3,0", pops: { citizens: 0, freemen: 1, slaves: 1 } }
  },
  {
    playerID: "1",
    capital: { tileId: "0,-2", pops: { citizens: 1, freemen: 1, slaves: 2 } },
    colony: { tileId: "0,3", pops: { citizens: 0, freemen: 1, slaves: 1 } }
  },
  {
    playerID: "2",
    capital: { tileId: "2,0", pops: { citizens: 0, freemen: 2, slaves: 2 } },
    colony: { tileId: "-3,0", pops: { citizens: 1, freemen: 1, slaves: 0 } }
  },
  {
    playerID: "3",
    capital: { tileId: "0,2", pops: { citizens: 2, freemen: 1, slaves: 1 } },
    colony: { tileId: "0,-3", pops: { citizens: 0, freemen: 2, slaves: 0 } }
  }
];
