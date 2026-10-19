import type { ActiveEffectMechanic } from "../game/activeEffects";
import type { DirectiveEffect, LawEffect, PoliticianId } from "../game/assembly/types";
import type {
  BuildingEffect,
  BuildingId,
  EventEffect,
  EventTableId,
  LuxuryGoodId,
  RiotInsuranceId,
  TableEffect,
  Terrain,
} from "../game/types";

type NonEmptyList<T> = readonly [T, ...T[]];

export type ParityEvidence = {
  implementation: string;
  evidence: string;
};

export const PARITY_BEHAVIOR_FIXTURES = {
  eventImmediate: {
    implementation: "src/game/deck.test.ts",
    evidence: "pays flat gains and floors each harm at the held stock",
  },
  eventPops: {
    implementation: "src/game/deck.test.ts",
    evidence:
      "places only slaves or freemen in an owned settlement with room, through legal commands",
  },
  eventTokens: {
    implementation: "src/game/deck.test.ts",
    evidence: "token cards place one, clear one and clear all through their real paths",
  },
  tableResolution: {
    implementation: "src/game/tables.test.ts",
    evidence: "stores the outcome on lastTableRoll for the UI",
  },
  tableFallbacks: {
    implementation: "src/game/tables.test.ts",
    evidence: "destroyBuilding falls back to pop loss",
  },
  lawIncome: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "Civic Pride pays one flat happiness line",
  },
  lawCost: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "price Laws state growth, calm, founding, upgrading and building prices",
  },
  lawFounding: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "Frontier Spirit grants a slave on the real founding path",
  },
  directiveResources: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "Grain Riot takes 3 food only from its target",
  },
  directiveSuppression: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "General Strike suppresses one income collection for its chosen rival",
  },
  directivePops: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "The Mob Rises takes a pop from the rival's largest settlement",
  },
  directiveRepeal: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "The Stele Is Broken removes the newest authored Law only after tenure",
  },
  directiveVotes: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "Isonomia fixes the next sitting's base vote at one",
  },
  buildingEffects: {
    implementation: "src/parity/featureParity.test.ts",
    evidence: "routes every building effect through its authoritative engine query",
  },
  activeEffectLifecycle: {
    implementation: "src/parity/activeEffectParity.test.ts",
    evidence: "expires income suppression at the lifecycle boundary it declares",
  },
  activeEffectPolicy: {
    implementation: "src/parity/activeEffectParity.test.ts",
    evidence: "buys this year's calm to cover the current turn-end check",
  },
  hungerResolution: {
    implementation: "src/game/hunger.test.ts",
    evidence: "asks who leaves when the turn ends short",
  },
  workSlots: {
    implementation: "src/game/workSlots.test.ts",
    evidence: "a slave makes 1 of the terrain's resource from an open slot and nothing without one",
  },
  unrestResolution: {
    implementation: "src/game/unrest.test.ts",
    evidence: "at −6 revolts: half the slaves leave, the tokens clear, nothing is rolled",
  },
  victoryResolution: {
    implementation: "src/game/victory.test.ts",
    evidence: "ends the game at the start of a turn when the player holds three cards",
  },
  contentInventory: {
    implementation: "src/parity/featureParity.test.ts",
    evidence: "matches every shipped content id and effect to the manifests",
  },
  contentTelemetry: {
    implementation: "src/parity/featureParity.test.ts",
    evidence: "zero-fills manifested building and event content in telemetry",
  },
  policyAssembly: {
    implementation: "src/sim/policies.test.ts",
    evidence: "uses the political Assembly strategy and carries the session to completion",
  },
  policyCompleteGame: {
    implementation: "src/sim/policies.test.ts",
    evidence: "plays complete games across seeds without deadlocking through the agora",
  },
  ideaRules: { implementation: "src/game/ideas.test.ts", evidence: "twelve National Ideas" },
  ideaPolicy: {
    implementation: "src/sim/ideasPolicy.test.ts",
    evidence: "scores setup Ideas and in-play purchases",
  },
  luxuryClaims: {
    implementation: "src/game/luxury.test.ts",
    evidence: "claims the adjacent good through the ownership seam — first Port wins",
  },
  luxuryActivity: {
    implementation: "src/game/luxury.test.ts",
    evidence: "counts every good a player holds: there is no cap",
  },
} as const satisfies Record<string, ParityEvidence>;

