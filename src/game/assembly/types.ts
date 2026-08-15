import type {
  BuildingId,
  MaterialResource,
  PlayerId,
  PopType,
  Resource,
  TradableMaterial,
} from "../types";

/**
 * The Assembly & Politicians layer (Phase 3-B · docs/archive/plans/assembly-politicians.md).
 *
 * These are TYPE-ONLY imports from `../types`, so the cycle between the two modules
 * is erased at compile time and nothing circular exists at runtime. The shapes live
 * here rather than in `types.ts` because the whole subsystem — content, flow, the
 * standing-modifier layer — is cohesive enough to own its own directory.
 */

export type PoliticianId = "demosthenes" | "perdiccas" | "kleistophenes" | "stratokles";

/**
 * The Twilight-Imperium split (design §1.5). A **Law** is table-wide and stands until
 * repealed — the three regular politicians deal only in these. A **Directive** resolves
 * once and leaves a permanent tally monument; Stratokles deals only in these.
 *
 * Cards and politicians both spell the two literals inline rather than naming this
 * type, because both are discriminated unions and a discriminant has to be a
 * literal to narrow. The name survives as the place the distinction is written
 * down — every `kind: "law" | "directive"` in this file means exactly this.
 */
export type ResolutionKind = "law" | "directive";

/**
 * Which settlements a standing effect counts.
 *
 * `city` means every NON-COLONY holding — a capital is a city for a Law's purposes,
 * matching how `victoryMetricValue` already counts the "cities" metric. `all` counts
 * every settlement the player holds.
 */
export type SettlementScope = "all" | "city" | "colony";

/** The actions a Law may reprice. */
export type LawCostedAction =
  "foundColony" | "upgradeColonyToCity" | "buildBuilding" | "growPop" | "promotePop" | "demotePop";

/**
 * The closed vocabulary a standing Law is built from. Every entry is a patch over a
 * lever the engine already owns (`Ruleset.popIncome`, `actionCosts`, `growPopCosts`,
 * `ladder`, `economy.bank`, happiness), so a Law never needs bespoke engine code —
 * the standing-modifier layer in `laws.ts` reads these and the income / cost / bank
 * pipelines consult it.
 *
 * `step` on the scaled entries is the divisor: `amount` is paid once per `step`
 * whole units, so `step: 1` (the default) is the plain per-settlement / per-pop case
 * and `step: 3` is "+1 per 3 citizens".
 */
export type LawEffect =
  /** Income per settlement of a scope. `resource: "happiness"` expresses civic mood. */
  | {
      type: "settlementIncome";
      scope: SettlementScope;
      resource: Resource;
      amount: number;
      step?: number;
    }
  /** Income per pop of a type — the per-pop coefficient lever. */
  | { type: "popIncome"; pop: PopType; resource: Resource; amount: number; step?: number }
  /** Per-pop delta into the settlement TILE's own material — the slave-production lever.
   *  Dead on a yield-less tile (hill / oracle), exactly like the base coefficient. */
  | { type: "popPrimaryIncome"; pop: PopType; amount: number }
  /** A flat, player-wide income delta — the blunt lever. */
  | { type: "flatIncome"; resource: Resource; amount: number }
  /** Happiness that flips on a stockpile threshold (Cult of Demeter). */
  | {
      type: "thresholdHappiness";
      resource: Resource;
      threshold: number;
      atOrAbove: number;
      below: number;
    }
  /** Convert income surplus above a floor into another resource (Agrarian Tariff):
   *  every `per` units of `from` income beyond `above` pays `amount` of `to`. */
  | {
      type: "surplusConversion";
      from: Resource;
      above: number;
      per: number;
      to: Resource;
      amount: number;
    }
  /** Reprice an action. `scope` narrows grow-pop to cities or colonies, `pop` narrows a
   *  ladder move to one source pop, `buildingIds` narrows a build to named buildings. */
  | {
      type: "actionCostDelta";
      action: LawCostedAction;
      resource: Resource;
      amount: number;
      scope?: SettlementScope;
      pop?: PopType;
      buildingIds?: BuildingId[];
    }
  /** Scale an action's whole cost (Enfranchise the Colonies: ×0.5). Applied before deltas. */
  | { type: "actionCostMultiplier"; action: LawCostedAction; multiplier: number }
  /** Shift a material's bank rate by whole steps in the holder's favour. */
  | { type: "bankRateStep"; material: TradableMaterial; steps: number }
  /** The first matching action each YEAR is free of the named resources. */
  | { type: "yearlyFreeAction"; action: LawCostedAction; resources: MaterialResource[] }
  /** Riders that fire when a colony is founded (Frontier Spirit). */
  | { type: "onFoundColony"; grantPop?: PopType; happiness?: number };

