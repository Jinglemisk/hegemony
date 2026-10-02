import type { Ruleset } from "./ruleset";
import type { GameDefinition } from "./definition";
import type {
  ActiveLaw,
  AssemblySession,
  LawCostedAction,
  PoliticianId,
  TallyMonument,
} from "./assembly/types";

export type PlayerId = "0" | "1" | "2" | "3";

/** `oracle` is a cosmetic hole in the map (Delphi): no resource, 0 slots, and it can
 *  never host a settlement, so it can never be a contiguity link — a permanent split
 *  that expansion must route around (Phase 2, terrain-economy.md). */
export type Terrain = "mountain" | "hill" | "forest" | "plains" | "oracle";

/** What a player stockpiles. Happiness is not here: it is a level read off the board
 *  each turn and never held (see game/happiness.ts). */
export type Resource = "wood" | "stone" | "gold" | "food" | "influence";

/** A resource or happiness: what a Law, a card or an icon can name. */
export type Stat = Resource | "happiness";

export type MaterialResource = Exclude<Resource, "influence">;

/** What the bank exchanges against gold (roadmap-appendix D6/Q14): the tile-yield
 *  materials. Gold is the unit of account and influence is civic: neither is traded. */
export type TradableMaterial = Exclude<MaterialResource, "gold">;

export type PopType = "citizens" | "freemen" | "slaves";

export type SettlementKind = "capital" | "city" | "colony";

export type Phase = "setupCapital" | "setupCity" | "setupColony" | "gameplay" | "gameOver";

/** How the terrain deck is laid onto the board: the fixed authored layout, or a seeded shuffle. */
export type BoardLayout = "classic" | "shuffled";

/** The scoreboard metrics victory cards race on (see game/victory.ts). `voice` is the
 *  count of standing Laws a player authored. */
export type VictoryMetric = "cities" | "pops" | "citizens" | "gold" | "happiness" | "voice";

/** Why the game ended: a player held enough victory cards or the year deck ran out. */
export type GameOverReason = "victoryRace" | "deckExhausted";

export type BuildingId = "marketplace" | "estate" | "forum" | "temple" | "granary" | "port";

/** The six coastal luxury goods (docs/plans/luxury-goods.md §6, Q32). */
export type LuxuryGoodId =
  "tyrian-dye" | "pearls" | "coral" | "glassware" | "incense" | "fine-linen";

export interface LuxuryGoodDefinition {
  id: LuxuryGoodId;
  name: string;
  /** One line of flavour for the Codex and the map marker's tooltip. */
  flavour: string;
}

/**
 * One luxury good standing on the board — a physical, unique object with at most
 * one owner, seated at a shared two-tile coastal vertex (Q31/Q45).
 *
 * Whether it is ACTIVE is never stored: activity is derived in one place
 * (`game/luxury.ts`) from ownership, the per-player active cap, and suppression,
 * so no state can say "active but suppressed" (Q48's denial seam, unused today).
 */
export interface LuxuryAsset {
  /** Stable match-local identity (`luxury-N`) — the handle trade and denial use. */
  id: string;
  goodId: LuxuryGoodId;
  /** The canonical shared vertex it sits at (game/mapTopology.ts). */
  vertexId: string;
  /** The two adjacent coastal tiles a Port can claim it from. */
  tileIds: [string, string];
  owner: PlayerId | null;
  /** The settlement whose Port first claimed it. Stays put when trade later moves
   *  `owner` — a tile id alone cannot name one settlement on a shared tile. */
  claimedAtSettlementId: string | null;
  /** Turns of denial remaining (future Directives mutate this; 0 = untouched). */
  suppressedTurns: number;
}

export type Resources = Record<Resource, number>;

export type Pops = Record<PopType, number>;
/** The pops Grow can add. Citizens come only by promotion. */
export type GrowablePop = Exclude<PopType, "citizens">;

export type EventTiming = "immediate" | "pendingChoice" | "turn";

export type EventScope = "activePlayer" | "allPlayers";

export type ActionCostDiscountTarget = "buildBuilding" | "foundColony" | "growPop";

