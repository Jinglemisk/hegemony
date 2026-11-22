import type { ReactNode } from "react";
import {
  GROWABLE_POPS,
  claimableLuxuriesAt,
  currentVoteWeight,
  getBuildBuildingOptions,
  getGrowPopStatus,
  growUsesLeft,
  happinessLevel,
  luxuryName,
  playerNationalIdeas,
  victoryMetricValue,
  victoryStandings,
} from "../../game/rules";
import type { BuildingId, HexTile, LuxuryAsset, PlayerId } from "../../game/types";
import { presentBuildingEffects } from "../../ui/effects";
import { publicCensus } from "../../ui/frameSelectors";
import { sign } from "../../ui/frameFormat";
import { formatPopLabel } from "../../ui/formatters";
import { BUILDING_RASTERS, POP_RASTERS } from "../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { AnnotatedText } from "../AnnotatedText";
import { useGameUi } from "../board/GameUiContext";
import { Panel, PanelHead } from "../chrome/Panel";
import { Lacquer } from "../chrome/controls";
import { useConfirm } from "../chrome/confirmContext";
import { Chips, Ico, Tip, TipBody } from "../frame/parts";
import { cellLine } from "../frame/realm/BuildPage";
import { Tooltip } from "../overlays/Tooltip";
import { CostDetail } from "./atoms";
import { refusal } from "./words";

/**
 * What opens beside the place panel, above the hand's row: the Grow and Build
 * options, and a rival's card. Each is one fixed box; a choice closes it and asks
 * through the confirm bar.
 */

