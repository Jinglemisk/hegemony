import { useState } from "react";
import { BUILDINGS, EXPEDITION_TABLES, OMEN_TABLE, PLAYER_EVENT_CARDS, RIOT_TABLE, SEASONAL_EVENT_CARDS } from "../../../game/data";
import { TRADABLE_MATERIALS } from "../../../game/rules";
import type { EventCard, HegemonyState, PlayerId, PopType } from "../../../game/types";
import { RESOURCE_LABELS, formatBuildingEffects, formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { resourceCssVars } from "../../../ui/resourceVisuals";
import { AnnotatedText } from "../../AnnotatedText";
import { ResourceIcon } from "../../Sprites";
import { VictoryTab } from "../ledger/VictoryTab";
import { capitalize } from "../helpers";
import { EventTableRows } from "./EventTableModal";

/**
 * The compendium (Q18): every rule reference a player might want mid-game, in one
 * read-only surface — opened from the season dial or the `?` key. Nothing here is
 * hand-written: every section renders FROM the ruleset / content data it documents,
 * so the compendium can never disagree with the engine.
 */

const SECTIONS = [
  { id: "victory", label: "Victory" },
  { id: "tables", label: "Dice Tables" },
  { id: "bank", label: "Bank" },
  { id: "decks", label: "Decks" },
  { id: "costs", label: "Costs" }
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function CompendiumModal({ G, playerID, onClose }: { G: HegemonyState; playerID: PlayerId; onClose: () => void }) {
  const [section, setSection] = useState<SectionId>("victory");

  return (
    <div className="modalBackdrop eventModalBackdrop" role="presentation" onClick={onClose}>
      <section
        className="compendiumModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compendium-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="compendiumHeader">
          <h2 id="compendium-title">Compendium</h2>
          <p>The table's open book — rules, rates, and decks as this board plays them.</p>
          <button className="ghostButton compendiumClose" onClick={onClose} aria-label="Close compendium">
            ✕
          </button>
        </header>

        <nav className="compendiumTabs" aria-label="Compendium sections">
          {SECTIONS.map((candidate) => (
            <button
              className={candidate.id === section ? "compendiumTab compendiumTabActive" : "compendiumTab"}
              key={candidate.id}
              onClick={() => setSection(candidate.id)}
            >
              {candidate.label}
            </button>
          ))}
        </nav>

        <div className="compendiumBody">
          {section === "victory" ? <VictoryTab G={G} playerID={playerID} /> : null}
          {section === "tables" ? <TablesSection G={G} /> : null}
          {section === "bank" ? <BankSection G={G} /> : null}
          {section === "decks" ? <DecksSection /> : null}
          {section === "costs" ? <CostsSection G={G} /> : null}
        </div>
      </section>
    </div>
  );
}

/** Every dice table in the game, through the same render path the live modals use.
 *  Longest-standing first: the omen (with this year's landed sign highlighted),
 *  then the riot, then the expeditions. */
function TablesSection({ G }: { G: HegemonyState }) {
  return (
    <div className="compendiumStack">
      <article className="compendiumEntry">
        <h3>{OMEN_TABLE.name}</h3>
        <p className="compendiumFlavor">{OMEN_TABLE.flavor}</p>
        <EventTableRows table={OMEN_TABLE} result={G.yearOmen?.record ?? null} />
        <p className="compendiumNote">
          Rolled publicly by the year's opener each spring; the sign stands over every polis until the year turns.
          {G.yearOmen ? ` This year's sign: ${G.yearOmen.label}.` : ""}
        </p>
      </article>

      <article className="compendiumEntry">
        <h3>{RIOT_TABLE.name}</h3>
        <p className="compendiumFlavor">{RIOT_TABLE.flavor}</p>
        <EventTableRows table={RIOT_TABLE} result={null} />
        <p className="compendiumNote">
          Rolls at happiness ≤ −5 at your turn start, before income. Declare insurance first — each once, +1 to the
          roll:{" "}
          {(RIOT_TABLE.insurance ?? [])
            .map((option) => `${option.label} (${option.demotesPop ? "demote 1 pop" : formatResourceCost(option.cost)})`)
            .join(" · ")}
          . A revolt (≤ −10) rolls at −2 and doubles pop losses.
        </p>
      </article>

      {EXPEDITION_TABLES.map((table) => (
        <article className="compendiumEntry" key={table.id}>
          <h3>{table.name}</h3>
          <p className="compendiumFlavor">{table.flavor}</p>
          <EventTableRows table={table} result={null} />
        </article>
      ))}

      <p className="compendiumNote">
        Ventures: one per turn, stake paid win or lose — post gold or wood (see Costs) and pick any expedition.
      </p>
    </div>
  );
}

/** This board's bank rates — derived once from its tile counts, static all game. */
function BankSection({ G }: { G: HegemonyState }) {
  return (
    <div className="compendiumStack">
      <p className="compendiumNote">
        Gold is the unit of account — the bank never barters, and every round trip pays the spread. Rates follow this
        board's tile supply and hold all game.
      </p>
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
    </div>
  );
}

/** Both decks as aggregate composition — counts and effects, never draw order. */
function DecksSection() {
  return (
    <div className="compendiumStack">
      <article className="compendiumEntry">
        <h3>Seasonal deck · {countCopies(SEASONAL_EVENT_CARDS)} cards, the game clock</h3>
        <p className="compendiumNote">
          One card leaves the deck each season and never returns. Season tags weight the draw toward suited cards — a
          tendency, never a guarantee.
        </p>
        <ul className="compendiumCardList">
          {SEASONAL_EVENT_CARDS.map((card) => (
            <CardRow card={card} key={card.id} showSeasons />
          ))}
        </ul>
      </article>

      <article className="compendiumEntry">
        <h3>Player deck · {countCopies(PLAYER_EVENT_CARDS)} cards, drawn every income</h3>
        <p className="compendiumNote">Aggregate composition only — the shuffle keeps its secrets.</p>
        <ul className="compendiumCardList">
          {PLAYER_EVENT_CARDS.map((card) => (
            <CardRow card={card} key={card.id} />
          ))}
        </ul>
      </article>
    </div>
  );
}

function CardRow({ card, showSeasons = false }: { card: EventCard; showSeasons?: boolean }) {
  return (
    <li className="compendiumCardRow">
      <span className="compendiumCardName">
        <strong>{card.name}</strong>
        <em>×{card.count}</em>
        {showSeasons && card.seasons && card.seasons.length > 0 ? (
          <span className="compendiumSeasons">{card.seasons.map(capitalize).join(" · ")}</span>
        ) : null}
      </span>
      <span className="compendiumCardText">
        <AnnotatedText text={card.text} />
      </span>
    </li>
  );
}

/** Every price in the game, straight from the ruleset. */
function CostsSection({ G }: { G: HegemonyState }) {
  const { ruleset } = G;
  const ladderPromotes = Object.entries(ruleset.ladder.promoteCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>;
  const ladderDemotes = Object.entries(ruleset.ladder.demoteCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>;

  return (
    <div className="compendiumStack">
      <CostGroup title="Expansion">
        <CostRow label="Found colony" cost={formatResourceCost(ruleset.actionCosts.foundColony)} />
        <CostRow label="Upgrade colony to city" cost={formatResourceCost(ruleset.actionCosts.upgradeColonyToCity)} />
      </CostGroup>

      <CostGroup title="Grow a pop (once per settlement per turn)">
        {(Object.entries(ruleset.growPopCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>).map(
          ([pop, cost]) => (
            <CostRow key={pop} label={capitalize(formatPopLabel(pop, 1))} cost={formatResourceCost(cost)} />
          )
        )}
      </CostGroup>

      <CostGroup title="Buildings (cities only)">
        {BUILDINGS.map((building) => (
          <CostRow
            key={building.id}
            label={building.name}
            cost={formatResourceCost(building.cost)}
            note={formatBuildingEffects(building.effects)}
          />
        ))}
      </CostGroup>

      <CostGroup title="Social ladder (one move per turn)">
        {ladderPromotes.map(([pop, cost]) => (
          <CostRow key={`p-${pop}`} label={`Promote ${formatPopLabel(pop, 1)}`} cost={formatResourceCost(cost)} />
        ))}
        {ladderDemotes.map(([pop, cost]) => (
          <CostRow
            key={`d-${pop}`}
            label={`Demote ${formatPopLabel(pop, 1)}`}
            cost={formatResourceCost(cost)}
            note={
              ruleset.ladder.demoteHappinessPenalty[pop as keyof typeof ruleset.ladder.demoteHappinessPenalty]
                ? `−${ruleset.ladder.demoteHappinessPenalty[pop as keyof typeof ruleset.ladder.demoteHappinessPenalty]} Happiness`
                : undefined
            }
          />
        ))}
      </CostGroup>

      <CostGroup title="Civic calm (one per turn)">
        <CostRow label="Stabilize Province" cost={`${ruleset.civicCalm.influenceCost} ${RESOURCE_LABELS.influence}`} note={`+${ruleset.civicCalm.happiness} Happiness`} />
        <CostRow label="Bread & Circuses" cost={`${ruleset.civicCalm.goldCost} ${RESOURCE_LABELS.gold}`} note={`+${ruleset.civicCalm.happiness} Happiness`} />
      </CostGroup>

      <CostGroup title="Venture stakes (one venture per turn)">
        {(Object.entries(ruleset.ventureStakes) as Array<[string, Partial<typeof ruleset.growPopCosts.slaves>]>).map(
          ([stake, cost]) => (
            <CostRow key={stake} label={`${capitalize(stake)} stake`} cost={formatResourceCost(cost)} />
          )
        )}
      </CostGroup>

      <CostGroup title="Riot insurance (each once per riot, +1 to the roll)">
        {(RIOT_TABLE.insurance ?? []).map((option) => (
          <CostRow
            key={option.id}
            label={option.label}
            cost={option.demotesPop ? "Demote 1 pop (free)" : formatResourceCost(option.cost)}
          />
        ))}
      </CostGroup>
    </div>
  );
}

function CostGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="compendiumEntry">
      <h3>{title}</h3>
      <ul className="compendiumCostList">{children}</ul>
    </article>
  );
}

function CostRow({ label, cost, note }: { label: string; cost: string; note?: string }) {
  return (
    <li className="compendiumCostRow">
      <span className="compendiumCostLabel">{label}</span>
      <span className="compendiumCostValue">
        <AnnotatedText text={cost} />
      </span>
      {note ? (
        <span className="compendiumCostNote">
          <AnnotatedText text={note} />
        </span>
      ) : null}
    </li>
  );
}

function countCopies(deck: EventCard[]) {
  return deck.reduce((sum, card) => sum + card.count, 0);
}
