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
    implementation: "src/parity/withinAxisParity.test.ts",
    evidence: "binds immediate active-player seasonal effects to the seat that revealed them",
  },
  eventPersistent: {
    implementation: "src/parity/activeEffectParity.test.ts",
    evidence:
      "materializes every authored player timed effect and discount through event resolution",
  },
  eventChoice: {
    implementation: "src/game/deck.test.ts",
    evidence: "no choice card has a dominated option",
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
    evidence: "settlementIncome pays per settlement in its scope",
  },
  lawCost: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "actionCostDelta reaches build-building",
  },
  lawBank: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "bankRateStep shifts the rate one whole step",
  },
  lawAnnual: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "yearlyFreeAction is spent once and refreshes when the year turns",
  },
  lawFounding: {
    implementation: "src/game/assembly/laws.test.ts",
    evidence: "onFoundColony grants the pop and takes the happiness",
  },
  directiveResources: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "Bread and Circuses pays and charges only its target",
  },
  directiveFraction: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "Grain Riot halves only the chosen rival's stored food",
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
    evidence: "The Stele Is Broken throws down the target's newest authored standing Law",
  },
  directiveVotes: {
    implementation: "src/game/assembly/assembly.test.ts",
    evidence: "Isonomia fixes only its target at one base vote in the next Assembly",
  },
  buildingEffects: {
    implementation: "src/parity/featureParity.test.ts",
    evidence: "routes every building effect through its authoritative engine query",
  },
  activeEffectLifecycle: {
    implementation: "src/parity/activeEffectParity.test.ts",
    evidence: "expires countdown and coupon state at the same lifecycle boundaries it declares",
  },
  activeEffectPolicy: {
    implementation: "src/parity/activeEffectParity.test.ts",
    evidence:
      "makes the master policy use calm against harmful mood and avoid it against beneficial mood",
  },
  unrestResolution: {
    implementation: "src/game/unrest.test.ts",
    evidence: "parks a severe riot (revolt) at the -10 threshold",
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
  luxuryClaims: {
    implementation: "src/game/luxury.test.ts",
    evidence: "claims the adjacent good through the ownership seam — first Port wins",
  },
  luxuryActivity: {
    implementation: "src/game/luxury.test.ts",
    evidence: "keeps goods over the active cap owned but inactive, deterministically",
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
  { implementation: "src/game/activeEffects.ts", evidence: "EVENT_EFFECT_ACTIVE_EFFECT_HANDLING" },
  { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
  { implementation: "src/sim/telemetry.ts", evidence: "events" },
] as const;
const event = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...eventArgs, ...fixtures);

export const EVENT_EFFECT_PARITY = {
  resourceDelta: event("eventImmediate"),
  scaledResourceDelta: event("eventImmediate"),
  happinessDelta: event("eventImmediate"),
  scaledHappinessDelta: event("eventImmediate", "eventPersistent"),
  timedHappinessDelta: event("eventPersistent", "activeEffectPolicy"),
  incomeModifier: event("eventPersistent", "activeEffectPolicy"),
  buildingCostMultiplier: event("eventPersistent"),
  addPops: event("eventImmediate"),
  actionCostDiscount: event("eventPersistent"),
  resourceExchange: event("eventImmediate"),
  resourceDeltaPerPop: event("eventImmediate"),
  choice: event("eventChoice"),
} as const satisfies Record<EventEffect["type"], EffectParityCoverage>;

const tableArgs = [
  { implementation: "src/game/tables.ts", evidence: "applyTableEffect" },
  { implementation: "src/ui/effects.ts", evidence: "presentTableEffect" },
  { implementation: "src/game/types.ts", evidence: "lastTableRoll" },
  { implementation: "src/sim/policies.ts", evidence: "resolveStochasticByRule" },
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
  yearIncomeModifier: table("tableResolution", "activeEffectPolicy"),
} as const satisfies Record<TableEffect["type"], EffectParityCoverage>;

const lawArgs = [
  { implementation: "src/game/assembly/laws.ts", evidence: "getStandingEffects" },
  { implementation: "src/ui/effects.ts", evidence: "presentLawEffect" },
  { implementation: "src/game/activeEffects.ts", evidence: "standingLaw" },
  { implementation: "src/sim/policies.ts", evidence: "deltaIfEnacted" },
  { implementation: "src/sim/telemetry.ts", evidence: "lawsEnacted" },
] as const;
const law = (...fixtures: NonEmptyList<ParityBehaviorFixtureId>) =>
  coverage(...lawArgs, ...fixtures);

export const LAW_EFFECT_PARITY = {
  settlementIncome: law("lawIncome", "policyAssembly"),
  popIncome: law("lawIncome", "policyAssembly"),
  popPrimaryIncome: law("lawIncome", "policyAssembly"),
  flatIncome: law("lawIncome", "policyAssembly"),
  thresholdHappiness: law("lawIncome", "policyAssembly"),
  surplusConversion: law("lawIncome", "policyAssembly"),
  actionCostDelta: law("lawCost", "policyAssembly"),
  actionCostMultiplier: law("lawCost", "policyAssembly"),
  bankRateStep: law("lawBank", "policyAssembly"),
  yearlyFreeAction: law("lawAnnual", "policyAssembly"),
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
  resourceDelta: directive("directiveResources", "policyAssembly"),
  resourceFraction: directive("directiveFraction", "policyAssembly"),
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
  freemanGoldBonus: building("buildingEffects"),
  citizenInfluenceBonus: building("buildingEffects"),
  slavePrimaryResourceBonus: building("buildingEffects"),
  income: building("buildingEffects"),
  happiness: building("buildingEffects"),
  growPopFoodDiscount: building("buildingEffects"),
  popCapacityBonus: building("buildingEffects"),
  tilePrimaryResourceBonus: building("buildingEffects"),
  promoteCostReduction: building("buildingEffects"),
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
  foodDeficitProgress: active("activeEffectLifecycle", "activeEffectPolicy"),
  timedHappiness: active("activeEffectLifecycle", "activeEffectPolicy"),
  resourceIncome: active("activeEffectLifecycle", "activeEffectPolicy"),
  buildingCostMultiplier: active("activeEffectLifecycle"),
  actionCostDiscount: active("activeEffectLifecycle"),
  standingLaw: active("activeEffectLifecycle", "policyAssembly"),
  equalVotesNextAssembly: active("activeEffectLifecycle", "policyAssembly"),
} as const satisfies Record<ActiveEffectMechanic["type"], EffectParityCoverage>;

export const BUILDING_CONTENT_IDS = [
  "marketplace",
  "temple",
  "workshop",
  "granary",
  "forum",
  "aqueduct",
  "odeon",
  "villa",
  "gymnasion",
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

export const SEASONAL_EVENT_CONTENT_IDS = [
  "season-drought",
  "season-bountiful-harvest",
  "season-timber-levies",
  "season-quarry-contracts",
  "season-grain-tithe",
  "season-civic-anxiety",
  "season-festival-games",
  "season-scarce-labor",
  "season-skilled-artisans",
  "season-open-markets",
  "season-plague",
  "season-spring-floods",
  "season-wildfire",
] as const;

export const PLAYER_EVENT_CONTENT_IDS = [
  "player-new-citizen",
  "player-free-settlers",
  "player-captured-laborers",
  "player-citizenship-rolls",
  "player-willing-hands",
  "player-slave-auction",
  "player-good-stores",
  "player-timber-windfall",
  "player-merchant-profit",
  "player-stone-shipment",
  "player-local-unrest",
  "player-public-calm",
  "player-civil-discord",
  "player-granary-rats",
  "player-banditry",
  "player-warehouse-fire",
  "player-quarry-collapse",
  "player-patronage-network",
  "player-emergency-labor",
  "player-granary-surplus",
  "player-civic-petition",
  "player-skilled-mason",
  "player-caravan-contacts",
  "player-forest-crews",
  "player-temple-donation",
  "player-market-day",
] as const;

export const EVENT_TABLE_CONTENT_IDS = [
  "riot",
  "merchantConvoy",
  "grandEmbassy",
  "colonistsVoyage",
  "omen",
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
  "grain-dole",
  "land-reform",
  "sacred-fields",
  "manumission-law",
  "festival-calendar",
  "agrarian-tariff",
  "tenant-rights",
  "cult-of-demeter",
  "public-works",
  "guild-charter",
  "forum-rites",
  "civic-pride",
  "aqueduct-levy",
  "monumental-code",
  "census-rolls",
  "master-builders",
  "homestead-act",
  "colonial-charter",
  "enfranchise-the-colonies",
  "frontier-spirit",
  "pioneer-levy",
  "manifest-destiny",
  "land-rush",
  "rural-bloc",
] as const;

export const DIRECTIVE_CONTENT_IDS = [
  "grain-riot",
  "the-streets-burn",
  "general-strike",
  "the-mob-rises",
  "bread-and-circuses",
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

export const CONTENT_MANIFEST = {
  buildings: {
    ids: BUILDING_CONTENT_IDS,
    engine: { implementation: "src/game/content.ts", evidence: "getBuildings" },
    frontend: {
      implementation: "src/components/board/ledger/BuildingsTab.tsx",
      evidence: "getBuildings",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "projectPolicyHorizon" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "buildings" },
    behaviorFixtures: ["buildingEffects", "contentTelemetry"],
  },
  terrain: {
    ids: TERRAIN_CONTENT_IDS,
    engine: { implementation: "src/game/content.ts", evidence: "getTerrainDeck" },
    frontend: { implementation: "src/components/HexMap.tsx", evidence: "terrain" },
    simulation: { implementation: "src/sim/setup.ts", evidence: "boardLayout" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "frontierTiles" },
    behaviorFixtures: ["contentInventory"],
  },
  seasonalEvents: {
    ids: SEASONAL_EVENT_CONTENT_IDS,
    engine: { implementation: "src/game/events.ts", evidence: "drawSeasonalEvent" },
    frontend: {
      implementation: "src/components/board/topbar/TopbarEvents.tsx",
      evidence: "presentEventEffects",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "projectPolicyHorizon" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "seasonal" },
    behaviorFixtures: ["eventPersistent", "contentTelemetry"],
  },
  playerEvents: {
    ids: PLAYER_EVENT_CONTENT_IDS,
    engine: { implementation: "src/game/events.ts", evidence: "resolvePendingPlayerEvent" },
    frontend: {
      implementation: "src/components/board/modals/PendingPlayerEventModal.tsx",
      evidence: "presentEventEffects",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "onePlyLookahead" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "choicePicks" },
    behaviorFixtures: ["eventImmediate", "eventChoice", "contentTelemetry"],
  },
  eventTables: {
    ids: EVENT_TABLE_CONTENT_IDS,
    engine: { implementation: "src/game/tables.ts", evidence: "rollOnTable" },
    frontend: {
      implementation: "src/components/board/modals/EventTableModal.tsx",
      evidence: "presentTableEffect",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "resolveStochasticByRule" },
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
    simulation: { implementation: "src/sim/policies.ts", evidence: "resolveStochasticByRule" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "buyRiotInsurance" },
    behaviorFixtures: ["tableResolution"],
  },
  politicians: {
    ids: POLITICIAN_CONTENT_IDS,
    engine: { implementation: "src/game/assembly/deck.ts", evidence: "POLITICIANS" },
    frontend: {
      implementation: "src/components/board/assembly/AssemblyColonnade.tsx",
      evidence: "politician",
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
      implementation: "src/components/board/assembly/AssemblyFloor.tsx",
      evidence: "ResolutionEffect",
    },
    simulation: { implementation: "src/sim/policies.ts", evidence: "deltaIfEnacted" },
    telemetry: { implementation: "src/sim/telemetry.ts", evidence: "assembly" },
    behaviorFixtures: ["policyAssembly", "policyCompleteGame"],
  },
  luxuryGoods: {
    ids: LUXURY_GOOD_CONTENT_IDS,
    engine: { implementation: "src/game/luxury.ts", evidence: "activeClaims" },
    frontend: {
      implementation: "src/components/board/ledger/EmpireIntelPanel.tsx",
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

export type SeasonalEventContentId = (typeof SEASONAL_EVENT_CONTENT_IDS)[number];
export type PlayerEventContentId = (typeof PLAYER_EVENT_CONTENT_IDS)[number];

export const FEATURE_PARITY = {
  terrainEconomy: CONTENT_MANIFEST.terrain,
  buildingEconomy: CONTENT_MANIFEST.buildings,
  seasonalEvents: CONTENT_MANIFEST.seasonalEvents,
  playerEvents: CONTENT_MANIFEST.playerEvents,
  eventTables: CONTENT_MANIFEST.eventTables,
  unrest: {
    ids: ["foodDeficit", "riot", "revolt"],
    engine: { implementation: "src/game/unrest.ts", evidence: "applyUnrestUpkeep" },
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
    behaviorFixtures: [
      "directiveResources",
      "directiveFraction",
      "directiveSuppression",
      "policyAssembly",
    ],
  },
} as const satisfies Record<string, ContentManifestEntry>;