/** One option: its icon, name and price, and a line saying what it does or why not. */
function Option({
  icon,
  name,
  cost,
  why,
  line,
  tip,
  onPick,
}: {
  icon: string;
  name: string;
  cost: Partial<Record<string, number>>;
  why: string | null;
  line: string;
  tip?: ReactNode;
  onPick: () => void;
}) {
  const button = (
    <button
      aria-disabled={why !== null || undefined}
      aria-label={why ? `${name}: ${why}` : name}
      className="pp-opt"
      onClick={why ? undefined : onPick}
      type="button"
    >
      <Ico path={icon} size="tile" />
      <span className="pp-opt-n">{name}</span>
      <Chips amounts={cost} short={why !== null} />
      <span className={`pp-opt-line${why ? " is-why" : ""}`}>
        <AnnotatedText links={false} text={why ?? line} />
      </span>
    </button>
  );
  return tip ? (
    <Tooltip content={tip} triggerAs="div" triggerClassName="pp-opt-tip">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

/** Grow here: which pop, priced by the engine; a pick asks through the confirm bar. */
export function GrowOptions({
  tile,
  name,
  onClose,
}: {
  tile: HexTile;
  name: string;
  onClose: () => void;
}) {
  const { G, viewerId, moves, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const store = G.players[viewerId].resources;
  const left = growUsesLeft(G, viewerId, tile.id);
  const more =
    left === null ? undefined : `${left} ${left === 1 ? "grow" : "grows"} left here this turn.`;

  return (
    <Panel
      aria-label={`Grow in ${name}`}
      className="pp-pop is-grow ch-settle"
      corners={["tr", "br"]}
      data-exclude
      role="dialog"
    >
      <PanelHead
        closeLabel="Close Grow"
        icon="pops/pop-gain"
        onClose={onClose}
        sub={more ?? "One grow at a time"}
        title={`Grow in ${name}`}
      />
      <div className="pp-pop-body">
        {GROWABLE_POPS.map((pop) => {
          const status = getGrowPopStatus(G, viewerId, tile.id, pop);
          const label = `A ${formatPopLabel(pop, 1)}`;
          return (
            <Option
              cost={status.cost ?? {}}
              icon={POP_RASTERS[pop]}
              key={pop}
              line="Ready"
              name={label}
              onPick={() => {
                onClose();
                ask({
                  icon: POP_RASTERS[pop],
                  question: `Are you sure you want to grow a ${formatPopLabel(pop, 1)} in ${name}?`,
                  detail: <CostDetail cost={status.cost ?? {}} more={more} store={store} />,
                  verb: "Grow",
                  onYes: () => moves.growPop(tile.id, pop),
                });
              }}
              why={refusal(status, turnBlocked, store)}
            />
          );
        })}
      </div>
    </Panel>
  );
}

/** Raise a building: every building priced for this place, a Port once per good it can claim. */
export function BuildOptions({
  tile,
  name,
  onClose,
  onBuild,
}: {
  tile: HexTile;
  name: string;
  onClose: () => void;
  onBuild: (tileId: string, buildingId: BuildingId, claimVertexId?: string) => void;
}) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const store = G.players[viewerId].resources;
  const claimable = claimableLuxuriesAt(G, tile.id);
  const options = getBuildBuildingOptions(G, viewerId, tile.id).flatMap(
    (option): Array<typeof option & { claim?: LuxuryAsset }> =>
      option.building.id === "port" && claimable.length > 1
        ? claimable.map((asset) => ({ ...option, claim: asset }))
        : [option],
  );

  return (
    <Panel
      aria-label={`Build in ${name}`}
      className="pp-pop is-build ch-settle"
      corners={["tr", "br"]}
      data-exclude
      role="dialog"
    >
      <PanelHead
        closeLabel="Close Build"
        icon="buildings/build"
        onClose={onClose}
        sub="One of each a place"
        title={`Build in ${name}`}
      />
      <div className="pp-pop-body">
        {options.map(({ building, status, claim }) => {
          const cost = status.cost ?? building.cost;
          const why = refusal(status, turnBlocked, store);
          const line = claim
            ? `claims ${luxuryName(G, claim)}`
            : cellLine(G, viewerId, tile, building);
          const label = claim ? `${building.name} · ${luxuryName(G, claim)}` : building.name;
          return (
            <Option
              cost={cost}
              icon={BUILDING_RASTERS[building.id]}
              key={`${building.id}-${claim?.vertexId ?? ""}`}
              line={line}
              name={label}
              onPick={() => {
                onClose();
                ask({
                  icon: BUILDING_RASTERS[building.id],
                  question: `Are you sure you want to raise a ${building.name} in ${name}?`,
                  detail: (
                    <CostDetail
                      cost={cost}
                      more={`${line.charAt(0).toUpperCase()}${line.slice(1)}.`}
                      store={store}
                    />
                  ),
                  verb: "Raise it",
                  onYes: () => onBuild(tile.id, building.id, claim?.vertexId),
                });
              }}
              tip={
                <Tip title={building.name}>
                  <TipBody>{presentBuildingEffects(building.effects).text}</TipBody>
                </Tip>
              }
              why={why}
            />
          );
        })}
      </div>
    </Panel>
  );
}

/** A rival's card: their people, places, mood, gold, titles, Assembly, cards and Ideas. */
export function SeatCard({
  seat,
  onClose,
  onTrade,
}: {
  seat: PlayerId;
  onClose: () => void;
  onTrade: () => void;
}) {
  const { G } = useGameUi();
  const name = PLAYER_GLAZES[seat].name;
  const census = publicCensus(G, seat);
  const titles = victoryStandings(G).filter((standing) => standing.holder === seat);
  const toWin = G.ruleset.victory.cardsToWin;
  const ideas = playerNationalIdeas(G, seat);
  const cards = G.devHands[seat].length;
  const rows: Array<[string, ReactNode]> = [
    [
      "People",
      (["citizens", "freemen", "slaves"] as const)
        .map((pop) => `${census[pop]} ${formatPopLabel(pop, census[pop])}`)
        .join(" · "),
    ],
    [
      "Places",
      `${census.cities} ${census.cities === 1 ? "city" : "cities"} · ${census.colonies} ${census.colonies === 1 ? "colony" : "colonies"}`,
    ],
    ["Happiness", sign(happinessLevel(G, seat))],
    ["Gold", `${G.players[seat].resources.gold} in store`],
    [
      "Titles",
      titles.length
        ? `${titles.map((standing) => standing.card.name).join(", ")}${titles.length >= toWin ? " · wins when their turn starts" : ""}`
        : "None",
    ],
    [
      "Assembly",
      `${victoryMetricValue(G, seat, "voice")} Laws authored · ${currentVoteWeight(G, seat)} votes`,
    ],
    ["Cards", `${cards} development ${cards === 1 ? "card" : "cards"} held`],
    ["Ideas", ideas.map((idea) => idea.name).join(", ") || "None"],
  ];

  return (
    <Panel
      aria-label={`${name}'s card`}
      className="pp-pop is-seat ch-settle"
      corners={["tr", "br"]}
      data-exclude
      role="dialog"
    >
      <PanelHead
        closeLabel={`Close ${name}'s card`}
        coin={seat}
        onClose={onClose}
        sub={`${titles.length} of ${toWin} titles`}
        title={name}
      />
      <dl className="pp-seat">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="pp-k">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <footer className="pp-pop-foot">
        <Lacquer onClick={onTrade}>Offer {name} a trade</Lacquer>
      </footer>
    </Panel>
  );
}
