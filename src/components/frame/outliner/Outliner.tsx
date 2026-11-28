import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { PLAYER_IDS } from "../../../game/data";
import {
  buildingGround,
  currentVoteWeight,
  getResolutionCard,
  luxuryName,
  nextAssemblyYear,
  portClaimSites,
  settlementCapacity,
  totalPops,
} from "../../../game/rules";
import { dealsAwaitingAnswer, dealsOf, isClosedDeal, loanOf, partnerIn } from "../../../game/deals";
import type { PlayerId, SettlementKind } from "../../../game/types";
import { turnsUntilYear } from "../../../ui/frameSelectors";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { Knob, Plaque } from "../../chrome/controls";
import { Panel } from "../../chrome/Panel";
import { SeatCoin } from "../../chrome/SeatCoin";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { bundleWords, dealTitle, dealWords, loanWords, offerTitle } from "../trade/tradeView";
import { titleCase } from "../../left/words";
import { Ico, Tip, TipBody } from "../parts";
import { loadOutliner, saveOutliner } from "./settings";
import type { OutlinerSection, OutlinerSettings, OutlinerSort } from "./settings";

const KIND: Record<SettlementKind, string> = {
  capital: "Metropolis",
  city: "City",
  colony: "Colony",
};

const SECTION_NAMES: Record<OutlinerSection, string> = {
  settle: "Your settlements",
  trade: "Trade",
  assembly: "The Assembly",
  rivals: "Rivals’ settlements",
};

const SORT_NAMES: Record<OutlinerSort, string> = {
  needs: "Needs you",
  people: "People",
  az: "A–Z",
};

/** One row: an icon or a seat's coin, a name, a figure; the detail sentence is its tooltip. */
type Row = {
  key: string;
  icon?: string;
  coin?: PlayerId;
  name: string;
  /** A settlement's name, set in capitals by the stylesheet (the DOM keeps "Sikyon"). */
  place?: boolean;
  /** The figure at the right: people over room, a count, a coin. */
  figure?: ReactNode;
  /** What the figure says, for the row's accessible name. */
  figureWords?: string;
  detail: string;
  /** Needs the seat: an ochre mark, and first in "needs you" order. */
  needs?: boolean;
  selected?: boolean;
  onPress: () => void;
};

/**
 * The outliner: a fixed glaze column down the right edge from under the top bar to the
 * dock, as in Imperator, but short. Its sections fold; the gear chooses which show and
 * how your places sort; the dash tucks it up to its head, which stays where it was, as
 * wide and with the same words and knobs. Nothing else changes the column's size, and no
 * header changes its words whatever is folded, open or tucked. Every
 * row reads the engine's own selectors and picks the place, opens a card, or opens the
 * Agora.
 */