export type EventEffect =
  | {
      type: "resourceDelta";
      scope: EventScope;
      resource: Resource;
      amount: number;
    }
  | {
      type: "happinessDelta";
      scope: EventScope;
      amount: number;
    }
  | {
      /** v1's timed unrest. Like every one-shot happiness effect it now places or
       *  clears one Unrest token when drawn; Step 7's deck replaces it. */
      type: "timedHappinessDelta";
      scope: EventScope;
      amountPerTurn: number;
      turns: number;
    }
  | {
      type: "addPops";
      pop: PopType;
      amount: number;
      target: "ownedSettlementWithCapacity";
    }
  | {
      type: "actionCostDiscount";
      action: ActionCostDiscountTarget;
      buildingId?: BuildingId;
      /** For `growPop` discounts: only grows of this pop type match (grow coupons). */
      pop?: PopType;
      resource: Resource;
      amount: number;
      duration: "turn";
      consume: "nextMatchingAction";
    }
  | {
      type: "resourceExchange";
      from: Resource;
      to: Resource;
      maxAmount: number;
      ratio: number;
    }
  | {
      type: "resourceDeltaPerPop";
      scope: EventScope;
      resource: Resource;
      pop: PopType;
      amountPerPop: number;
      minimum: number;
    }
  | {
      type: "choice";
      options: EventEffect[][];
    };

export interface EventCard {
  id: string;
  name: string;
  count: number;
  text: string;
  /**
   * The card's own voice — presentation only, never a rule.
   *
   * `text` is the mechanical sentence and stays the single source of what the
   * card DOES; this is the one or two lines that say what it feels like. No
   * reducer, query, cost, probability or simulation policy may read it, and a
   * card that has none simply omits it — the flavour slot is skipped, not
   * blanked. Authored in `data.ts`; see `PendingPlayerEventModal` for the slot.
   */
  flavor?: string;
  timing: EventTiming;
  effects: EventEffect[];
}

export type EventDeck = EventCard[];

/** The one term of income or happiness a year card zeroes for the whole table. */
export type YearTerm =
  | "plainsFood"
  | "forestWood"
  | "mountainStone"
  | "freemenGold"
  | "citizenInfluence"
  | "luxuryHappiness";

/** What a year card does: zero one term for the year, or move every realm's Unrest
 *  tokens once when it is revealed. */
export type YearCardEffect =
  { type: "zeroTerm"; term: YearTerm } | { type: "unrestTokens"; change: "placeOne" | "clearAll" };

/** A card of the year deck, the game's clock. One is revealed as each year opens and
 *  stands until the year turns. */
export interface YearCard {
  id: string;
  name: string;
  count: number;
  /** The rule sentence: what the card does this year. */
  text: string;
  /** Presentation only, as on an {@link EventCard}. */
  flavor?: string;
  effect: YearCardEffect;
}

export interface PendingPlayerEvent {
  card: EventCard;
  playerID: PlayerId;
}

export interface ActiveActionCostDiscount {
  id: string;
  sourceCardId: string;
  label: string;
  action: ActionCostDiscountTarget;
  buildingId?: BuildingId;
  pop?: PopType;
  resource: Resource;
  amount: number;
  consume: "nextMatchingAction";
}

/** What a tile's working slaves make. The tile prints no amount: a slave on an open
 *  slot makes 1 of it (v2 work slots). */
export interface TileResource {
  type: MaterialResource;
}

// ── Event tables (roadmap-appendix D9/D10 · docs/archive/plans/event-tables.md) ─────────────
//
// Dice-and-table as one reusable, data-driven component: a table is content data,
// `rollOnTable` (game/tables.ts) is the only engine seam, and every instance — riot,
// the expeditions — shares the same UI modal.

export type EventTableId = "riot" | "merchantConvoy" | "grandEmbassy" | "colonistsVoyage";

/** The closed effect vocabulary a table row may apply. Each effect with an impossible
 *  happy path carries its explicit fallback (no building → pops, no room → food). */
export type TableEffect =
  | { type: "losePops"; count: number }
  | { type: "loseResource"; resource: Resource; amount: number; popLossIfShort?: number }
  | { type: "destroyBuilding"; popLossFallback: number }
  | { type: "gainResource"; resource: Resource; amount: number }
  | { type: "gainPop"; pop: PopType; foodFallback: number }
  | { type: "none" };

export interface EventTableRow {
  /** The die face this row answers to (1–6; modified rolls clamp into this range). */
  roll: number;
  label: string;
  effects: TableEffect[];
}

export type RiotInsuranceId = "breadDole" | "concession" | "patronage";

/** A pre-roll insurance slot: pay the cost before the die, add +1 to the roll.
 *  The concession is special — its price is a forced demotion, not resources. */
export interface TableInsuranceOption {
  id: RiotInsuranceId;
  label: string;
  cost: Partial<Resources>;
  /** The concession: buying it demotes one pop (free — the mob forces it). */
  demotesPop?: boolean;
  modifier: number;
}

export interface EventTableDefinition {
  id: EventTableId;
  name: string;
  flavor: string;
  /** Die size — table data, defaulting to 6. Modified rolls clamp into 1..die. */
  die?: number;
  rows: EventTableRow[];
  insurance?: TableInsuranceOption[];
}

/** A riot waiting on the table: blocks the turn (income deferred, endTurn illegal)
 *  until the player rolls. Insurance is declared here, before the die. */