/** Stratokles's one-time vocabulary. Every Directive is aimed at one rival chosen by
 * the author before the proposal is sealed; the target travels with the ballot item. */
export type DirectiveEffect =
  /** A flat delta on the chosen rival. */
  | { type: "resourceDelta"; resource: Resource; amount: number }
  /** The chosen rival loses a fraction of a stored resource, rounded down to a whole unit. */
  | { type: "resourceFraction"; resource: Resource; fraction: number }
  /** The chosen rival loses pops from their largest settlement. */
  | { type: "losePopFromLargest"; count: number }
  /** The chosen rival collects no income for this many upcoming turns. */
  | { type: "suppressIncome"; turns: number }
  /** Tear down the newest standing Law authored by the chosen rival. */
  | { type: "repealNewestTargetLaw" }
  /** At the next Assembly, the chosen rival has exactly one base vote. */
  | { type: "equalVotesNextAssembly" };

interface ResolutionCardBase {
  id: string;
  politician: PoliticianId;
  name: string;
  /** The player-facing effect line, trade-off included — printed on the card face. */
  text: string;
}

export interface LawCard extends ResolutionCardBase {
  kind: "law";
  /** The axis this Law trades on — its political framing, shown beneath the effect. */
  tradeOff: string;
  effects: LawEffect[];
}

export interface DirectiveCard extends ResolutionCardBase {
  kind: "directive";
  /** The flavour band on the card face — which wing of the mob is speaking. */
  faction: "mob" | "agitator";
  effects: DirectiveEffect[];
}

export type ResolutionCard = LawCard | DirectiveCard;

interface PoliticianBase {
  id: PoliticianId;
  name: string;
  epithet: string;
  /** One line of ideology — what this deck is FOR, shown under the colonnade header. */
  creed: string;
}

/**
 * An orator, and what his laws TEND to do.
 *
 * `tendency` is two representative effects authored beside the deck itself — not
 * a summary the UI writes. The Assembly has to answer "what am I buying if I draw
 * from this man?" before you have seen a single card, and the honest answer is in
 * the same vocabulary the cards are: real typed effects, run through the same
 * presenters and the same icons as everything else. A hand-written sentence in
 * the frontend would be a fifth place the rules are described, and the first to
 * go stale.
 *
 * Discriminated on `kind` so the two effect vocabularies never mix: a law
 * politician tends toward `LawEffect`s, the demagogue toward `DirectiveEffect`s.
 * Nothing in the rules reads `tendency`.
 */
export type Politician =
  | (PoliticianBase & { kind: "law"; tendency: readonly LawEffect[] })
  | (PoliticianBase & { kind: "directive"; tendency: readonly DirectiveEffect[] });

/**
 * A Law standing on the board — the stele in the agora. `author` is the stele's
 * colour and descriptive patronage record; `order` is a monotonic
 * enactment counter, so "the most recently enacted Law" is exact even when two
 * pass in the same assembly.
 */
export interface ActiveLaw {
  cardId: string;
  /** The seat that enacted it. Null marks the unauthored house Law: it remains a
   *  standing rule and adds politician power, but grants no prize or Voice progress. */
  author: PlayerId | null;
  enactedSeason: number;
  order: number;
}

/**
 * A passed Directive's permanent monument on Stratokles's stack: a descriptive
 * record, never an active rule. It consumes no Law-cap slot and cannot be repealed.
 */
export interface TallyMonument {
  cardId: string;
  /** Directives can only be authored by a player; the house draws Laws only. */
  author: PlayerId;
  enactedSeason: number;
  order: number;
}