export function Outliner({
  selectedTileId,
  onPickTile,
  onPickMooring,
  onOpenDrawer,
}: {
  selectedTileId: string | null;
  /** Pick a tile, as a click on it does. */
  onPickTile: (tileId: string) => void;
  /** Pick a luxury good's mooring, as a click on its raft does. */
  onPickMooring: (vertexId: string) => void;
  /** Open a realm drawer (the Agora). */
  onOpenDrawer: (drawer: "agora") => void;
}) {
  const [settings, setSettingsState] = useState(loadOutliner);
  const setSettings = (next: OutlinerSettings) => {
    setSettingsState(next);
    saveOutliner(next);
  };
  const [cfgOpen, setCfgOpen] = useState(false);
  const gear = useRef<HTMLButtonElement>(null);
  const sections = useSections(selectedTileId, settings.sort, {
    onPickTile,
    onPickMooring,
    onOpenDrawer,
  });

  const { tucked } = settings;
  const shown = (Object.keys(SECTION_NAMES) as OutlinerSection[]).filter(
    (key) => settings.show[key],
  );

  return (
    <Panel
      aria-label="Outliner"
      className={`rd-outl${tucked ? " is-tucked" : ""}`}
      data-c="outliner"
      data-exclude
      role="complementary"
      tone="glaze"
    >
      <header className="rd-outl-head">
        <h2 className="rd-outl-title">Outliner</h2>
        <Tooltip content={<Tip title="Outliner settings" />} triggerClassName="rd-knob-tip">
          <Knob
            aria-expanded={cfgOpen}
            aria-haspopup="dialog"
            label="Outliner settings"
            onClick={() => setCfgOpen((value) => !value)}
            ref={gear}
          >
            <Ico path="chrome/settings" size="chip" />
          </Knob>
        </Tooltip>
        {/* One knob, tucking and showing: it stays put, so the focus stays on it. */}
        <Tooltip
          content={<Tip title={tucked ? "Bring the outliner back" : "Tuck it away"} />}
          triggerClassName="rd-knob-tip"
        >
          <Knob
            label={tucked ? "Show the outliner" : "Tuck the outliner away"}
            onClick={() => {
              setCfgOpen(false);
              setSettings({ ...settings, tucked: !tucked });
            }}
          >
            <span aria-hidden="true">{tucked ? "▾" : "—"}</span>
          </Knob>
        </Tooltip>
      </header>
      {tucked ? null : (
        <div className="rd-outl-body ch-scroll-fade">
          {shown.length === 0 ? (
            <p className="rd-outl-empty">Nothing chosen to show. The gear chooses.</p>
          ) : null}
          {shown.map((key) => {
            const section = sections[key];
            const shut = settings.shut[key];
            return (
              <section aria-label={SECTION_NAMES[key]} className="rd-sec" key={key}>
                <h3 className="rd-sec-h">
                  <button
                    aria-expanded={!shut}
                    className="rd-sec-head"
                    onClick={() =>
                      setSettings({ ...settings, shut: { ...settings.shut, [key]: !shut } })
                    }
                    type="button"
                  >
                    <span aria-hidden="true" className="rd-sec-caret" />
                    <span className="rd-sec-name">{SECTION_NAMES[key]}</span>
                    <span className={`rd-sec-end${/^\d+$/.test(section.end) ? " is-count" : ""}`}>
                      {section.end}
                    </span>
                  </button>
                </h3>
                {shut ? null : section.rows.length === 0 ? (
                  <p className="rd-outl-empty">{section.empty}</p>
                ) : (
                  <ul className="rd-rows">
                    {section.rows.map((row) => (
                      <OutlinerRow key={row.key} row={row} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      {cfgOpen ? (
        <Popover
          anchor={gear}
          ariaLabel="Outliner settings"
          className="rd-ocfg"
          dismissOnOutside
          onDismiss={() => setCfgOpen(false)}
          preferredPlacement="below"
        >
          <p className="rd-ocfg-h">Show</p>
          <div className="rd-ocfg-show">
            {(Object.keys(SECTION_NAMES) as OutlinerSection[]).map((key) => (
              <Plaque
                aria-pressed={settings.show[key]}
                key={key}
                onClick={() =>
                  setSettings({
                    ...settings,
                    show: { ...settings.show, [key]: !settings.show[key] },
                  })
                }
              >
                {SECTION_NAMES[key]}
              </Plaque>
            ))}
          </div>
          <p className="rd-ocfg-h">Sort your places</p>
          <div aria-label="Sort your places" className="rd-ocfg-sort" role="group">
            {(Object.keys(SORT_NAMES) as OutlinerSort[]).map((key) => (
              <Plaque
                aria-pressed={settings.sort === key}
                key={key}
                onClick={() => setSettings({ ...settings, sort: key })}
              >
                {SORT_NAMES[key]}
              </Plaque>
            ))}
          </div>
        </Popover>
      ) : null}
    </Panel>
  );
}

function OutlinerRow({ row }: { row: Row }) {
  return (
    <li>
      <Tooltip
        content={
          <Tip title={row.name}>
            <TipBody>{row.detail}</TipBody>
          </Tip>
        }
        side="left"
        triggerAs="div"
        triggerClassName="rd-row-tip"
      >
        <button
          aria-label={`${row.name}${row.figureWords ? `, ${row.figureWords}` : ""}${row.needs ? ", needs you" : ""}`}
          aria-pressed={row.selected ?? undefined}
          className={`rd-row${row.selected ? " is-on" : ""}${row.needs ? " is-needed" : ""}`}
          onClick={row.onPress}
          type="button"
        >
          {row.coin !== undefined ? (
            <SeatCoin aria-hidden="true" className="rd-row-coin" seat={row.coin} />
          ) : (
            <span aria-hidden="true" className="rd-row-ic">
              <Ico path={row.icon ?? "settlements/city"} size="chip" />
            </span>
          )}
          <span className={`rd-row-name${row.place ? " is-place" : ""}`}>{row.name}</span>
          {row.needs ? <i aria-hidden="true" className="rd-row-mark" /> : null}
          <span className="rd-row-fig">{row.figure}</span>
        </button>
      </Tooltip>
    </li>
  );
}

type Section = { end: string; empty: string; rows: Row[] };

/** Each section's rows and the words at its header's end, from the engine's selectors. */
function useSections(
  selectedTileId: string | null,
  sort: OutlinerSort,
  on: {
    onPickTile: (tileId: string) => void;
    onPickMooring: (vertexId: string) => void;
    onOpenDrawer: (drawer: "agora") => void;
  },
): Record<OutlinerSection, Section> {
  const { G, viewerId } = useGameUi();
  const names = settlementNames(G.board.tiles);
  const claims = G.phase === "gameplay" ? portClaimSites(G, viewerId) : [];

  // ---- your settlements ----
  const places = G.board.tiles.flatMap((tile) =>
    tile.settlements
      .filter((settlement) => settlement.owner === viewerId)
      .map((settlement) => {
        const name = titleCase(names.get(settlement.id) ?? "Polis");
        const pops = totalPops(settlement.pops);
        const room = settlementCapacity(settlement, G);
        // Pops on the move here: they stand in it from the seat's next turn.
        const arriving = G.transfers
          .filter((transfer) => transfer.toSettlementId === settlement.id)
          .reduce((sum, transfer) => sum + totalPops(transfer.pops), 0);
        const { open } = buildingGround(G, viewerId, tile.id);
        const claim = claims.find((site) => site.tileId === tile.id);
        const goods = claim?.luxuries.map((asset) => luxuryName(G, asset)).join(" or ");
        const needs = pops === 0 && arriving === 0;
        const coming = arriving > 0 ? `${arriving} arriving next turn` : null;
        const parts = [
          `${KIND[settlement.kind]}, ${pops} of ${room} people`,
          coming
            ? `${arriving} ${arriving === 1 ? "pop is" : "pops are"} on the way, here next turn`
            : null,
          needs ? "Stands empty: grow or move a pop in" : null,
          goods ? `A Port here would claim ${goods}` : null,
          open > 0 ? `${open} building ${open === 1 ? "slot" : "slots"} open` : null,
          pops > 0 && pops >= room ? "At capacity" : null,
        ].filter(Boolean);
        return {
          rank: needs ? 0 : claim ? 1 : 2,
          pops,
          row: {
            key: settlement.id,
            icon: `settlements/${settlement.kind}`,
            name,
            place: true,
            figure: (
              <span className="num">
                {pops}
                <small>/{room}</small>
                {arriving > 0 ? <small className="rd-row-coming"> (+{arriving})</small> : null}
              </span>
            ),
            figureWords: `${pops} of ${room} people${coming ? `, ${coming}` : ""}`,
            detail: `${parts.join(". ")}.`,
            needs,
            selected: tile.id === selectedTileId,
            onPress: () => on.onPickTile(tile.id),
          } satisfies Row,
        };
      }),
  );
  places.sort((a, b) =>
    sort === "people"
      ? b.pops - a.pops || a.row.name.localeCompare(b.row.name)
      : sort === "az"
        ? a.row.name.localeCompare(b.row.name)
        : a.rank - b.rank || a.row.name.localeCompare(b.row.name),
  );

  // ---- trade: open offers, standing deals, the goods held, the free goods beside you ----
  const asking = dealsAwaitingAnswer(G, viewerId);
  const openAlarm = (selector: string) => {
    const disc = document.querySelector<HTMLButtonElement>(selector);
    if (disc && disc.getAttribute("aria-expanded") !== "true") disc.click();
  };
  const offers: Row[] = G.offers.map((offer) => ({
    key: offer.id,
    coin: offer.from,
    name: offerTitle(G, offer),
    figure: <span className="rd-row-go">Open ▸</span>,
    detail: `${G.players[offer.from].name} gives ${bundleWords(G, offer.terms.give)} and gets ${bundleWords(G, offer.terms.get)}.`,
    needs: offer.to.includes(viewerId) && !offer.answers[viewerId],
    onPress: () => openAlarm(`[data-offer="${offer.id}"]`),
  }));
  const deals: Row[] = dealsOf(G, viewerId).map((deal) => {
    const partner = partnerIn(deal, viewerId);
    const short = asking.includes(deal);
    return {
      key: deal.id,
      coin: partner,
      name: dealTitle(G, deal, viewerId),
      figure: (
        <span className="rd-row-go">
          {short ? "Answer ▸" : isClosedDeal(deal) ? "Closed" : "Yearly"}
        </span>
      ),
      figureWords: short
        ? "a short payment waits on your answer"
        : isClosedDeal(deal)
          ? "closed"
          : "yearly",
      detail: `${dealWords(G, deal, viewerId)}.`,
      needs: short,
      onPress: () => openAlarm(`[data-deal="${deal.id}"]`),
    };
  });
  const holderOf = (asset: (typeof G.board.luxuries)[number], verb = "holds") => {
    const at = asset.claimedAtSettlementId
      ? titleCase(names.get(asset.claimedAtSettlementId) ?? "")
      : undefined;
    return `${G.players[asset.owner!].name} ${verb} it${at ? `, claimed by the Port at ${at}` : ""}.`;
  };
  const goods: Row[] = G.board.luxuries
    .filter((asset) => asset.owner !== null)
    .map((asset) => {
      // A lent good counts for its borrower: the row says so, with the borrower's coin.
      const loan = loanOf(G, asset.id)?.loan;
      const borrower = loan ? G.players[loan.borrower].name : null;
      return {
        key: asset.id,
        icon: "resources/luxury",
        name: luxuryName(G, asset),
        figure: loan ? (
          <>
            <small className="rd-row-lent">lent to</small>
            <SeatCoin aria-hidden="true" className="rd-row-coin" seat={loan.borrower} />
          </>
        ) : (
          <SeatCoin aria-hidden="true" className="rd-row-coin" seat={asset.owner!} />
        ),
        figureWords: loan
          ? `${G.players[asset.owner!].name}'s, lent to ${borrower}`
          : `held by ${G.players[asset.owner!].name}`,
        detail: loan
          ? `${holderOf(asset, "owns")} ${loanWords(G, loan, viewerId)}.`
          : holderOf(asset),
        onPress: () => on.onPickMooring(asset.vertexId),
      };
    });
  const free: Row[] = claims.flatMap((site) =>
    site.luxuries.map((asset) => ({
      key: `${site.tileId}-${asset.id}`,
      icon: "resources/luxury",
      name: luxuryName(G, asset),
      figure: <span className="rd-row-go is-good">Free</span>,
      figureWords: "free",
      detail: `Free. A Port at ${titleCase(names.get(site.settlementId) ?? "your settlement")} would claim it.`,
      onPress: () => on.onPickMooring(asset.vertexId),
    })),
  );
  const offerCount = G.offers.length;

  // ---- the Assembly: the next sitting, your votes, the standing Laws ----
  const agora = () => on.onOpenDrawer("agora");
  const nextYear = nextAssemblyYear(G);
  const turns = nextYear === null ? null : turnsUntilYear(G, viewerId, nextYear);
  const sittingWords = G.assembly
    ? "sitting now"
    : turns === null
      ? "none left"
      : turns === 0
        ? "next turn"
        : `in ${turns} ${turns === 1 ? "turn" : "turns"}`;
  const votes = currentVoteWeight(G, viewerId);
  const laws = [...G.activeLaws].sort((a, b) => a.order - b.order);
  const assembly: Row[] = [
    {
      key: "next",
      icon: "assembly/agora",
      name: "Next sitting",
      figure: (
        <span className="num">
          {G.assembly ? "Now" : turns === null ? "—" : turns === 0 ? "Next" : turns}
        </span>
      ),
      figureWords: sittingWords,
      detail: G.assembly
        ? "The Assembly sits now."
        : turns === null
          ? "No Assembly is left this game."
          : `The Assembly sits ${sittingWords}. ${laws.length} of ${G.ruleset.assembly.lawCap} stelae stand.`,
      onPress: agora,
    },
    {
      key: "votes",
      icon: "assembly/vote",
      name: "Your votes",
      figure: <span className="num">{votes}</span>,
      figureWords: `${votes}`,
      detail: `You hold ${votes} ${votes === 1 ? "vote" : "votes"} in the Assembly.`,
      onPress: agora,
    },
    ...laws.flatMap((law) => {
      const card = getResolutionCard(G.definition.content, law.cardId);
      return card
        ? [
            {
              key: `${law.cardId}-${law.order}`,
              icon: "assembly/law",
              name: card.name,
              figure: <SeatCoin aria-hidden="true" className="rd-row-coin" seat={law.author} />,
              figureWords: `carried by ${G.players[law.author].name}`,
              detail: card.text,
              onPress: agora,
            } satisfies Row,
          ]
        : [];
    }),
  ];

  // ---- rivals' settlements, by seat and then by people ----
  const rivals = PLAYER_IDS.filter((id) => id !== viewerId).flatMap((owner) =>
    G.board.tiles
      .flatMap((tile) =>
        tile.settlements
          .filter((settlement) => settlement.owner === owner)
          .map((settlement) => ({ tile, settlement, pops: totalPops(settlement.pops) })),
      )
      .sort((a, b) => b.pops - a.pops)
      .map(({ tile, settlement, pops }): Row => {
        const name = titleCase(names.get(settlement.id) ?? "Polis");
        return {
          key: settlement.id,
          coin: owner,
          name,
          place: true,
          figure: <span className="num">{pops}</span>,
          figureWords: `${pops} people`,
          detail: `${PLAYER_GLAZES[owner].name}’s ${KIND[settlement.kind].toLowerCase()}, ${pops} people.`,
          selected: tile.id === selectedTileId,
          onPress: () => on.onPickTile(tile.id),
        };
      }),
  );

  return {
    settle: {
      end: String(places.length),
      empty: "No walls have risen yet.",
      rows: places.map((place) => place.row),
    },
    trade: {
      end:
        offerCount === 0 ? "no offers" : `${offerCount} ${offerCount === 1 ? "offer" : "offers"}`,
      empty: "No offers, deals or goods yet.",
      rows: [...offers, ...deals, ...goods, ...free],
    },
    assembly: { end: sittingWords, empty: "", rows: assembly },
    rivals: { end: String(rivals.length), empty: "No rival places yet.", rows: rivals },
  };
}
