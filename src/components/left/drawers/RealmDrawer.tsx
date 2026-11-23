import {
  DEMOTE_FROM,
  POP_TYPES,
  PROMOTE_FROM,
  activeClaims,
  buildingGround,
  claimableLuxuriesAt,
  currentVoteWeight,
  demotionTarget,
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getDemotePopStatus,
  getPromotePopStatus,
  getUpgradeColonyToCityStatus,
  heldClaims,
  luxuryName,
  nextAssemblyYear,
  playerNationalIdeas,
  playerPieces,
  promotionTarget,
  realmPops,
  settlementCapacity,
  settlementNextYield,
  settlementWorkingSlaves,
  totalPops,
  usesLeft,
  victoryCardsHeld,
  victoryStandings,
  victoryThreats,
} from "../../../game/rules";
import { occupiedBuildingSlots } from "../../../game/ideaRules";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { cheapestCost } from "../../../ui/frameFormat";
import { formatPopLabel } from "../../../ui/formatters";
import { turnsUntilYear } from "../../../ui/frameSelectors";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { calculatePopEconomy, capitalize, getOwnedHoldings } from "../../board/helpers";
import type { OwnedHolding } from "../../board/types";
import { Band } from "../../chrome/Panel";
import { Plaque } from "../../chrome/controls";
import { SeatCoin } from "../../chrome/SeatCoin";
import { Chips, Ico, Tip, TipBody } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { Row, Tile } from "../atoms";
import { refusal, shortWords, titleCase, usePoint } from "../words";
import type { DrawerProps } from "../Drawer";

const placeIcon = ({ settlement }: OwnedHolding) => `settlements/${settlement.kind}`;

/** What founding costs this seat now: the engine's price on any tile, Laws applied. */
const foundCost = (G: HegemonyState, viewer: PlayerId) =>
  getFoundColonyStatus(G, viewer, G.board.tiles[0]?.id ?? "").cost ??
  G.ruleset.actionCosts.foundColony;

/**
 * What a place is short of next, from the engine's own statuses: empty, a colony's
 * way to a city, a Port's claim, open slots, room.
 */
function nextFor(G: HegemonyState, viewer: PlayerId, { tile, settlement }: OwnedHolding) {
  const pops = totalPops(settlement.pops);
  const capacity = settlementCapacity(settlement, G);
  const store = G.players[viewer].resources;
  if (pops === 0) return { line: "Empty: grow or move a pop in", tone: "warn" as const };
  if (settlement.kind === "colony") {
    const up = getUpgradeColonyToCityStatus(G, viewer, tile.id);
    const why = refusal(up, null, store);
    if (!why) return { line: "Can become a city", tone: "good" as const };
    // A shortfall is the way to a city; a rule (no city beside a city) stands on its own.
    return { line: shortWords(store, up.cost ?? {}) === why ? `City: ${why}` : why };
  }
  const [good] = claimableLuxuriesAt(G, tile.id);
  if (good && getBuildBuildingStatus(G, viewer, tile.id, "port").can)
    return { line: `A Port here claims ${luxuryName(G, good)}`, tone: "good" as const };
  const { open } = buildingGround(G, viewer, tile.id);
  if (open > 0) return { line: `${open} ${open === 1 ? "slot" : "slots"} open` };
  if (pops >= capacity) return { line: "Full" };
  return { line: `Room for ${capacity - pops} more` };
}