export type ParityBehaviorFixtureId = keyof typeof PARITY_BEHAVIOR_FIXTURES;

export type EffectParityCoverage = {
  engine: ParityEvidence;
  frontend: ParityEvidence;
  simulation: {
    observation: ParityEvidence;
    valuation: ParityEvidence;
    telemetry: ParityEvidence;
  };
  behaviorFixtures: NonEmptyList<ParityBehaviorFixtureId>;
};

function coverage(
  engine: ParityEvidence,
  frontend: ParityEvidence,
  observation: ParityEvidence,
  valuation: ParityEvidence,
  telemetry: ParityEvidence,
  ...behaviorFixtures: NonEmptyList<ParityBehaviorFixtureId>
): EffectParityCoverage {
  return { engine, frontend, simulation: { observation, valuation, telemetry }, behaviorFixtures };
}

const eventArgs = [
  { implementation: "src/game/events.ts", evidence: "applyEventEffects" },
  { implementation: "src/ui/effects.ts", evidence: "presentEventEffect" },
  { implementation: "src/game/projection.ts", evidence: "pendingPlayerEvent" },
  { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
  { implementation: "src/sim/telemetry.ts", evidence: "events" },
] as const;
const event = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...eventArgs, ...fixtures);

export const EVENT_EFFECT_PARITY = {
  resourceDelta: event("eventImmediate"),
  unrestTokens: event("eventTokens"),
  addPops: event("eventPops"),
} as const satisfies Record<EventEffect["type"], EffectParityCoverage>;

const tableArgs = [
  { implementation: "src/game/tables.ts", evidence: "applyTableEffect" },
  { implementation: "src/ui/effects.ts", evidence: "presentTableEffect" },
  { implementation: "src/game/types.ts", evidence: "lastTableRoll" },
  { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
  { implementation: "src/sim/telemetry.ts", evidence: "movesByType" },
] as const;
const table = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...tableArgs, ...fixtures);

export const TABLE_EFFECT_PARITY = {
  none: table("tableResolution"),
  losePops: table("tableResolution"),
  loseResource: table("tableResolution", "tableFallbacks"),
  destroyBuilding: table("tableFallbacks"),
  gainResource: table("tableResolution"),
  gainPop: table("tableResolution", "tableFallbacks"),
} as const satisfies Record<TableEffect["type"], EffectParityCoverage>;

// `deltaIfEnacted` is the route every Law and Directive is scored through, on a clone
// the engine has enacted it on. It is a route, not yet a value, for a price Law, a calm
// payment and Isonomia: those change nothing a static position shows, so they score 0.
const lawArgs = [
  { implementation: "src/game/assembly/laws.ts", evidence: "getStandingEffects" },
  { implementation: "src/ui/effects.ts", evidence: "presentLawEffect" },
  { implementation: "src/game/activeEffects.ts", evidence: "standingLaw" },
  { implementation: "src/sim/policies.ts", evidence: "deltaIfEnacted" },
  { implementation: "src/sim/telemetry.ts", evidence: "lawsEnacted" },
] as const;
const law = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...lawArgs, ...fixtures);

/** `valuation` names what prices the effect in the bots' score. An effect the
 *  projection or the real post-pick state already carries has no opportunity term. */