/** What a ballot item asks the Assembly to do. */
export type BallotItem =
  | {
      kind: "enact";
      card: ResolutionCard;
      /** null for the house card, which no seat authored. */
      proposer: PlayerId | null;
      /** At the Law cap, the active Law this proposal would replace (§1.5). */
      replaces?: string;
      /** Required for a Directive and always a rival of its proposer. */
      target?: PlayerId;
    }
  | { kind: "repeal"; cardId: string; proposer: PlayerId };

export interface BallotVote {
  playerID: PlayerId;
  yea: boolean;
  /** Total votes cast — citizens (or 1 under Isonomia) plus any bought. */
  weight: number;
  /** How many of `weight` were bought with influence. */
  bribed: number;
}

export interface AssemblyResult {
  item: BallotItem;
  passed: boolean;
  yea: number;
  nay: number;
  votes: BallotVote[];
  vetoedBy?: PlayerId;
  /** One chronicle-ready line describing what the Assembly decided. */
  summary: string;
}

/** A card a seat is holding during the proposal round — secret to every other seat. */
export type HeldCard = { card: ResolutionCard; draws: number };

/**
 * The two phases (§1.3). Proposal is now **asynchronous** (owner ruling, 2026-07-20):
 * every seat draws, proposes or passes *independently and in secret* — the hotseat
 * player switches perspective and acts as each in any order. Only once every seat has
 * finalized are the proposals revealed and voted one at a time. Voting stays strictly
 * sequential, which is what keeps the open-vote kingmaker dynamic (§1.3).
 */
export type AssemblyPhase = "proposal" | "voting" | "closing";

/**
 * A live Assembly. Its presence on {@link HegemonyState.assembly} is the gate: while
 * it is non-null the turn machine is suspended and the Assembly panel owns the sea —
 * the same engine-state mounting the yearly omen uses, so it can never be opened or
 * dismissed by a click.
 */
export interface AssemblySession {
  year: number;
  season: number;
  phase: AssemblyPhase;
  /** During voting: whose turn to cast. During proposal it tracks the first seat still
   *  to decide, purely so a headless driver has someone to play — the UI lets ANY
   *  undecided seat act, gated on {@link proposalDone}, not on this. During closing:
   *  the seat play returns to. */
  activePlayer: PlayerId;

  // ── Proposal (async) ──────────────────────────────────────────────────────────
  /** The house resolution — public on the bema from the start (no seat authored it). */
  houseItem: BallotItem | null;
  /** Each seat's secret drawn card, or null. Hidden from everyone else until proposed. */
  held: Record<PlayerId, HeldCard | null>;
  /** Draws each seat has made this assembly — the escalating fishing sink is per-seat. */
  draws: Record<PlayerId, number>;
  /** Each seat's finalized proposal (an enact or a repeal), or null if they passed —
   *  kept secret until voting, then folded into {@link ballot} in turn order. */
  proposals: Record<PlayerId, BallotItem | null>;
  /** Whether each seat has finalized its proposal decision. All true → voting begins. */
  proposalDone: Record<PlayerId, boolean>;

  // ── Voting (sequential) ───────────────────────────────────────────────────────
  ballot: BallotItem[];
  ballotIndex: number;
  /** Votes cast on the ballot item under consideration, in the order they landed. */
  votes: BallotVote[];
  /** Vote order for the current item — turn order from the season opener. */
  voteOrder: PlayerId[];
  voteIndex: number;
  bribesUsed: Record<PlayerId, number>;
  vetoUsed: Record<PlayerId, number>;
  results: AssemblyResult[];
  /** The one rival whose base vote Isonomia fixes at one for this Assembly. */
  isonomiaTarget: PlayerId | null;
  /** The seat whose turn was suspended to convene this assembly. `closeAssembly`
   *  hands play back to them, so the agora never eats a turn. */
  resumePlayer: PlayerId;
}

/** Board-derived, descriptive standing for one politician. */
export interface PoliticianStanding {
  politician: Politician;
  /** Active Laws (regulars) or tally monuments (Stratokles) bearing their name. */
  power: number;
  /** The seat that authored the most of those stelae; null on a tie or an empty stack. */
  patron: PlayerId | null;
  /** Stelae authored, per seat — the stack's colour breakdown. */
  authored: Record<PlayerId, number>;
}