/** Overview: the realm's figures, a threat, its places and its cards. */
export function RealmOverview({ onPick, actions }: DrawerProps) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const holdings = getOwnedHoldings(G, viewerId);
  const names = settlementNames(G.board.tiles);
  const pieces = playerPieces(G, viewerId);
  const toWin = G.ruleset.victory.cardsToWin;
  const titles = victoryStandings(G).filter((standing) => standing.holder === viewerId);
  const ideas = playerNationalIdeas(G, viewerId);
  const claims = heldClaims(G, viewerId);
  const active = activeClaims(G, viewerId);
  const votes = currentVoteWeight(G, viewerId);
  const sits = nextAssemblyYear(G);
  const threats = victoryThreats(G);
  const held = G.devHands[viewerId].length;
  // Found a colony: the map lights every site the engine would take.
  const sites = G.board.tiles.filter((tile) => getFoundColonyStatus(G, viewerId, tile.id).can);
  const noFound =
    turnBlocked ??
    (pieces.coloniesRemaining === 0
      ? "No colony pieces left."
      : sites.length === 0
        ? (shortWords(G.players[viewerId].resources, foundCost(G, viewerId)) ??
          "No site to found on now.")
        : null);

  return (
    <>
      <div className="lw-tiles">
        <Tile
          ariaLabel={
            noFound
              ? `Colonies left: ${pieces.coloniesRemaining}. Found a colony: ${noFound}`
              : `Colonies left: ${pieces.coloniesRemaining}. Found a colony: light every site`
          }
          disabled={noFound !== null}
          icon="settlements/colony"
          label="Colonies left"
          onClick={actions.onFound}
          tip={{
            key: "col",
            title: "Found a colony",
            line: `${pieces.coloniesRemaining} of ${pieces.colonyLimit} colony pieces left. ${
              noFound ?? `Press to light the ${sites.length} sites you may found on.`
            }`,
          }}
          value={pieces.coloniesRemaining}
        />
        <Tile
          icon="settlements/city"
          label="Cities left"
          tip={{
            key: "city",
            title: "City pieces",
            line: `${pieces.citiesRemaining} of ${pieces.citySupply} left to raise colonies into cities.`,
          }}
          value={pieces.citiesRemaining}
        />
        <Tile
          icon="victory/laurel"
          label="Titles"
          tip={{
            key: "titles",
            title: "Titles",
            line: titles.length
              ? `You hold ${titles.map((standing) => standing.card.name).join(", ")}. ${toWin} at your turn's start win.`
              : `You hold none. ${toWin} at your turn's start win.`,
          }}
          value={`${victoryCardsHeld(G, viewerId)}/${toWin}`}
        />
        <Tile
          icon="assembly/national-idea"
          label="Ideas"
          tip={{
            key: "ideas",
            title: "National Ideas",
            line: ideas.length
              ? ideas.map((idea) => `${idea.name}: ${idea.text}`).join(" ")
              : "None yet.",
          }}
          value={ideas.length}
        />
        <Tile
          icon="resources/luxury"
          label="Luxuries"
          tip={{
            key: "lux",
            title: "Luxury goods",
            line: claims.length
              ? `${claims.map((asset) => luxuryName(G, asset)).join(", ")}; ${active.length} active.`
              : "None held. A Port beside a free good claims it.",
          }}
          value={claims.length ? `${active.length}/${claims.length}` : 0}
        />
        <Tile
          icon="assembly/vote"
          label="Votes"
          tip={{
            key: "votes",
            title: "Votes",
            line:
              sits === null
                ? `${votes} at the Assembly, which sits no more.`
                : `${votes} at the Assembly, which sits in ${turnsUntilYear(G, viewerId, sits)} turns.`,
          }}
          value={votes}
        />
      </div>
      {threats.map((threat) => (
        <Threat key={threat.seat} seat={threat.seat} titles={threat.titles.map((t) => t.card)} />
      ))}
      <Band label="Places" end={holdings.length} />
      <div className="lw-tiles">
        {holdings.map((holding) => {
          const name = titleCase(names.get(holding.settlement.id) ?? "Polis");
          const pops = totalPops(holding.settlement.pops);
          const room = settlementCapacity(holding.settlement, G);
          return (
            <Tile
              ariaLabel={`${name}, ${pops} of ${room} people`}
              className="is-place"
              icon={placeIcon(holding)}
              key={holding.settlement.id}
              label={`${pops}/${room}`}
              onClick={() => onPick({ kind: "tile", tileId: holding.tile.id })}
              tip={{
                key: `p-${holding.tile.id}`,
                title: name,
                line: nextFor(G, viewerId, holding).line,
              }}
              value={name}
            />
          );
        })}
      </div>
      <Band label="Cards" end={held} />
      <div className="lw-center">
        {held ? (
          <Plaque onClick={actions.onOpenHand}>
            <Ico path="events/venture" size="ui" />
            View the hand · {held}
          </Plaque>
        ) : (
          <span className="lw-none">
            <Ico path="events/venture" size="ui" />
            No cards held
          </span>
        )}
      </div>
    </>
  );
}