const idea = (valuation = "ideaOpportunityValue") =>
  coverage(
    { implementation: "src/game/ideaRules.ts", evidence: "getStandingEffects" },
    { implementation: "src/components/board/modals/IdeasModal.tsx", evidence: "getNationalIdeas" },
    { implementation: "src/game/ideas.ts", evidence: "ideaHolder" },
    { implementation: "src/sim/policies.ts", evidence: valuation },
    { implementation: "src/sim/telemetry.ts", evidence: "nationalIdeas" },
    "ideaRules",
    "ideaPolicy",
  );
export const LAW_EFFECT_PARITY = {
  realmIncome: idea("projectPolicyHorizon"),
  extraSlots: idea("projectPolicyHorizon"),
  colonyPieces: idea(),
  acquirePop: idea("ideaForEval"),
  acquireResource: idea("ideaForEval"),
  onUpgradeCity: idea(),
  dolePrice: idea(),
  slotExempt: idea(),
  votePurchaseLimit: idea(),
  rule: law("lawIncome", "lawCost", "policyAssembly"),
  actionCost: law("lawCost", "policyAssembly"),
  calmPayment: law("lawCost", "policyAssembly"),
  colonyCapacity: law("lawCost", "policyAssembly"),
  buildingFood: law("lawIncome", "policyAssembly"),
  happiness: law("lawIncome", "policyAssembly"),
  settlementIncome: law("lawIncome", "policyAssembly"),
  onFoundColony: law("lawFounding", "policyAssembly"),
} as const satisfies Record<LawEffect["type"], EffectParityCoverage>;

const directiveArgs = [
  { implementation: "src/game/assembly/assembly.ts", evidence: "applyDirectiveEffect" },
  { implementation: "src/ui/effects.ts", evidence: "presentDirectiveEffect" },
  { implementation: "src/game/activeEffects.ts", evidence: "ActiveEffectSource" },
  { implementation: "src/sim/policies.ts", evidence: "deltaIfEnacted" },
  { implementation: "src/sim/telemetry.ts", evidence: "directivesPassed" },
] as const;
const directive = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...directiveArgs, ...fixtures);

export const DIRECTIVE_EFFECT_PARITY = {
  unrestTokens: directive("eventTokens"),
  resourceDelta: directive("directiveResources", "policyAssembly"),
  losePopFromLargest: directive("directivePops", "policyAssembly"),
  suppressIncome: directive("directiveSuppression", "activeEffectPolicy", "policyAssembly"),
  repealNewestTargetLaw: directive("directiveRepeal", "policyAssembly"),
  equalVotesNextAssembly: directive("directiveVotes", "policyAssembly"),
} as const satisfies Record<DirectiveEffect["type"], EffectParityCoverage>;

const buildingArgs = [
  { implementation: "src/game/economy/income.ts", evidence: "applyIncomeBuildingEffects" },
  { implementation: "src/ui/effects.ts", evidence: "presentBuildingEffect" },
  { implementation: "src/game/content.ts", evidence: "getBuildings" },
  { implementation: "src/sim/policies.ts", evidence: "projectPolicyHorizon" },
  { implementation: "src/sim/telemetry.ts", evidence: "buildings" },
] as const;
const building = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...buildingArgs, ...fixtures);

export const BUILDING_EFFECT_PARITY = {
  classOutput: building("buildingEffects"),
  income: building("buildingEffects"),
  happiness: building("buildingEffects"),
} as const satisfies Record<BuildingEffect["type"], EffectParityCoverage>;

const activeArgs = [
  { implementation: "src/game/activeEffects.ts", evidence: "getActiveEffects" },
  { implementation: "src/ui/effects.ts", evidence: "presentActiveEffect" },
  { implementation: "src/game/activeEffects.ts", evidence: "ActiveEffectMechanic" },
  { implementation: "src/sim/policies.ts", evidence: "projectPolicyHorizon" },
  { implementation: "src/sim/telemetry.ts", evidence: "activeEffects" },
] as const;
const active = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...activeArgs, ...fixtures);

