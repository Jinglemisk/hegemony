import { useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { getBuildings, getLuxuryGood } from "../../../game/content";
import { capitalize } from "../../../game/core/format";
import { totalPops } from "../../../game/core/pops";
import { outputRules } from "../../../game/economy/income";
import { calculateEconomyProjection } from "../../../game/economy/preview";
import { activeClaims, claimableLuxuriesAt, luxuryHappinessBonus } from "../../../game/luxury";
import type { HegemonyState, PopType } from "../../../game/types";
import { unrestBands } from "../../../game/unrest";
import type { UnrestTier } from "../../../game/unrest";
import { presentUnrestOutcome } from "../../../ui/effects";
import { sign } from "../../../ui/frameFormat";
import { RESOURCE_LABELS, formatNumber } from "../../../ui/formatters";
import {
  BUILDING_RASTERS,
  POP_RASTERS,
  RESOURCE_RASTERS,
  UNREST_TIER_RASTERS,
} from "../../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNames } from "../../../ui/settlementNames";
import { Prose } from "../../AnnotatedText";
import { Chips, Ico } from "../parts";
import { MAP_MODES, mapRealms } from "./modes";
import type { MapMode } from "./modes";
import { TIER, TRADE_ROUTE, css } from "./palette";

/**
 * The key to the map's mode: what its models, colours, marks and numbers mean, after
 * the prototype's legend. The shell's dock hosts it as a row over its own, closed until
 * pressed, so the key never lies over the island unasked; open, it rises out of the
 * dock above that row. Every number is the engine's: the realms' counts, levels and
 * income, the ruleset's lines and rates, the goods' holders.
 */

type Row = { key: string; mark: ReactNode; name: ReactNode; text: ReactNode };

const swatch = (colour: string) => (
  <i className="map-key-swatch" style={{ "--swatch": colour } as CSSProperties} />
);
const count = (n: number, one: string, many: string) =>
  `${formatNumber(n)} ${n === 1 ? one : many}`;
const article = (word: string) => (/^[AEIOU]/i.test(word) ? `an ${word}` : `a ${word}`);

function terrainRows(G: HegemonyState): Row[] {
  const buildings = getBuildings(G.definition.content);
  const name = (id: string) => buildings.find((b) => b.id === id)?.name ?? id;
  const icon = (path: string) => <Ico path={path} size="ui" />;
  const titles = G.ruleset.victory.cardsToWin;
  return [
    {
      key: "city",
      mark: icon("settlements/city"),
      name: "City",
      text: "Stone walls, marble towers, clay roofs. The capital is an acropolis with a temple.",
    },
    {
      key: "colony",
      mark: icon("settlements/colony"),
      name: "Colony",
      text: "Timber-roofed houses, a bark palisade, the owner's pennant.",
    },
    {
      key: "buildings",
      mark: icon("buildings/build"),
      name: "Town buildings",
      text: "Buildings face worn-earth lanes. Their bronze icons show in Economy and on a selected tile.",
    },
    {
      key: "working",
      mark: icon("pops/crowd"),
      name: "Working slaves",
      text: "One figure per pop, at the nearest grove, field or crag with tools and cut resources.",
    },
    {
      key: "volume",
      mark: icon(RESOURCE_RASTERS.wood),
      name: "Resource volume",
      text: "Trees, crags and fields follow the tile's yield. Buildings clear them; Economy counts the slots.",
    },
    {
      key: "temple",
      mark: icon(BUILDING_RASTERS.temple),
      name: name("temple"),
      text: `Marble columns under a clay roof; ${name("granary")}, ${name("marketplace")} and ${name("estate")} sit along the town lanes.`,
    },
    {
      key: "citizen",
      mark: icon(POP_RASTERS.citizens),
      name: "Citizen",
      text: "Long robe and leaf crown; owner sash.",
    },
    {
      key: "freeman",
      mark: icon(POP_RASTERS.freemen),
      name: "Freeman",
      text: "Short tunic; owner cap.",
    },
    {
      key: "slave",
      mark: icon(POP_RASTERS.slaves),
      name: "Slave",
      text: "Bare-chested under a yoke; owner waistband.",
    },
    {
      key: "luxury",
      mark: icon("resources/luxury"),
      name: "Luxury good",
      text: "Amphorae on a moored raft; the owner's pennant once a Port claims it.",
    },
    {
      key: "move",
      mark: icon("pops/move"),
      name: "Pops on the move",
      text: "A ship with an owner band on its sail, on a dashed route.",
    },
    {
      key: "riot",
      mark: icon("unrest/riot"),
      name: "Riot",
      text: "Torches and smoke over the cities of a realm at the riot or revolt line.",
    },
    {
      key: "title",
      mark: icon("victory/laurel"),
      name: "Title",
      text: `A golden laurel over the capital of a realm that holds ${count(titles, "title", "titles")}.`,
    },
  ];
}

function politicalRows(G: HegemonyState): Row[] {
  return mapRealms(G)
    .filter((realm) => realm.tiles)
    .map(({ owner, census, tiles }) => {
      const seat = PLAYER_GLAZES[owner];
      const pops = totalPops(census);
      return {
        key: owner,
        mark: swatch(seat.color),
        name: `${seat.blazon} ${seat.name} · ${seat.glaze}`,
        text:
          `${count(census.cities, "city", "cities")} and ${count(census.colonies, "colony", "colonies")} ` +
          `on ${count(tiles, "tile", "tiles")}; ${count(pops, "pop", "pops")}.`,
      };
    });
}

function economyRows(G: HegemonyState): Row[] {
  // The rules as the Laws leave them: a city's, and a colony's where a Law sets it apart.
  const { classes, food } = outputRules(G, "city");
  const colony = outputRules(G, "colony").classes;
  /** The building that raises a class's output and what each pop then makes, and what
   *  it makes in a colony where that differs. */
  const raise = (pop: PopType) => {
    const rule = classes[pop];
    const there = colony[pop].perPop;
    return (
      (rule.raise ? `; ${formatNumber(rule.raise.perPop)} with ${article(rule.raise.by)}` : "") +
      (there === rule.perPop ? "" : `; ${formatNumber(there)} in a colony`)
    );
  };
  const makes = (pop: PopType) => formatNumber(classes[pop].perPop);
  const eaters = (["slaves", "freemen", "citizens"] as const).filter(
    (pop) => classes[pop].eats > 0,
  );
  const eat = (pops: readonly PopType[]) =>
    `${pops.join(" and ")} eat ${formatNumber(classes[pops[0]].eats)} each`;
  const eating = !eaters.length
    ? "no pop eats"
    : eaters.every((pop) => classes[pop].eats === classes[eaters[0]].eats)
      ? eat(eaters)
      : eaters.map((pop) => eat([pop])).join(", ");
  const icon = (resource: keyof typeof RESOURCE_RASTERS) => (
    <Ico path={RESOURCE_RASTERS[resource]} size="ui" />
  );
  return [
    {
      key: "slots",
      mark: (
        <span className="pips">
          <i className="b" />
          <i className="w" />
          <i />
        </span>
      ),
      name: "Slots",
      text: "Square: a building. Filled: a slave works it. Ring: open.",
    },
    {
      key: "materials",
      mark: icon("wood"),
      name: "Wood, stone, food",
      text: `A working slave makes ${makes("slaves")} of its tile's resource${raise("slaves")}.`,
    },
    {
      key: "gold",
      mark: icon("gold"),
      name: RESOURCE_LABELS.gold,
      text: `Each freeman makes ${makes("freemen")}${raise("freemen")}.`,
    },
    {
      key: "influence",
      mark: icon("influence"),
      name: RESOURCE_LABELS.influence,
      text: `Each citizen makes ${makes("citizens")}${raise("citizens")}.`,
    },
    {
      key: "food",
      mark: icon("food"),
      name: RESOURCE_LABELS.food,
      text:
        capitalize(eating) +
        food.map((f) => `; ${article(f.by)} adds ${formatNumber(f.amount)}`).join("") +
        ".",
    },
    // Each realm's net a turn, as its ledger prints it: the year card, Laws and
    // arriving pops counted, so it need not be the sum of the cards.
    ...mapRealms(G)
      .filter((realm) => realm.tiles)
      .map(({ owner }) => ({
        key: owner,
        mark: swatch(PLAYER_GLAZES[owner].color),
        name: `${PLAYER_GLAZES[owner].name} · Net / turn`,
        text: (
          <Chips
            amounts={calculateEconomyProjection(G, owner, { resolveTransfers: true }).income}
            empty="nothing yet"
            signed
          />
        ),
      })),
  ];
}

function unrestRows(G: HegemonyState): Row[] {
  /** Each tier's levels, said: "0 or higher", "−1 to −2", "−6 or lower". */
  const band = Object.fromEntries(
    unrestBands(G).map(({ tier, top, bottom }) => [
      tier,
      top === null
        ? `${sign(bottom!)} or higher`
        : bottom === null
          ? `${sign(top)} or lower`
          : top === bottom
            ? sign(top)
            : `${sign(top)} to ${sign(bottom)}`,
    ]),
  ) as Record<UnrestTier, string>;
  const { share } = presentUnrestOutcome(G.ruleset, "revolt");
  // Temples, goods, slaves and tokens are always said; the rest when they count.
  const said = ["temples", "luxuries", "slaves", "tokens"];
  return [
    { key: "calm", mark: swatch(css(TIER.calm)), name: "Calm", text: `${band.calm}.` },
    {
      key: "discontent",
      mark: swatch(css(TIER.discontent)),
      name: "Discontent",
      text: `${band.discontent}.`,
    },
    {
      key: "unrest",
      mark: swatch(css(TIER.unrest)),
      name: "Riot",
      text: `${band.unrest}: a riot when the realm's turn ends.`,
    },
    {
      key: "revolt",
      mark: swatch(css(TIER.revolt)),
      name: "Revolt",
      text: `${band.revolt}: ${share.toLowerCase()} the slaves leave.`,
    },
    ...mapRealms(G)
      .filter((realm) => realm.tiles)
      .map((realm) => ({
        key: realm.owner,
        mark: (
          <Ico
            path={
              realm.tier === "calm" ? RESOURCE_RASTERS.happiness : UNREST_TIER_RASTERS[realm.tier]
            }
            size="ui"
          />
        ),
        name: `${PLAYER_GLAZES[realm.owner].name} ${sign(realm.happiness)}`,
        text: `${realm.terms
          .filter((term) => term.amount || said.includes(term.id))
          .map((term) =>
            term.id === "tokens" && !term.amount
              ? "no Unrest tokens"
              : `${capitalize(term.detail)} ${sign(term.amount)}`,
          )
          .join(", ")}.`,
      })),
  ];
}

function tradeRows(G: HegemonyState): Row[] {
  const names = settlementNames(G.board.tiles);
  const titled = (name: string) => capitalize(name.toLowerCase());
  const perGood = G.ruleset.economy.luxury.happinessPerGood;
  const goods = G.board.luxuries.map((asset): Row => {
    const name = getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId;
    if (asset.owner) {
      const seat = PLAYER_GLAZES[asset.owner];
      const port = asset.claimedAtSettlementId ? names.get(asset.claimedAtSettlementId) : null;
      const counts =
        luxuryHappinessBonus(G, asset.owner) > 0 &&
        activeClaims(G, asset.owner).some((held) => held.id === asset.id);
      return {
        key: asset.id,
        mark: swatch(seat.color),
        name,
        text:
          `${seat.name}'s` +
          (port ? `, by the Port at ${titled(port)}` : "") +
          (counts ? `: ${sign(perGood)} happiness.` : "."),
      };
    }
    // Where a Port could take it: by the settlement there, or the bare hex.
    const places = G.board.tiles
      .filter((tile) => claimableLuxuriesAt(G, tile.id).some((open) => open.id === asset.id))
      .map((tile) =>
        tile.settlements.length
          ? `at ${titled(names.get(tile.settlements[0].id) ?? "")}`
          : `on hex ${tile.id}`,
      );
    return {
      key: asset.id,
      mark: <Ico path="resources/luxury" size="ui" />,
      name,
      text: `Unclaimed; a Port ${places.join(" or ")} takes it.`,
    };
  });
  const moves = G.transfers.map(
    (t) =>
      `${PLAYER_GLAZES[t.owner].name} moves ${formatNumber(totalPops(t.pops))} from ` +
      `${titled(names.get(t.fromSettlementId) ?? "")} to ${titled(names.get(t.toSettlementId) ?? "")}`,
  );
  return [
    ...goods,
    {
      key: "moves",
      mark: <Ico path="pops/move" size="ui" />,
      name: "Dashed white",
      text: moves.length ? `${moves.join("; ")}.` : "No pops at sea.",
    },
    {
      key: "trade",
      mark: (
        <i className="map-key-route" style={{ "--route": css(TRADE_ROUTE) } as CSSProperties} />
      ),
      name: "Dotted bronze",
      text: "Trade runs between a realm's Ports and its coast; decoration only.",
    },
  ];
}

const HEADS: Record<MapMode, string> = {
  terrain: "Models, slots and pops",
  political: "Realms",
  economy: "Yields, from the ledger",
  unrest: "Happiness and its lines",
  trade: "Goods, Ports and routes",
};
const ROWS = {
  terrain: terrainRows,
  political: politicalRows,
  economy: economyRows,
  unrest: unrestRows,
  trade: tradeRows,
};

export function MapLegend({ G, mode }: { G: HegemonyState; mode: MapMode }) {
  const [open, setOpen] = useState(false);
  const head = useRef<HTMLButtonElement>(null);
  const id = useId();
  const rows = useMemo(() => (open ? ROWS[mode](G) : []), [G, mode, open]);
  const label = MAP_MODES.find((m) => m.id === mode)?.label;
  // Escape inside the key closes it and hands focus back to its row.
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      head.current?.focus();
    }
  };
  return (
    <>
      {open ? (
        <section
          aria-label={`${label} map key`}
          className="map-key"
          id={id}
          onKeyDown={closeOnEscape}
        >
          <p className="caps">{HEADS[mode]}</p>
          <ul>
            {rows.map((row) => (
              <li key={row.key}>
                {row.mark}
                <span>
                  <b>
                    <Prose links={false}>{row.name}</Prose>
                  </b>{" "}
                  {typeof row.text === "string" ? (
                    <Prose links={false}>{row.text}</Prose>
                  ) : (
                    row.text
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        className="map-key-head caps"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={closeOnEscape}
        ref={head}
        title={open ? "Close the map key" : "Open the map key"}
        type="button"
      >
        {label} key
      </button>
    </>
  );
}
