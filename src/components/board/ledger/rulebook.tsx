/* This is the Codex's rules CONTENT module (a chapter registry), not a hot-reloadable
   component file — it deliberately exports data (RULEBOOK) alongside the small inline
   render helpers, so Fast Refresh's one-kind-of-export rule doesn't apply. */
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import {
  BUILDINGS,
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
  SETTLEMENT_RULES,
  TERRAIN_DECK
} from "../../../game/data";
import { TRADABLE_MATERIALS } from "../../../game/rules";
import { POLITICIANS, RESOLUTION_DECKS } from "../../../game/assembly";
import type { EventCard, HegemonyState, PopType, Resource, SettlementKind, Terrain } from "../../../game/types";
import { RESOURCE_LABELS, formatBuildingEffects, formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../../../ui/resourceVisuals";
import { AnnotatedText } from "../../AnnotatedText";
import { ResourceIcon } from "../../Sprites";
import { eventCardArtUrl } from "../events";
import { capitalize } from "../helpers";
import { EventTableRows } from "../modals/EventTableModal";

/**
 * The rulebook — the whole of Hegemony's rules, as chapters in the order you learn
 * the game, not a scatter of reference articles. It is the narrative head the Codex
 * plan (docs/feat/codex-rules.md) called for.
 *
 * The one law (same as the rest of the Codex): every NUMBER is sourced — capacities,
 * costs, thresholds, minimums all read from `G.ruleset` or the content tables at
 * render time, so a ruleset patch (a mode, a tune-panel override) rewrites the
 * rulebook for free and it can never quote a value the engine doesn't use. Only the
 * prose that explains the SHAPE of a rule is hand-written, and it holds no numbers.
 */

export type RuleChapter = {
  id: string;
  /** Chapter title — the nav chip + heading. */
  title: string;
  /** One-line "what this chapter is", for the search dropdown. */
  blurb: string;
  /** Extra search terms beyond the title/sub-headings (rule nouns a player might type). */
  keywords: string[];
  /** Jumpable sub-headings inside the chapter (the jump strip + deep search hits). */
  entries: Array<{ id: string; label: string }>;
  Body: (props: { G: HegemonyState }) => ReactNode;
};

const anchor = (chapter: string, sub: string) => `codex-${chapter}-${sub}`;

// ── shared render helpers ────────────────────────────────────────────────────

/** A titled sub-section inside a chapter — the jump-strip destinations anchor here. */
function Entry({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <article className="compendiumEntry" id={id}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="compendiumNote">{children}</p>;
}

/** A defined-term row: a label and its sourced value/description. */
function DefRow({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <li className="ruleDefRow">
      <span className="ruleDefTerm">{term}</span>
      <span className="ruleDefBody">{children}</span>
    </li>
  );
}

function DefList({ children }: { children: ReactNode }) {
  return <ul className="ruleDefList">{children}</ul>;
}

/** Format one pop's income line straight from the ruleset's popIncome rule. */
function popIncomeText(G: HegemonyState, pop: PopType): string {
  const rule = G.ruleset.popIncome[pop];
  const parts: string[] = [];
  for (const resource of RESOURCE_ORDER) {
    const amount = rule.flat[resource];
    if (amount) {
      parts.push(`${amount > 0 ? "+" : ""}${amount} ${RESOURCE_LABELS[resource]}`);
    }
  }
  if (rule.primaryResource) {
    parts.push(`+${rule.primaryResource} of the tile's own material per pop`);
  }
  return parts.join(" · ") || "no income";
}

/** Aggregate the terrain deck into per-kind ranges — count, yield, slot spread. */
function terrainSummary() {
  const byKind = new Map<
    Terrain,
    { count: number; resource: Resource | null; yields: number[]; slots: number[] }
  >();
  for (const tile of TERRAIN_DECK) {
    const existing = byKind.get(tile.terrain) ?? {
      count: 0,
      resource: tile.resource ? tile.resource.type : null,
      yields: [] as number[],
      slots: [] as number[]
    };
    existing.count += 1;
    existing.slots.push(tile.buildingSlots);
    if (tile.resource) {
      existing.yields.push(tile.resource.amount);
    }
    byKind.set(tile.terrain, existing);
  }
  const range = (values: number[]) => {
    if (values.length === 0) return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? `${min}` : `${min}–${max}`;
  };
  const order: Terrain[] = ["forest", "mountain", "plains", "hill", "oracle"];
  return order
    .filter((kind) => byKind.has(kind))
    .map((kind) => {
      const data = byKind.get(kind)!;
      return {
        kind,
        count: data.count,
        resource: data.resource,
        yield: range(data.yields),
        slots: range(data.slots)
      };
    });
}

// ── the chapters ─────────────────────────────────────────────────────────────

const victory: RuleChapter = {
  id: "victory",
  title: "How to Win",
  blurb: "The victory race — the public cards and how to hold them.",
  keywords: ["win", "victory", "cards", "minimum", "race", "endgame", "lead"],
  entries: [
    { id: anchor("victory", "race"), label: "The race" },
    { id: anchor("victory", "cards"), label: "The cards" }
  ],
  Body: ({ G }) => {
    const { victory } = G.ruleset;
    const metricLabels: Record<keyof typeof victory.minimums, { title: string; of: string }> = {
      cities: { title: "The Great Polis", of: "the most cities" },
      pops: { title: "The Populous", of: "the most population" },
      citizens: { title: "The Republic", of: "the most citizens" },
      stockpile: { title: "The Treasury", of: "the largest stockpile of materials" },
      happiness: { title: "The Beloved", of: "the highest happiness" },
      voice: { title: "Voice of the Assembly", of: "patronage of the most politicians" }
    };
    return (
      <div className="compendiumStack">
        <Entry id={anchor("victory", "race")} title="The race">
          <Note>
            There are six public victory cards, each awarded to the sole leader in one measure. Hold{" "}
            <strong>{victory.cardsToWin}</strong> of them at the <em>start of your own turn</em> and you win at once.
            Ties award nothing — a card is held only by a clear sole leader who also clears its minimum. Five measure
            what you have built; the sixth, Voice of the Assembly, measures the agora (see{" "}
            <AnnotatedText text="Assembly" />).
          </Note>
          <Note>
            The seasonal deck is the game's clock (see <AnnotatedText text="Seasons" />). If it runs out before anyone
            holds {victory.cardsToWin}, the player holding the most cards wins — happiness then population break a tie.
          </Note>
        </Entry>
        <Entry id={anchor("victory", "cards")} title="The cards & their minimums">
          <Note>
            A card can only be held once its measure passes a floor — set so nothing is winnable at setup or on turn one.
          </Note>
          <DefList>
            {(Object.keys(metricLabels) as Array<keyof typeof victory.minimums>).map((metric) => (
              <DefRow key={metric} term={metricLabels[metric].title}>
                Sole leader in {metricLabels[metric].of}, minimum <strong>{victory.minimums[metric]}</strong>.
              </DefRow>
            ))}
          </DefList>
        </Entry>
      </div>
    );
  }
};

const board: RuleChapter = {
  id: "board",
  title: "The Board",
  blurb: "The island's terrain — what each kind yields and how much it can hold.",
  keywords: ["terrain", "tile", "hex", "forest", "mountain", "plains", "hill", "oracle", "slots", "yield", "coast", "island"],
  entries: [
    { id: anchor("board", "terrain"), label: "Terrain" },
    { id: anchor("board", "special"), label: "Hills & the oracle" }
  ],
  Body: () => (
    <div className="compendiumStack">
      <Entry id={anchor("board", "terrain")} title="Terrain">
        <Note>
          The island is a field of hexes ringed by sea. Each land tile has a single <em>yield</em> — the material a
          settlement there draws each turn — and a number of <em>building slots</em>. Rich tiles are cramped, poor tiles
          roomy: yield and slots trade off within every terrain.
        </Note>
        <ul className="compendiumCostList">
          {terrainSummary().map((row) => (
            <li className="compendiumCostRow" key={row.kind} style={row.resource ? resourceCssVars(row.resource) : undefined}>
              <span className="compendiumCostLabel">
                {row.resource ? <ResourceIcon resource={row.resource} className="marketRowIcon" /> : null} {capitalize(row.kind)}{" "}
                <em className="ruleDim">×{row.count}</em>
              </span>
              <span className="compendiumCostValue">
                {row.resource ? `yield ${row.yield} ${RESOURCE_LABELS[row.resource]}` : "no yield"}
              </span>
              <span className="compendiumCostNote">{row.slots === "0" ? "unsettleable" : `${row.slots} building slot(s)`}</span>
            </li>
          ))}
        </ul>
      </Entry>
      <Entry id={anchor("board", "special")} title="Hills & the oracle">
        <Note>
          <strong>Hills</strong> yield nothing but are slot-rich — a place to build, not to earn. A slave on a yield-less
          tile earns nothing, so hills reward citizens and freemen over slaves.
        </Note>
        <Note>
          The single <strong>oracle</strong> tile is sacred ground: it can never be settled, by founding, upgrade, or any
          event.
        </Note>
      </Entry>
    </div>
  )
};

const resources: RuleChapter = {
  id: "resources",
  title: "Resources",
  blurb: "The six resources — the four you spend and the two meters.",
  keywords: ["wood", "stone", "gold", "food", "influence", "happiness", "material", "stockpile", "economy"],
  entries: [{ id: anchor("resources", "six"), label: "The six" }],
  Body: () => (
    <div className="compendiumStack">
      <Entry id={anchor("resources", "six")} title="The six">
        <Note>
          Four are <em>spendable stock</em> drawn from land and pops: wood, stone, food and gold. Two are <em>meters</em>
          , not stock — influence (civic weight) and happiness (public mood). Gold is the unit the bank trades in; it
          comes from pops, trade and events, never from a tile.
        </Note>
        <DefList>
          {RESOURCE_ORDER.map((resource) => (
            <DefRow
              key={resource}
              term={
                <span style={resourceCssVars(resource)} className="ruleResTerm">
                  <ResourceIcon resource={resource} className="marketRowIcon" /> {RESOURCE_LABELS[resource]}
                </span>
              }
            >
              {resource === "wood" || resource === "stone"
                ? "A building material, mined from the land by pops."
                : resource === "food"
                  ? "Feeds pops each turn; a stored surplus also calms, a shortage stirs unrest."
                  : resource === "gold"
                    ? "The coin of trade — earned by pops and events, the bank's only medium."
                    : resource === "influence"
                      ? "Civic weight: spent on demotions and calm; its great sink is the Assembly."
                      : "The public mood; negative happiness brings riots, high happiness wins a card."}
            </DefRow>
          ))}
        </DefList>
      </Entry>
    </div>
  )
};

const population: RuleChapter = {
  id: "population",
  title: "Population",
  blurb: "Citizens, freemen and slaves — what each earns, eats and needs.",
  keywords: ["pops", "citizens", "freemen", "slaves", "population", "income", "upkeep", "capacity", "class"],
  entries: [
    { id: anchor("population", "classes"), label: "The three classes" },
    { id: anchor("population", "capacity"), label: "Capacity" }
  ],
  Body: ({ G }) => (
    <div className="compendiumStack">
      <Entry id={anchor("population", "classes")} title="The three classes">
        <Note>
          Every settlement is worked by three kinds of pop. Each earns and eats a fixed amount every income, straight
          from the ruleset:
        </Note>
        <DefList>
          {(["citizens", "freemen", "slaves"] as PopType[]).map((pop) => (
            <DefRow key={pop} term={capitalize(formatPopLabel(pop, 2))}>
              <AnnotatedText text={popIncomeText(G, pop)} />
            </DefRow>
          ))}
        </DefList>
        <Note>
          Citizens make influence and gold, freemen make gold, slaves mine the tile's own material — but only on a tile
          that yields one. Every pop eats food.
        </Note>
      </Entry>
      <Entry id={anchor("population", "capacity")} title="Capacity">
        <Note>
          A settlement holds only so many pops (see <AnnotatedText text="Settlements" />). Pushing past its capacity
          costs <strong>−{G.ruleset.economy.overCapacityHappinessPerPop}</strong> happiness per pop over the line each
          turn, so an Aqueduct that raises the cap pays for itself in calm.
        </Note>
      </Entry>
    </div>
  )
};

const settlements: RuleChapter = {
  id: "settlements",
  title: "Settlements",
  blurb: "Capitals, cities and colonies — capacities and what each can do.",
  keywords: ["capital", "city", "colony", "found", "upgrade", "settlement", "capacity", "build", "metropolis"],
  entries: [
    { id: anchor("settlements", "kinds"), label: "The three kinds" },
    { id: anchor("settlements", "expansion"), label: "Founding & upgrading" }
  ],
  Body: ({ G }) => (
    <div className="compendiumStack">
      <Entry id={anchor("settlements", "kinds")} title="The three kinds">
        <ul className="compendiumCostList">
          {(["capital", "city", "colony"] as SettlementKind[]).map((kind) => {
            const rule = SETTLEMENT_RULES[kind];
            return (
              <li className="compendiumCostRow" key={kind}>
                <span className="compendiumCostLabel">{capitalize(kind)}</span>
                <span className="compendiumCostValue">{rule.popCapacity} pop cap</span>
                <span className="compendiumCostNote">
                  {rule.canBuildBuildings ? `builds (+${rule.buildingSlotBonus} slots)` : "no buildings"}
                </span>
              </li>
            );
          })}
        </ul>
        <Note>
          You begin with a capital (a metropolis of {G.ruleset.placementPopCounts.capital} pops) and one founding colony.
          Only cities and the capital may raise buildings; colonies work the land and grow.
        </Note>
      </Entry>
      <Entry id={anchor("settlements", "expansion")} title="Founding & upgrading">
        <DefList>
          <DefRow term="Found a colony">
            <AnnotatedText text={formatResourceCost(G.ruleset.actionCosts.foundColony)} /> — beside an owned settlement,
            or on any coastal tile if you hold a coast (sailing, not teleporting).
          </DefRow>
          <DefRow term="Upgrade colony → city">
            <AnnotatedText text={formatResourceCost(G.ruleset.actionCosts.upgradeColonyToCity)} /> — lifts the pop cap and
            unlocks building.
          </DefRow>
        </DefList>
      </Entry>
    </div>
  )
};

const turn: RuleChapter = {
  id: "turn",
  title: "The Turn",
  blurb: "Income, then your actions, then end — and the once-per-turn limits.",
  keywords: ["turn", "income", "actions", "end turn", "phase", "order", "verbs", "grow", "move", "build", "calm", "venture"],
  entries: [
    { id: anchor("turn", "flow"), label: "The flow" },
    { id: anchor("turn", "throttles"), label: "Per-turn limits" }
  ],
  Body: () => (
    <div className="compendiumStack">
      <Entry id={anchor("turn", "flow")} title="The flow">
        <Note>
          A turn resolves in order: <strong>income</strong> (every settlement earns and eats, food and unrest settle),
          then your <strong>actions</strong>, then <strong>End Turn</strong>. A drawn event or a riot resolves first,
          before you may act.
        </Note>
        <Note>
          The verbs are Grow, Move, Found, Upgrade, Build, Calm and Venture. Anything that targets the map — founding,
          growing, moving, promoting — is a click on the board itself.
        </Note>
      </Entry>
      <Entry id={anchor("turn", "throttles")} title="Per-turn limits">
        <Note>
          Some actions are throttled so a turn can't do everything at once: one grow per settlement, one ladder move, one
          civic calm, and one venture per turn. Founding, upgrading and building are limited only by what you can pay.
        </Note>
      </Entry>
    </div>
  )
};

const ladder: RuleChapter = {
  id: "ladder",
  title: "Growing & the Ladder",
  blurb: "Grow new pops, and promote or demote them up and down the classes.",
  keywords: ["grow", "promote", "demote", "ladder", "class", "gymnasion", "slave", "freeman", "citizen"],
  entries: [
    { id: anchor("ladder", "grow"), label: "Growing" },
    { id: anchor("ladder", "ladder"), label: "The ladder" }
  ],
  Body: ({ G }) => {
    const promotes = Object.entries(G.ruleset.ladder.promoteCosts) as Array<[PopType, Partial<typeof G.ruleset.growPopCosts.slaves>]>;
    const demotes = Object.entries(G.ruleset.ladder.demoteCosts) as Array<[PopType, Partial<typeof G.ruleset.growPopCosts.slaves>]>;
    return (
      <div className="compendiumStack">
        <Entry id={anchor("ladder", "grow")} title="Growing">
          <Note>Grow adds one new pop to a settlement — once per settlement per turn. The cost is per class:</Note>
          <DefList>
            {(Object.entries(G.ruleset.growPopCosts) as Array<[PopType, Partial<typeof G.ruleset.growPopCosts.slaves>]>).map(
              ([pop, cost]) => (
                <DefRow key={pop} term={capitalize(formatPopLabel(pop, 1))}>
                  <AnnotatedText text={formatResourceCost(cost)} />
                </DefRow>
              )
            )}
          </DefList>
        </Entry>
        <Entry id={anchor("ladder", "ladder")} title="The ladder">
          <Note>
            One ladder move per turn: promote a pop up a class, or demote it down. Promotion buys civic standing; demotion
            frees labour but can sting morale (the Gymnasion cheapens promotion in its city).
          </Note>
          <DefList>
            {promotes.map(([pop, cost]) => (
              <DefRow key={`p-${pop}`} term={`Promote ${formatPopLabel(pop, 1)}`}>
                <AnnotatedText text={formatResourceCost(cost)} />
              </DefRow>
            ))}
            {demotes.map(([pop, cost]) => {
              const penalty = G.ruleset.ladder.demoteHappinessPenalty[pop as keyof typeof G.ruleset.ladder.demoteHappinessPenalty];
              return (
                <DefRow key={`d-${pop}`} term={`Demote ${formatPopLabel(pop, 1)}`}>
                  <AnnotatedText text={formatResourceCost(cost)} />
                  {penalty ? ` · −${penalty} happiness` : ""}
                </DefRow>
              );
            })}
          </DefList>
        </Entry>
      </div>
    );
  }
};

const buildings: RuleChapter = {
  id: "buildings",
  title: "Buildings",
  blurb: "The building roster — costs, effects and level caps.",
  keywords: ["building", "buildings", "marketplace", "temple", "workshop", "granary", "forum", "aqueduct", "odeon", "villa", "gymnasion", "cost", "level"],
  entries: [{ id: anchor("buildings", "roster"), label: "The roster" }],
  Body: () => (
    <div className="compendiumStack">
      <Entry id={anchor("buildings", "roster")} title="The roster">
        <Note>Cities and the capital raise buildings into their slots. Every building's effect caps at its max level.</Note>
        <ul className="compendiumCostList">
          {BUILDINGS.map((building) => (
            <li className="compendiumCostRow" key={building.id}>
              <span className="compendiumCostLabel">{building.name}</span>
              <span className="compendiumCostValue">
                <AnnotatedText text={formatResourceCost(building.cost)} />
              </span>
              <span className="compendiumCostNote">
                <AnnotatedText text={formatBuildingEffects(building.effects)} />
                {typeof building.maxLevel === "number" ? ` · max level ${building.maxLevel}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Entry>
    </div>
  )
};

const unrest: RuleChapter = {
  id: "unrest",
  title: "Happiness & Unrest",
  blurb: "Food pressure, the calm you can buy, and the riot table.",
  keywords: ["happiness", "unrest", "riot", "revolt", "starve", "food", "shortage", "calm", "insurance", "stabilize", "bread"],
  entries: [
    { id: anchor("unrest", "pressure"), label: "Food & mood" },
    { id: anchor("unrest", "calm"), label: "Buying calm" },
    { id: anchor("unrest", "riot"), label: "The riot table" }
  ],
  Body: ({ G }) => {
    const u = G.ruleset.economy.unrest;
    const calm = G.ruleset.civicCalm;
    return (
      <div className="compendiumStack">
        <Entry id={anchor("unrest", "pressure")} title="Food & mood">
          <Note>
            Stored food calms — every {G.ruleset.economy.foodStockpileHappinessDivisor} in the granary grants +1 happiness
            at income, up to +{G.ruleset.economy.foodStockpileHappinessCap}. A shortage bites the other way:{" "}
            {u.foodDeficitTurnsToStarve} straight turns of net food at or below {u.foodDeficitThreshold} starve{" "}
            {u.foodDeficitStarvePopLoss} pop.
          </Note>
        </Entry>
        <Entry id={anchor("unrest", "calm")} title="Buying calm">
          <Note>One civic calm per turn, both worth +{calm.happiness} happiness:</Note>
          <DefList>
            <DefRow term="Stabilize Province">
              <AnnotatedText text={`${calm.influenceCost} ${RESOURCE_LABELS.influence}`} />
            </DefRow>
            <DefRow term="Bread & Circuses">
              <AnnotatedText text={`${calm.goldCost} ${RESOURCE_LABELS.gold}`} />
            </DefRow>
          </DefList>
        </Entry>
        <Entry id={anchor("unrest", "riot")} title="The riot table">
          <Note>
            At happiness ≤ {u.popLossThreshold} at your turn start, a riot rolls before income — declare insurance first
            (each once, +1 to the roll). A revolt (≤ {u.severeThreshold}) rolls at {u.severeRollModifier} and doubles pop
            losses.
          </Note>
          <p className="compendiumFlavor">{RIOT_TABLE.flavor}</p>
          <EventTableRows table={RIOT_TABLE} result={null} />
        </Entry>
      </div>
    );
  }
};

const seasons: RuleChapter = {
  id: "seasons",
  title: "Seasons & Omens",
  blurb: "The seasonal clock, the yearly omen, and the two event decks.",
  keywords: ["season", "year", "omen", "clock", "deck", "event", "seasonal", "player deck", "draw", "spring", "winter"],
  entries: [
    { id: anchor("seasons", "clock"), label: "The clock" },
    { id: anchor("seasons", "omen"), label: "The yearly omen" },
    { id: anchor("seasons", "decks"), label: "The decks" }
  ],
  Body: ({ G }) => (
    <div className="compendiumStack">
      <Entry id={anchor("seasons", "clock")} title="The clock">
        <Note>
          Time runs Spring → Summer → Autumn → Winter, four seasons a year. One seasonal card leaves the deck each season
          and never returns — when the deck runs dry the age ends, so its length is the game's length.
        </Note>
      </Entry>
      <Entry id={anchor("seasons", "omen")} title="The yearly omen">
        <p className="compendiumFlavor">{OMEN_TABLE.flavor}</p>
        <EventTableRows table={OMEN_TABLE} result={G.yearOmen?.record ?? null} />
        <Note>
          Rolled publicly by the year's opener each spring; the sign stands over every polis until the year turns.
          {G.yearOmen ? ` This year's sign: ${G.yearOmen.label}.` : ""}
        </Note>
      </Entry>
      <Entry id={anchor("seasons", "decks")} title="The decks">
        <Note>
          The <strong>seasonal deck</strong> ({countCopies(SEASONAL_EVENT_CARDS)} cards) is the shared clock; the{" "}
          <strong>player deck</strong> ({countCopies(PLAYER_EVENT_CARDS)} cards) deals you a private card each income.
          Season tags only weight the draw toward suited cards — a tendency, never a guarantee.
        </Note>
        <div className="codexCardGallery">
          {SEASONAL_EVENT_CARDS.map((card) => (
            <RulebookCard card={card} key={card.id} showSeasons />
          ))}
        </div>
        <p className="compendiumNote ruleDeckLabel">Player deck</p>
        <div className="codexCardGallery">
          {PLAYER_EVENT_CARDS.map((card) => (
            <RulebookCard card={card} key={card.id} />
          ))}
        </div>
      </Entry>
    </div>
  )
};

const bank: RuleChapter = {
  id: "bank",
  title: "The Bank",
  blurb: "This board's exchange rates and the spread you pay to trade.",
  keywords: ["bank", "trade", "market", "exchange", "rate", "sell", "buy", "gold", "spread"],
  entries: [{ id: anchor("bank", "rates"), label: "Rates" }],
  Body: ({ G }) => (
    <div className="compendiumStack">
      <Entry id={anchor("bank", "rates")} title="Rates">
        <Note>
          Gold is the unit of account — the bank never barters, and every round trip pays the spread. Rates follow this
          board's tile supply and hold all game.
        </Note>
        {TRADABLE_MATERIALS.map((material) => {
          const rate = G.bank[material];
          return (
            <div className="compendiumBankRow" key={material} style={resourceCssVars(material)}>
              <ResourceIcon resource={material} className="marketRowIcon" />
              <strong>{capitalize(material)}</strong>
              <span>
                sell {rate.sell} → 1 Gold · buy 1 for {rate.buy} Gold
              </span>
            </div>
          );
        })}
      </Entry>
    </div>
  )
};

const ventures: RuleChapter = {
  id: "ventures",
  title: "Ventures",
  blurb: "The three expeditions, their stakes, and the odds.",
  keywords: ["venture", "expedition", "merchant", "embassy", "colonists", "stake", "gamble", "dice", "risk"],
  entries: [{ id: anchor("ventures", "expeditions"), label: "Expeditions" }],
  Body: ({ G }) => (
    <div className="compendiumStack">
      <Entry id={anchor("ventures", "expeditions")} title="Expeditions">
        <Note>
          One venture per turn: post a stake — {formatResourceCost(G.ruleset.ventureStakes.gold)} or{" "}
          {formatResourceCost(G.ruleset.ventureStakes.wood)} — pick any expedition, and roll. The stake is paid win or
          lose.
        </Note>
        {EXPEDITION_TABLES.map((table) => (
          <div key={table.id} className="ruleVenture">
            <h3>{table.name}</h3>
            <p className="compendiumFlavor">{table.flavor}</p>
            <EventTableRows table={table} result={null} />
          </div>
        ))}
      </Entry>
    </div>
  )
};

const assembly: RuleChapter = {
  id: "assembly",
  title: "The Assembly",
  blurb: "The agora: politicians, resolutions, voting, and the laws that stand.",
  keywords: [
    "assembly",
    "politician",
    "politicians",
    "resolution",
    "law",
    "laws",
    "directive",
    "stele",
    "stelae",
    "vote",
    "voting",
    "ballot",
    "bribe",
    "bribery",
    "veto",
    "repeal",
    "patron",
    "patronage",
    "agora",
    "coup",
    "demosthenes",
    "perdiccas",
    "kleistophenes",
    "stratokles"
  ],
  entries: [
    { id: anchor("assembly", "when"), label: "When it convenes" },
    { id: anchor("assembly", "propose"), label: "Proposing" },
    { id: anchor("assembly", "vote"), label: "Voting" },
    { id: anchor("assembly", "laws"), label: "Laws & Directives" },
    { id: anchor("assembly", "power"), label: "Power & patrons" },
    { id: anchor("assembly", "politicians"), label: "The four politicians" }
  ],
  Body: ({ G }) => {
    const rules = G.ruleset.assembly;

    return (
      <div className="compendiumStack">
        <Entry id={anchor("assembly", "when")} title="When it convenes">
          <Note>
            The Assembly meets every spring from Year <strong>{rules.firstYear}</strong>, before the year's opener takes
            their turn. Nothing else happens while it sits — the whole table proposes and votes, then play resumes.
          </Note>
          <Note>
            This is what <AnnotatedText text="Influence" /> is for. Everything the Assembly asks of you — drawing,
            proposing, bribing, vetoing, repealing — is paid in influence, and nothing else in the game spends it at
            this scale.
          </Note>
        </Entry>

        <Entry id={anchor("assembly", "propose")} title="Proposing">
          <Note>
            One house resolution drops onto the ballot on its own. Then, in <em>reverse</em> turn order, each player may
            put one more there.
          </Note>
          <DefList>
            <DefRow term="Draw">
              Pay <strong>{rules.drawCost}</strong> influence to draw from a politician <em>you choose</em>. The
              politician is your pick; the card is not. You see it in secret.
            </DefRow>
            <DefRow term="Fish again">
              Set the card aside and draw another for <strong>{rules.redrawCost}</strong> influence, as often as you can
              afford.
            </DefRow>
            <DefRow term="Propose">
              Lay the card on the bema for everyone to see. One card per player per assembly.
            </DefRow>
            <DefRow term="Repeal">
              For <strong>{rules.repealCost}</strong> influence, move to strike a standing Law instead. It is voted like
              any other resolution — undoing a law is as political as passing one.
            </DefRow>
            <DefRow term="Pass">Say nothing. Always available, whatever your influence.</DefRow>
          </DefList>
        </Entry>

        <Entry id={anchor("assembly", "vote")} title="Voting">
          <Note>
            The ballot is voted one resolution at a time, in turn order, <strong>openly</strong> — every vote is visible
            as it lands, so the last seat to speak on a close card is a kingmaker.
          </Note>
          <DefList>
            <DefRow term="Your votes">
              One per <AnnotatedText text="citizen" /> you hold. Nothing else on the board grants a vote.
            </DefRow>
            <DefRow term="Majority">
              More yea than nay carries. {rules.tiesPass ? "A tie carries." : "A tie fails."}
            </DefRow>
            <DefRow term="Bribe">
              <strong>{rules.briberyCost}</strong> influence buys one extra vote, up to{" "}
              <strong>{rules.briberyCap}</strong> per player per assembly. The cap is what stops a hoard from simply
              buying the outcome.
            </DefRow>
            <DefRow term="Veto">
              <strong>{rules.vetoCost}</strong> influence strikes the resolution outright,{" "}
              {rules.vetoesPerAssembly === 1 ? "once" : `${rules.vetoesPerAssembly} times`} per assembly. It costs you
              your own vote on it.
            </DefRow>
          </DefList>
        </Entry>

        <Entry id={anchor("assembly", "laws")} title="Laws & Directives">
          <Note>
            A resolution is not a one-year buff — it changes how the game is played. Three of the four politicians deal
            in <strong>Laws</strong>: table-wide rules that stand until repealed, each carrying a trade-off, so a vote
            is a referendum on which strategy the table backs.
          </Note>
          <Note>
            The fourth, Stratokles, deals in <strong>Directives</strong>: one-time upheavals that hit everyone at once
            and then leave a permanent monument on his stack.
          </Note>
          <DefList>
            <DefRow term="The cap">
              <strong>{rules.lawCap}</strong> Laws may stand at once. At the cap, a new Law must name the one it
              replaces. Stratokles's monuments take no slot — they are not rules.
            </DefRow>
            <DefRow term="Uniqueness">A Law already standing cannot be enacted again.</DefRow>
            <DefRow term="Removal">Only a repeal, or a replacement at the cap, takes a Law off the board.</DefRow>
          </DefList>
        </Entry>

        <Entry id={anchor("assembly", "power")} title="Power & patrons">
          <Note>
            Nothing here is tracked — it is all read off the board. A politician's <strong>power</strong> is the number
            of their stelae standing; their <strong>patron</strong> is whoever authored the most of them. A tie leaves
            them unpatroned.
          </Note>
          <DefList>
            <DefRow term="Dominance">
              At <strong>{rules.dominanceThreshold}</strong> stelae the patron gains that politician's standing buff.
            </DefRow>
            <DefRow term="Voice of the Assembly">
              A sixth <AnnotatedText text="victory" /> card, held by whoever is patron of the most politicians —
              minimum <strong>{G.ruleset.victory.minimums.voice}</strong>. Like the other five it recomputes every turn
              and can change hands.
            </DefRow>
            <DefRow term="The coup">
              Stratokles's monuments never repeal, so his track only rises. If he leads the agora with{" "}
              <strong>{rules.coupThreshold}</strong> monuments, he seizes the city and <em>his patron wins the game</em>
              . The only brake is voting his Directives down.
            </DefRow>
          </DefList>
        </Entry>

        <Entry id={anchor("assembly", "politicians")} title="The four politicians">
          <div className="ruleDefList">
            {POLITICIANS.map((politician) => {
              const deck = RESOLUTION_DECKS[politician.id];

              return (
                <div className="rulePolitician" key={politician.id}>
                  <h3>
                    {politician.name}
                    <em>{politician.epithet}</em>
                  </h3>
                  <p className="compendiumFlavor">{politician.creed}</p>
                  <Note>
                    {deck.length} {politician.kind === "law" ? "Laws" : "Directives"} · patron's buff:{" "}
                    <strong>{politician.patronBuff.label}</strong>
                  </Note>
                  <ul className="ruleCardList">
                    {deck.map((card) => (
                      <li key={card.id}>
                        <strong>{card.name}</strong>
                        <span>
                          <AnnotatedText text={card.text} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Entry>
      </div>
    );
  }
};

/** A card in the rulebook's deck gallery: painted face + name + copies + effect. */
function RulebookCard({ card, showSeasons = false }: { card: EventCard; showSeasons?: boolean }) {
  return (
    <figure className="codexGalleryCard">
      <img alt="" className="codexGalleryArt" loading="lazy" src={eventCardArtUrl(card)} />
      <figcaption>
        <strong>
          {card.name}
          {card.count > 1 ? <em className="ruleDim"> ×{card.count}</em> : null}
        </strong>
        {showSeasons && card.seasons && card.seasons.length > 0 ? (
          <span className="codexGallerySeasons">{card.seasons.map(capitalize).join(" · ")}</span>
        ) : null}
        <span className="codexGalleryText">
          <AnnotatedText text={card.text} />
        </span>
      </figcaption>
    </figure>
  );
}

function countCopies(deck: EventCard[]) {
  return deck.reduce((sum, card) => sum + card.count, 0);
}

/** The rulebook, in learn-order: win-condition first, then the board and its pieces,
 *  then the turn and everything you do in it, then the drama (unrest, seasons, luck). */
export const RULEBOOK: RuleChapter[] = [
  victory,
  board,
  resources,
  population,
  settlements,
  turn,
  ladder,
  buildings,
  unrest,
  seasons,
  bank,
  ventures,
  // Last in learn-order: the Assembly reshapes every rule above it, so it only makes
  // sense once you know what it is reshaping.
  assembly
];