export const ACTIVE_EFFECT_MECHANIC_PARITY = {
  suppressIncome: active("activeEffectLifecycle", "activeEffectPolicy"),
  hunger: active("activeEffectLifecycle", "activeEffectPolicy"),
  zeroTerm: active("activeEffectLifecycle", "activeEffectPolicy"),
  standingLaw: active("activeEffectLifecycle", "policyAssembly"),
  equalVotesNextAssembly: active("activeEffectLifecycle", "policyAssembly"),
} as const satisfies Record<ActiveEffectMechanic["type"], EffectParityCoverage>;

export const BUILDING_CONTENT_IDS = [
  "marketplace",
  "estate",
  "forum",
  "temple",
  "granary",
  "port",
] as const satisfies readonly BuildingId[];

export const LUXURY_GOOD_CONTENT_IDS = [
  "tyrian-dye",
  "pearls",
  "coral",
  "glassware",
  "incense",
  "fine-linen",
] as const satisfies readonly LuxuryGoodId[];

export const TERRAIN_CONTENT_IDS = [
  "forest",
  "mountain",
  "plains",
  "hill",
  "oracle",
] as const satisfies readonly Terrain[];

export const YEAR_CARD_CONTENT_IDS = [
  "year-drought",
  "year-wildfire",
  "year-silent-mines",
  "year-piracy",
  "year-ostracism",
  "year-blockade",
  "year-plague",
  "year-festival",
] as const;

export const PLAYER_EVENT_CONTENT_IDS = [
  "player-good-stores",
  "player-timber",
  "player-shipment",
  "player-profit",
  "player-patronage",
  "player-free-settlers",
  "player-captured-laborers",
  "player-rats",
  "player-bandits",
  "player-fire",
  "player-local-unrest",
  "player-public-calm",
] as const;

export const EVENT_TABLE_CONTENT_IDS = [
  "riot",
  "merchantConvoy",
  "grandEmbassy",
  "colonistsVoyage",
] as const satisfies readonly EventTableId[];

export const RIOT_INSURANCE_CONTENT_IDS = [
  "breadDole",
  "concession",
  "patronage",
] as const satisfies readonly RiotInsuranceId[];

export const POLITICIAN_CONTENT_IDS = [
  "demosthenes",
  "perdiccas",
  "kleistophenes",
  "stratokles",
] as const satisfies readonly PoliticianId[];

export const LAW_CONTENT_IDS = [
  "land-reform",
  "sacred-fields",
  "manumission",
  "tenant-rights",
  "grain-levy",
  "festival-calendar",
  "public-works",
  "guild-charter",
  "forum-rites",
  "civic-pride",
  "master-builders",
  "homestead-act",
  "colonial-charter",
  "frontier-spirit",
  "harbour-dues",
  "rural-bloc",
] as const;

export const DIRECTIVE_CONTENT_IDS = [
  "grain-riot",
  "the-streets-burn",
  "general-strike",
  "the-mob-rises",
  "the-stele-is-broken",
  "isonomia",
] as const;

export const RESOLUTION_CONTENT_IDS = [...LAW_CONTENT_IDS, ...DIRECTIVE_CONTENT_IDS] as const;

export const VICTORY_CARD_CONTENT_IDS = [
  "polis-builder",
  "demos",
  "civic-elite",
  "treasurer",
  "beloved",
  "voice",
] as const;

export type ContentManifestEntry = {
  ids: readonly string[];
  engine: ParityEvidence;
  frontend: ParityEvidence;
  simulation: ParityEvidence;
  telemetry: ParityEvidence;
  behaviorFixtures: NonEmptyList<ParityBehaviorFixtureId>;
};

export const NATIONAL_IDEA_CONTENT_IDS = [
  "good-harvest",
  "public-dole",
  "urban-planning",
  "capital-works",
  "civic-tradition",
  "frontier-charter",
  "new-settlers",
  "city-pioneers",
  "slave-colonies",
  "harbour-planning",
  "treasury-grant",
  "assembly-brokers",
] as const;