export interface PendingRiot {
  playerID: PlayerId;
  boughtInsurance: RiotInsuranceId[];
}

/** The last table roll, kept on state so the UI can show the outcome after the move
 *  resolves (moves are synchronous — the modal reads this, never re-rolls). */
export interface TableRollRecord {
  tableId: EventTableId;
  playerID: PlayerId;
  /** Natural d6. */
  roll: number;
  /** After insurance/tier modifiers, clamped to 1–6 — the row that landed. */
  modified: number;
  modifier: number;
  rowLabel: string;
  /** Human-readable lines for each applied effect. */
  outcomes: string[];
  year: number;
}

/** Per-material bank rates: `sell` materials buy 1 gold; 1 material costs `buy` gold.
 *  Derived once at game creation (roadmap-appendix Q14) and static all game. */
export type BankRates = Record<TradableMaterial, { sell: number; buy: number }>;

export interface Settlement {
  /** Stable match-local identity used by persistence and future ownership transfers. */
  id: string;
  /** Location is explicit because a tile may contain settlements owned by several seats. */
  tileId: string;
  owner: PlayerId;
  kind: SettlementKind;
  buildings: BuildingId[];
  pops: Pops;
}

/** A building either raises one class column's printed value in its settlement or
 *  states one flat fact. The Port's fact is its luxury claim, so it has no effect row. */
export type BuildingEffect =
  | {
      /** Every pop of `pop` here makes `amount` instead of 1. For slaves that is the
       *  working slaves, so it pays nothing on a hill. */
      type: "classOutput";
      pop: PopType;
      amount: number;
    }
  | {
      type: "income";
      resource: Resource;
      amount: number;
    }
  | {
      type: "happiness";
      amount: number;
    };

/** One of each per settlement. */
export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  cost: Partial<Resources>;
  effects: BuildingEffect[];
  /** A coastal colony may raise it. Every other building needs a city. */
  colony?: true;
  /** Needs a tile whose slaves make something, so it cannot stand on a hill. */
  needsYield?: true;
}

export interface HexTile {
  id: string;
  q: number;
  r: number;
  terrain: Terrain;
  /** One pool shared by buildings and working slaves (v2 work slots): each building
   *  takes a slot, each open slot holds one working slave. */
  slots: number;
  /** What a working slave makes here, or `null` on terrain where slaves make nothing
   *  (hills, oracle). */
  resource: TileResource | null;
  settlements: Settlement[];
}

