import type { PlayerId, Pops } from "./types";

export const GAME_CONFIG = {
  // Flip to false to start from the normal empty setup flow.
  preloadOpeningSetupForTesting: true
};

export type OpeningSetupPlacement = {
  playerID: PlayerId;
  city: {
    tileId: string;
    pops: Pops;
  };
  colony: {
    tileId: string;
    pops: Pops;
  };
};

export const TEST_OPENING_SETUP: OpeningSetupPlacement[] = [
  {
    playerID: "0",
    city: {
      tileId: "-3,2",
      pops: { citizens: 1, freemen: 1, slaves: 1 }
    },
    colony: {
      tileId: "-2,1",
      pops: { citizens: 0, freemen: 0, slaves: 1 }
    }
  },
  {
    playerID: "1",
    city: {
      tileId: "-1,-2",
      pops: { citizens: 1, freemen: 2, slaves: 0 }
    },
    colony: {
      tileId: "0,-2",
      pops: { citizens: 0, freemen: 1, slaves: 0 }
    }
  },
  {
    playerID: "2",
    city: {
      tileId: "1,2",
      pops: { citizens: 0, freemen: 1, slaves: 2 }
    },
    colony: {
      tileId: "0,2",
      pops: { citizens: 0, freemen: 0, slaves: 1 }
    }
  },
  {
    playerID: "3",
    city: {
      tileId: "3,-1",
      pops: { citizens: 2, freemen: 0, slaves: 1 }
    },
    colony: {
      tileId: "2,-1",
      pops: { citizens: 1, freemen: 0, slaves: 0 }
    }
  }
];
