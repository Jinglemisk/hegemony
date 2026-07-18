import { useEffect, useMemo, useRef, useState } from "react";
import { BUILDINGS, EXPEDITION_TABLES, OMEN_TABLE, PLAYER_EVENT_CARDS, RIOT_TABLE, SEASONAL_EVENT_CARDS } from "../../../game/data";
import { TRADABLE_MATERIALS } from "../../../game/rules";
import type { EventCard, EventTableDefinition, HegemonyState, PopType } from "../../../game/types";
import { RESOURCE_LABELS, formatBuildingEffects, formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { resourceCssVars } from "../../../ui/resourceVisuals";
import { AnnotatedText } from "../../AnnotatedText";
import { ResourceIcon } from "../../Sprites";
import { eventCardArtUrl } from "../events";
import { capitalize } from "../helpers";
import { EventTableRows } from "../modals/EventTableModal";

/**
 * The codex (Q18): every rule reference a player might want mid-game, in one
 * read-only surface. It is a ledger page like any other — reached from its rail
 * disc, titled and closed by the ledger card — not a modal, because reading the
 * rules should never take the board away from you. Nothing here is hand-written:
 * every section renders FROM the ruleset / content data it documents, so the
 * codex can never disagree with the engine.
 *
 * Navigation (2026-07-19): a section has many sub-entries and the panel is a
 * narrow scroll, so the header carries TWO tiers — the section chips, then a
 * sticky "jump" strip of the active section's sub-entries. A scroll-spy keeps the
 * strip's active chip in step with what you're reading; clicking one scrolls it
 * to just under the sticky header. Both tiers derive from the SAME data the body
 * renders, so the outline can never list an entry the body doesn't show.
 */

// Victory has its own consult tab now (two-panel.md), so it is NOT a codex section —
// the codex is rules reference, not a live standings readout. A victory *rules* entry
// returns when the whole-rules plan lands (docs/feat/codex-rules.md).
const SECTIONS = [
  { id: "tables", label: "Dice Tables" },
  { id: "bank", label: "Bank" },
  { id: "decks", label: "Decks" },
  { id: "costs", label: "Costs" }
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** One jumpable sub-entry: a stable anchor id + the short label the nav strip shows. */
type NavEntry = { id: string; label: string };

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Anchor builders — the ONE place each section's entry ids are minted, so the nav
// strip and the body article always agree. Change a label here and both move together.
const tableAnchor = (table: EventTableDefinition) => `codex-tables-${slug(table.name)}`;
const deckAnchor = (which: "seasonal" | "player") => `codex-decks-${which}`;
const costAnchor = (key: string) => `codex-costs-${key}`;

// Cost groups, declared once: the body renders each group by key, the nav lists them.
const COST_GROUPS = {
  expansion: "Expansion",
  grow: "Grow a pop (once per settlement per turn)",
  buildings: "Buildings (cities only)",
  ladder: "Social ladder (one move per turn)",
  civic: "Civic calm (one per turn)",
  ventures: "Venture stakes (one venture per turn)",
  insurance: "Riot insurance (each once per riot, +1 to the roll)"
} as const;

const COST_NAV: Array<{ key: keyof typeof COST_GROUPS; label: string }> = [
  { key: "expansion", label: "Expansion" },
  { key: "grow", label: "Grow pops" },
  { key: "buildings", label: "Buildings" },
  { key: "ladder", label: "Social ladder" },
  { key: "civic", label: "Civic calm" },
  { key: "ventures", label: "Ventures" },
  { key: "insurance", label: "Riot insurance" }
];

/** The sub-entries of one section, in render order. Bank is a single flat list, so
 *  it has no sub-nav. Everything else comes from the same arrays the body maps. */
function sectionEntries(section: SectionId): NavEntry[] {
  switch (section) {
    case "tables":
      return [OMEN_TABLE, RIOT_TABLE, ...EXPEDITION_TABLES].map((table) => ({
        id: tableAnchor(table),
        label: table.name
      }));
    case "decks":
      return [
        { id: deckAnchor("seasonal"), label: "Seasonal" },
        { id: deckAnchor("player"), label: "Player" }
      ];
    case "costs":
      return COST_NAV.map(({ key, label }) => ({ id: costAnchor(key), label }));
    case "bank":
    default:
      return [];
  }
}

/** Scroll-spy + jump for the active section's sub-entries, scoped to the consult
 *  panel's own scroll container (`.intelBody`) so it never fights the page. The spy
 *  marks the heading you've most recently scrolled under the sticky nav; at the very
 *  bottom it pins the last entry (a short final section can't reach the top). A click
 *  suppresses the spy briefly so the target you jumped to stays lit until you scroll. */
function useCodexNav(section: SectionId, entries: NavEntry[]) {
  const navRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollParent = () => navRef.current?.closest(".intelBody") as HTMLElement | null;
  const stickyOffset = () => (navRef.current?.offsetHeight ?? 0) + 8;

  // A fresh section starts read from the top.
  useEffect(() => {
    setActiveId(entries[0]?.id ?? null);
  }, [section, entries]);

  useEffect(() => {
    const root = scrollParent();
    if (!root || entries.length < 2) {
      return;
    }

    const sync = () => {
      const nav = navRef.current;
      if (jumpingRef.current || !nav) {
        return;
      }

      // Bottomed out: the final (short) section can't climb to the top, so pin it.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        setActiveId(entries[entries.length - 1].id);
        return;
      }

      const navBottom = nav.getBoundingClientRect().bottom;
      let current = entries[0].id;
      for (const entry of entries) {
        const element = document.getElementById(entry.id);
        if (!element) {
          continue;
        }
        if (element.getBoundingClientRect().top - navBottom <= 4) {
          current = entry.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    // A real user scroll re-engages the spy immediately (cancels a click's grace window).
    const releaseJump = () => {
      jumpingRef.current = false;
    };

    sync();
    root.addEventListener("scroll", sync, { passive: true });
    root.addEventListener("wheel", releaseJump, { passive: true });
    root.addEventListener("touchmove", releaseJump, { passive: true });
    return () => {
      root.removeEventListener("scroll", sync);
      root.removeEventListener("wheel", releaseJump);
      root.removeEventListener("touchmove", releaseJump);
    };
  }, [section, entries]);

  const jumpTo = (id: string) => {
    const root = scrollParent();
    const target = document.getElementById(id);
    if (!root || !target) {
      return;
    }

    jumpingRef.current = true;
    setActiveId(id);
    const top = root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - stickyOffset();
    root.scrollTo({ top, behavior: "smooth" });
    window.setTimeout(() => {
      jumpingRef.current = false;
    }, 700);
  };

  return { navRef, activeId, jumpTo };
}

export function CodexTab({ G }: { G: HegemonyState }) {
  const [section, setSection] = useState<SectionId>("tables");
  const entries = useMemo(() => sectionEntries(section), [section]);
  const { navRef, activeId, jumpTo } = useCodexNav(section, entries);

  return (
    <>
      <p className="codexLede">The table's open book — rules, rates, and decks as this board plays them.</p>

      <div className="codexNav" ref={navRef}>
        <nav className="compendiumTabs" aria-label="Codex sections">
          {SECTIONS.map((candidate) => (
            <button
              className={candidate.id === section ? "compendiumTab compendiumTabActive" : "compendiumTab"}
              key={candidate.id}
              onClick={() => setSection(candidate.id)}
              type="button"
            >
              {candidate.label}
            </button>
          ))}
        </nav>

        {entries.length > 0 ? (
          <nav className="codexJump" aria-label={`${SECTIONS.find((s) => s.id === section)?.label} contents`}>
            {entries.map((entry) => (
              <button
                className={entry.id === activeId ? "codexJumpLink codexJumpLinkActive" : "codexJumpLink"}
                key={entry.id}
                onClick={() => jumpTo(entry.id)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="compendiumBody">
        {section === "tables" ? <TablesSection G={G} /> : null}
        {section === "bank" ? <BankSection G={G} /> : null}
        {section === "decks" ? <DecksSection /> : null}
        {section === "costs" ? <CostsSection G={G} /> : null}
      </div>
    </>
  );
}

/** Every dice table in the game, through the same render path the live modals use.
 *  Longest-standing first: the omen (with this year's landed sign highlighted),
 *  then the riot, then the expeditions. */
function TablesSection({ G }: { G: HegemonyState }) {
  return (
    <div className="compendiumStack">
      <article className="compendiumEntry" id={tableAnchor(OMEN_TABLE)}>
        <h3>{OMEN_TABLE.name}</h3>
        <p className="compendiumFlavor">{OMEN_TABLE.flavor}</p>
        <EventTableRows table={OMEN_TABLE} result={G.yearOmen?.record ?? null} />
        <p className="compendiumNote">
          Rolled publicly by the year's opener each spring; the sign stands over every polis until the year turns.
          {G.yearOmen ? ` This year's sign: ${G.yearOmen.label}.` : ""}
        </p>
      </article>

      <article className="compendiumEntry" id={tableAnchor(RIOT_TABLE)}>
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
        <article className="compendiumEntry" key={table.id} id={tableAnchor(table)}>
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

/** Both decks by their painted faces — the card art, its name, how many copies ride
 *  the deck, and the effect. Composition only, never draw order. */
function DecksSection() {
  return (
    <div className="compendiumStack">
      <article className="compendiumEntry" id={deckAnchor("seasonal")}>
        <h3>Seasonal deck · {countCopies(SEASONAL_EVENT_CARDS)} cards, the game clock</h3>
        <p className="compendiumNote">
          One card leaves the deck each season and never returns. Season tags weight the draw toward suited cards — a
          tendency, never a guarantee.
        </p>
        <div className="codexCardGrid">
          {SEASONAL_EVENT_CARDS.map((card) => (
            <CodexCard card={card} key={card.id} showSeasons />
          ))}
        </div>
      </article>

      <article className="compendiumEntry" id={deckAnchor("player")}>
        <h3>Player deck · {countCopies(PLAYER_EVENT_CARDS)} cards, drawn every income</h3>
        <p className="compendiumNote">Aggregate composition only — the shuffle keeps its secrets.</p>
        <div className="codexCardGrid">
          {PLAYER_EVENT_CARDS.map((card) => (
            <CodexCard card={card} key={card.id} />
          ))}
        </div>
      </article>
    </div>
  );
}

/** One card in the deck grid: its painted face, a stack badge for copies, then the
 *  name, season tags, and effect text — the art alone carries no rules. */
function CodexCard({ card, showSeasons = false }: { card: EventCard; showSeasons?: boolean }) {
  return (
    <figure className="codexCard">
      <div className="codexCardArt">
        <img alt="" className="codexCardImage" loading="lazy" src={eventCardArtUrl(card)} />
        {card.count > 1 ? <span className="codexCardCount">×{card.count}</span> : null}
      </div>
      <figcaption className="codexCardCaption">
        <strong className="codexCardName">{card.name}</strong>
        {showSeasons && card.seasons && card.seasons.length > 0 ? (
          <span className="codexCardSeasons">{card.seasons.map(capitalize).join(" · ")}</span>
        ) : null}
        <span className="codexCardText">
          <AnnotatedText text={card.text} />
        </span>
      </figcaption>
    </figure>
  );
}

/** Every price in the game, straight from the ruleset. */
function CostsSection({ G }: { G: HegemonyState }) {
  const { ruleset } = G;
  const ladderPromotes = Object.entries(ruleset.ladder.promoteCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>;
  const ladderDemotes = Object.entries(ruleset.ladder.demoteCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>;

  return (
    <div className="compendiumStack">
      <CostGroup id={costAnchor("expansion")} title={COST_GROUPS.expansion}>
        <CostRow label="Found colony" cost={formatResourceCost(ruleset.actionCosts.foundColony)} />
        <CostRow label="Upgrade colony to city" cost={formatResourceCost(ruleset.actionCosts.upgradeColonyToCity)} />
      </CostGroup>

      <CostGroup id={costAnchor("grow")} title={COST_GROUPS.grow}>
        {(Object.entries(ruleset.growPopCosts) as Array<[PopType, Partial<typeof ruleset.growPopCosts.slaves>]>).map(
          ([pop, cost]) => (
            <CostRow key={pop} label={capitalize(formatPopLabel(pop, 1))} cost={formatResourceCost(cost)} />
          )
        )}
      </CostGroup>

      <CostGroup id={costAnchor("buildings")} title={COST_GROUPS.buildings}>
        {BUILDINGS.map((building) => (
          <CostRow
            key={building.id}
            label={building.name}
            cost={formatResourceCost(building.cost)}
            note={formatBuildingEffects(building.effects)}
          />
        ))}
      </CostGroup>

      <CostGroup id={costAnchor("ladder")} title={COST_GROUPS.ladder}>
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

      <CostGroup id={costAnchor("civic")} title={COST_GROUPS.civic}>
        <CostRow label="Stabilize Province" cost={`${ruleset.civicCalm.influenceCost} ${RESOURCE_LABELS.influence}`} note={`+${ruleset.civicCalm.happiness} Happiness`} />
        <CostRow label="Bread & Circuses" cost={`${ruleset.civicCalm.goldCost} ${RESOURCE_LABELS.gold}`} note={`+${ruleset.civicCalm.happiness} Happiness`} />
      </CostGroup>

      <CostGroup id={costAnchor("ventures")} title={COST_GROUPS.ventures}>
        {(Object.entries(ruleset.ventureStakes) as Array<[string, Partial<typeof ruleset.growPopCosts.slaves>]>).map(
          ([stake, cost]) => (
            <CostRow key={stake} label={`${capitalize(stake)} stake`} cost={formatResourceCost(cost)} />
          )
        )}
      </CostGroup>

      <CostGroup id={costAnchor("insurance")} title={COST_GROUPS.insurance}>
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

function CostGroup({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <article className="compendiumEntry" id={id}>
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