export interface HegemonyBoard {
  tiles: HexTile[];
  /** The board's luxury goods — board-level, never duplicated into player buckets:
   *  a good is one physical object with at most one owner (luxury-goods.md §3.4). */
  luxuries: LuxuryAsset[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Resources;
  /** Derived location index for board traversal; persistent references use Settlement.id. */
  settlements: string[];
  /** Income collected this year. Cleared when the year turns, so it also says whose
   *  next income still falls under this year's card. */
  collectedThisTurn: boolean;
  grownSettlementsThisTurn: string[];
  actionCostDiscounts: ActiveActionCostDiscount[];
  /** Unrest tokens on this realm: the one part of happiness that is board state.
   *  Cards, Laws and Directives place them; a riot, a revolt or a kind card clears
   *  them. Each takes 1 from the level and none can be bought off. */
  unrestTokens: number;
  /** Running total of pops lost to riots and revolts — surfaced in the ledger. */
  popsLostToUnrest: number;
  /** Running total of revolts this realm has been through. */
  revolts: number;
  /** Running total of pops that left unfed at income. */
  popsLostToHunger: number;
  /** Running total of pops gained inorganically from event cards (the `addPops`
   *  effect) — the ledger's "Gained" stat, paired with deaths. */
  popsGainedFromEvents: number;
  /** Once-per-turn throttles: one civic-calm action, one ladder move, one venture,
   *  one paid pop move. Reset with the turn flags. */
  civicCalmUsedThisTurn: boolean;
  ladderUsedThisTurn: boolean;
  ventureUsedThisTurn: boolean;
  moveUsedThisTurn: boolean;
  /** Calm bought this year. It expires when the year turns and is never banked. */
  calmActive: boolean;
  /** Free-action coupons a standing Law grants once a year (Monumental Code, Land
   *  Rush) that this player has already spent. Cleared when the year turns. */
  lawFreeActionsUsedThisYear: LawCostedAction[];
  /** Turns of income Stratokles's General Strike has taken away. Decremented at the
   *  moment income would have been collected, so the strike costs exactly one turn. */
  incomeSuppressedTurns: number;
}

export interface PopulationTransfer {
  id: string;
  owner: PlayerId;
  fromSettlementId: string;
  toSettlementId: string;
  fromTileId: string;
  toTileId: string;
  pops: Pops;
}

export interface LogEntry {
  id: string;
  /** The year the line was written in. */
  year: number;
  message: string;
  /**
   * Which seat this line concerns.
   *
   * Deliberately "about", not "actor": the chronicle's filter asks *show me the
   * lines that matter to this player*, and half of those are things done TO them
   * — a directive landing, a mob taking a pop. A line's subject is the useful
   * answer; the deed's author is already named in the sentence.
   *
   * Before this field the frontend worked it out by checking whether the message
   * STARTED WITH a player's name — a heuristic that silently mis-filed every line
   * phrased the other way round, and that would have broken outright the first
   * time a seat was renamed. Optional so old saves still load; the frontend keeps
   * the prefix check as a fallback for entries that predate it.
   *
   * Nothing in the rules reads it.
   */
  about?: PlayerId;
}

export interface HegemonyState {
  /** Persisted compatibility contract. These values are immutable for the match. */
  engineVersion: string;
  stateSchemaVersion: number;
  commandSchemaVersion: number;
  /** Monotonic source for stable match-local entity identities. */
  nextEntityId: number;
  phase: Phase;
  currentPlayer: PlayerId;
  turn: number;
  /** The seed this game was created from — shown in the UI, embedded in bug reports. */
  seed: number;
  /** The player who opens the current year; the seat moves on one each year. */
  yearOpener: PlayerId;
  /** Set when the game ends — the victor of the race, or the exhaustion tally. */
  winner: PlayerId | null;
  gameOverReason: GameOverReason | null;
  /** How the board was generated, so the UI can say so. */
  boardLayout: BoardLayout;
  /** Tunable balance values for this game (difficulty / handicaps / modules). */
  ruleset: Ruleset;
  /** Frozen rules and content package selected when this match was created. */
  definition: GameDefinition;
  /** Stable identity duplicated at the state boundary for cheap mismatch checks. */
  definitionId: string;
  board: HegemonyBoard;
  players: Record<PlayerId, PlayerState>;
  transfers: PopulationTransfer[];
  /** The year deck, the game's clock: fourteen cards dealt once and never reshuffled.
   *  The order is hidden; an empty pile when the year turns ends the game. */
  yearDrawPile: YearCard[];
  yearDiscardPile: YearCard[];
  playerDrawPile: EventDeck;
  playerDiscardPile: EventDeck;
  /** This year's card, retained for the final tally. Null before gameplay starts. */
  activeYearCard: YearCard | null;
  lastPlayerEvent: EventCard | null;
  pendingPlayerEvent: PendingPlayerEvent | null;
  /** A riot blocking the current turn (income deferred until it resolves). */
  pendingRiot: PendingRiot | null;
  /** The most recent event-table roll, for the UI's outcome display. */
  lastTableRoll: TableRollRecord | null;
  /** This game's bank rates — derived from the board at creation, static after. */
  bank: BankRates;
  /** The year being played, from 1. A year is one turn for every seat. */
  year: number;
  /** Serialized mulberry32 PRNG state; advanced on each deck shuffle so draws are reproducible from the initial seed. */
  rng: number;
  log: LogEntry[];

  // ── The Assembly (Phase 3-B · docs/archive/plans/assembly-politicians.md) ────────────────
  //
  // Politician power, descriptive patrons and Voice are all board-derived.

  /** The Assembly in session. Non-null SUSPENDS the turn machine, so no click can
   *  open or dismiss it. */
  assembly: AssemblySession | null;
  /** Standing Laws — the stelae in the agora. Consulted by the income, cost, bank and
   *  happiness pipelines through `assembly/laws.ts`. */
  activeLaws: ActiveLaw[];
  /** Stratokles's permanent monuments: momentum, never rules. They take no Law-cap
   *  slot and can never be repealed, so his track only ever rises. */
  tallyMonuments: TallyMonument[];
  /** Each politician's undrawn cards and their discards, by card id. */
  politicianDecks: Record<PoliticianId, string[]>;
  politicianDiscards: Record<PoliticianId, string[]>;
  /** Monotonic enactment counter, so "the most recently enacted Law" is exact even
   *  when two pass in the same assembly. */
  lawOrder: number;
  /** Authored resolutions passed, Directives included. For telemetry and the
   *  Assembly's record; Voice reads the standing Laws instead. */
  assemblyPassedByPlayer: Record<PlayerId, number>;
  /** Rival targeted by a passed Isonomia; consumed when the next Assembly convenes. */
  pendingIsonomiaTarget: PlayerId | null;
  /** How many assemblies have convened — the panel's "Nth of the game" subtitle. */
  assembliesHeld: number;
}