export const CONTENT_MANIFEST = {
  nationalIdeas: {
    ids: NATIONAL_IDEA_CONTENT_IDS,
    engine: { implementation: "src/game/ideas.ts", evidence: "takeNationalIdea" },
    frontend: {
      implementation: "src/components/board/modals/IdeasModal.tsx",
      evidence: "getNationalIdeas",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "chooseIdea" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "nationalIdeas" },
    behaviorFixtures: ["ideaRules", "ideaPolicy"],
  },
  buildings: {
    ids: BUILDING_CONTENT_IDS,
    engine: { implementation: "src/game/content.ts", evidence: "getBuildings" },
    frontend: {
      implementation: "src/components/frame/realm/BuildPage.tsx",
      evidence: "getBuildings",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "projectPolicyHorizon" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "buildings" },
    behaviorFixtures: ["buildingEffects", "contentTelemetry"],
  },
  terrain: {
    ids: TERRAIN_CONTENT_IDS,
    engine: { implementation: "src/game/content.ts", evidence: "getTerrainDeck" },
    frontend: { implementation: "src/components/frame/island/Island.tsx", evidence: "terrain" },
    simulation: { implementation: "src/sim/setup.ts", evidence: "boardLayout" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "frontierTiles" },
    behaviorFixtures: ["contentInventory"],
  },
  yearCards: {
    ids: YEAR_CARD_CONTENT_IDS,
    engine: { implementation: "src/game/year.ts", evidence: "revealYearCard" },
    frontend: {
      implementation: "src/components/board/modals/YearCardModal.tsx",
      evidence: "presentYearCard",
    },
    simulation: {
      implementation: "src/sim/policies.ts",
      evidence: "expireYear",
    },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "countYearCard" },
    behaviorFixtures: ["eventTokens", "contentTelemetry"],
  },
  playerEvents: {
    ids: PLAYER_EVENT_CONTENT_IDS,
    engine: { implementation: "src/game/events.ts", evidence: "resolvePendingPlayerEvent" },
    frontend: {
      implementation: "src/components/board/modals/PendingPlayerEventModal.tsx",
      evidence: "presentEventEffects",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "countPlayerDraw" },
    behaviorFixtures: ["eventImmediate", "eventPops", "eventTokens", "contentTelemetry"],
  },
  eventTables: {
    ids: EVENT_TABLE_CONTENT_IDS,
    engine: { implementation: "src/game/tables.ts", evidence: "rollOnTable" },
    frontend: {
      implementation: "src/components/board/modals/EventTableModal.tsx",
      evidence: "presentTableEffect",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "movesByType" },
    behaviorFixtures: ["tableResolution"],
  },
  riotInsurance: {
    ids: RIOT_INSURANCE_CONTENT_IDS,
    engine: { implementation: "src/game/riot.ts", evidence: "getBuyRiotInsuranceStatus" },
    frontend: {
      implementation: "src/components/board/modals/RiotModal.tsx",
      evidence: "insurance",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "resolveRiotByRule" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "buyRiotInsurance" },
    behaviorFixtures: ["tableResolution"],
  },
  politicians: {
    ids: POLITICIAN_CONTENT_IDS,
    engine: { implementation: "src/game/assembly/deck.ts", evidence: "POLITICIANS" },
    frontend: {
      implementation: "src/components/board/assembly/AssemblySitting.tsx",
      evidence: "POLITICIANS",
    },
    simulation: {
      implementation: "src/sim/policies.ts",
      evidence: "expectedDeckDelta",
    },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "assembly" },
    behaviorFixtures: ["policyAssembly"],
  },
  resolutions: {
    ids: RESOLUTION_CONTENT_IDS,
    engine: { implementation: "src/game/assembly/deck.ts", evidence: "RESOLUTION_CARDS" },
    frontend: {
      implementation: "src/components/board/assembly/AssemblySitting.tsx",
      evidence: "ResolutionDetails",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "deltaIfEnacted" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "assembly" },
    behaviorFixtures: ["policyAssembly", "policyCompleteGame"],
  },
  luxuryGoods: {
    ids: LUXURY_GOOD_CONTENT_IDS,
    engine: { implementation: "src/game/luxury.ts", evidence: "activeClaims" },
    frontend: {
      implementation: "src/components/frame/RealmPanel.tsx",
      evidence: "ownedClaims",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "scoreMaster" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "luxuries" },
    behaviorFixtures: ["luxuryClaims", "luxuryActivity"],
  },
  victoryCards: {
    ids: VICTORY_CARD_CONTENT_IDS,
    engine: { implementation: "src/game/victory.ts", evidence: "victoryStandings" },
    frontend: {
      implementation: "src/components/board/ledger/VictoryTab.tsx",
      evidence: "victoryStandings",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "victoryCardsHeld" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "finalCards" },
    behaviorFixtures: ["victoryResolution", "policyCompleteGame"],
  },
} as const satisfies Record<string, ContentManifestEntry>;