/** A seat on enough titles to win at its turn's start. */
export function Threat({
  seat,
  titles,
  end,
}: {
  seat: PlayerId;
  titles: ReadonlyArray<{ id: string; name: string }>;
  end?: string;
}) {
  const name = PLAYER_GLAZES[seat].name;
  const { lit, on } = usePoint({
    key: `threat-${seat}`,
    title: `${titles.length} titles`,
    line: `${name} holds ${titles.map((title) => title.name).join(", ")} and wins when their turn starts. A tie breaks a title.`,
  });
  return (
    <Tooltip
      content={
        <Tip title={`${titles.length} titles`}>
          <TipBody>{`${name} holds ${titles.map((title) => title.name).join(", ")}.`}</TipBody>
        </Tip>
      }
      triggerAs="div"
      triggerClassName="lw-tip"
    >
      <div {...on} className={`lw-warn${lit ? " is-lit" : ""}`} role="status">
        <SeatCoin seat={seat} size={28} />
        <span>
          <b>{name}</b> holds {titles.length} titles
        </span>
        <span className="lw-warn-end">
          {end ??
            titles.map((title) => <Ico key={title.id} path={`victory/${title.id}`} size="ui" />)}
        </span>
      </div>
    </Tooltip>
  );
}

/** Cities: one two-line row a place, with what it is short of next. */
export function RealmCities({ onPick }: DrawerProps) {
  const { G, viewerId } = useGameUi();
  const holdings = getOwnedHoldings(G, viewerId);
  const names = settlementNames(G.board.tiles);
  if (holdings.length === 0) return <p className="lw-none">No walls have risen yet.</p>;

  return (
    <div className="lw-rows">
      {holdings.map((holding) => {
        const { tile, settlement } = holding;
        const name = titleCase(names.get(settlement.id) ?? "Polis");
        const pops = totalPops(settlement.pops);
        const room = settlementCapacity(settlement, G);
        const { slots } = buildingGround(G, viewerId, tile.id);
        const used =
          occupiedBuildingSlots(G, settlement) + settlementWorkingSlaves(tile, settlement, G);
        const next = nextFor(G, viewerId, holding);
        return (
          <Row
            ariaLabel={`${name}: ${pops} of ${room} people. ${next.line}`}
            key={settlement.id}
            onClick={() => onPick({ kind: "tile", tileId: tile.id })}
            tip={{
              key: `c-${tile.id}`,
              title: `${name} · ${capitalize(tile.terrain)}`,
              line: next.line,
            }}
            tone={next.tone}
          >
            <Ico path={placeIcon(holding)} size="tile" />
            <span className="lw-row-a">
              {/* Cut beside a long yield; pointing at the row writes it whole below. */}
              <b className="lw-row-name" data-truncates="summary">
                {name}
              </b>
              <Chips
                amounts={settlementNextYield(G, tile, settlement)}
                empty={<span className="lw-quiet">makes nothing</span>}
                signed
              />
            </span>
            <span className="lw-row-b">
              <span className="lw-row-next">{next.line}</span>
              <span className="lw-row-n">
                <Ico path="pops/capacity" size="chip" />
                {pops}/{room}
                <Ico path="settlements/slot" size="chip" />
                {slots > 0 ? `${used}/${slots}` : "—"}
              </span>
            </span>
          </Row>
        );
      })}
    </div>
  );
}