export type YearCardContentId = (typeof YEAR_CARD_CONTENT_IDS)[number];
export type PlayerEventContentId = (typeof PLAYER_EVENT_CONTENT_IDS)[number];

export const FEATURE_PARITY = {
  nationalIdeas: CONTENT_MANIFEST.nationalIdeas,
  terrainEconomy: CONTENT_MANIFEST.terrain,
  buildingEconomy: CONTENT_MANIFEST.buildings,
  yearCards: CONTENT_MANIFEST.yearCards,
  playerEvents: CONTENT_MANIFEST.playerEvents,
  eventTables: CONTENT_MANIFEST.eventTables,
  workSlots: {
    ids: ["slots", "workingSlaves", "idleSlaves"],
    engine: { implementation: "src/game/settlement.ts", evidence: "settlementWorkingSlaves" },
    frontend: {
      implementation: "src/components/frame/SettlementPage.tsx",
      evidence: "settlementIdleSlaves",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "tile.slots" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "idleSlaves" },
    behaviorFixtures: ["workSlots"],
  },
  hunger: {
    ids: ["hunger"],
    engine: { implementation: "src/game/hunger.ts", evidence: "resolveHunger" },
    frontend: {
      implementation: "src/components/HegemonyBoard.tsx",
      evidence: "moves.resolveHunger",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "applyHunger" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "popsLostToHunger" },
    behaviorFixtures: ["hungerResolution", "activeEffectPolicy"],
  },
  unrest: {
    ids: ["riot", "revolt"],
    engine: { implementation: "src/game/unrest.ts", evidence: "applyUnrestAtTurnEnd" },
    frontend: {
      implementation: "src/components/board/modals/RiotModal.tsx",
      evidence: "pendingRiot",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "evaluatePolicyUnrestRisk" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "unrestTier" },
    behaviorFixtures: ["unrestResolution", "activeEffectPolicy"],
  },
  victoryRace: CONTENT_MANIFEST.victoryCards,
  luxuryGoods: CONTENT_MANIFEST.luxuryGoods,
  assemblyLaws: {
    ...CONTENT_MANIFEST.resolutions,
    ids: LAW_CONTENT_IDS,
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "lawsEnacted" },
    behaviorFixtures: ["lawIncome", "lawCost", "policyAssembly"],
  },
  assemblyDirectives: {
    ...CONTENT_MANIFEST.resolutions,
    ids: DIRECTIVE_CONTENT_IDS,
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "directivesPassed" },
    behaviorFixtures: ["directiveResources", "directiveSuppression", "policyAssembly"],
  },
} as const satisfies Record<string, ContentManifestEntry>;