/** A ladder move's price, the cheapest of the places it can be made in. */
function rung(
  G: HegemonyState,
  viewer: PlayerId,
  holdings: OwnedHolding[],
  kind: "promote" | "demote",
  from: PopType,
) {
  const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
  const ids = holdings.length ? holdings.map(({ tile }) => tile.id) : [""];
  const statuses = ids.map((id) => status(G, viewer, id, from));
  const to = kind === "promote" ? promotionTarget(from) : demotionTarget(from);
  return {
    what: `${kind === "promote" ? "Raise" : "Lower"} a ${formatPopLabel(from, 1)} to ${formatPopLabel(to, 1)}`,
    cost: cheapestCost(statuses.map((each) => each.cost ?? {})),
  };
}

/** People: the three classes, the ladder's moves and prices, where they live, the net. */
export function RealmPeople({ onPick, income }: DrawerProps) {
  const { G, viewerId } = useGameUi();
  const holdings = getOwnedHoldings(G, viewerId);
  const names = settlementNames(G.board.tiles);
  const count = realmPops(G, viewerId);
  const economy = calculatePopEconomy(holdings, G);
  const left = usesLeft(G, viewerId, "ladder");
  const limit = G.ruleset.turnCaps.ladder;
  const order: PopType[] = [...POP_TYPES].reverse();

  return (
    <>
      <div className="lw-classes">
        {order.map((pop) => {
          const up = (PROMOTE_FROM as readonly PopType[]).includes(pop)
            ? rung(G, viewerId, holdings, "promote", pop)
            : null;
          const down = (DEMOTE_FROM as readonly PopType[]).includes(pop)
            ? rung(G, viewerId, holdings, "demote", pop)
            : null;
          const label = capitalize(formatPopLabel(pop, 2));
          return (
            <Tile
              className="is-class"
              icon={POP_RASTERS[pop]}
              key={pop}
              label={label}
              tip={{
                key: `cl-${pop}`,
                title: label,
                line: [up?.what, down?.what]
                  .filter(Boolean)
                  .map((what) => `${what}: from a place's panel.`)
                  .join(" "),
              }}
              value={count[pop]}
            >
              <span className="lw-class-y">
                <Chips
                  amounts={economy[pop]}
                  empty={<span className="lw-quiet">nothing</span>}
                  signed
                />
              </span>
              {[
                { move: up, icon: "pops/promote" },
                { move: down, icon: "pops/demote" },
              ].map(({ move, icon }) => (
                <span className="lw-rung" key={icon}>
                  {move ? (
                    <>
                      <Ico path={icon} size="ui" />
                      <Chips amounts={move.cost} empty="free" />
                    </>
                  ) : (
                    <span className="lw-quiet">—</span>
                  )}
                </span>
              ))}
            </Tile>
          );
        })}
      </div>
      <Band label="Ladder moves this turn" />
      <div aria-label="Ladder moves" className="lw-pips" role="img">
        {left === null || limit === null ? (
          <span className="lw-quiet">No limit this game</span>
        ) : (
          <>
            {Array.from({ length: limit }, (_, i) => (
              <i data-used={i < limit - left || undefined} key={i} />
            ))}
            <span className="lw-quiet">
              {limit - left} of {limit} used
            </span>
          </>
        )}
      </div>
      <Band label="Where they live" />
      <div className="lw-where">
        {holdings.map((holding) => {
          const name = titleCase(names.get(holding.settlement.id) ?? "Polis");
          const pops = totalPops(holding.settlement.pops);
          return (
            <Tile
              ariaLabel={`${name}, ${pops} people`}
              icon={placeIcon(holding)}
              key={holding.settlement.id}
              onClick={() => onPick({ kind: "tile", tileId: holding.tile.id })}
              tip={{
                key: `w-${holding.tile.id}`,
                title: name,
                line: `${pops} of ${settlementCapacity(holding.settlement, G)} people: ${POP_TYPES.map((p) => `${holding.settlement.pops[p]} ${formatPopLabel(p, holding.settlement.pops[p])}`).join(", ")}.`,
              }}
              value={pops}
            />
          );
        })}
      </div>
      <Band label="Net a turn" />
      <div className="lw-center lw-net">
        <Chips amounts={income} empty={<span className="lw-quiet">Nothing moves</span>} signed />
      </div>
    </>
  );
}
