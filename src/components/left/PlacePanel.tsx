import type { ReactNode } from "react";
import {
  DEMOTE_FROM,
  EMPTY_POPS,
  GROWABLE_POPS,
  POP_TYPES,
  PROMOTE_FROM,
  buildingGround,
  demotionTarget,
  getBuildBuildingOptions,
  getDemotePopStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getLuxuryGood,
  getMovePopsStatus,
  getPromotePopStatus,
  getUpgradeColonyToCityStatus,
  luxuriesBeside,
  luxuryName,
  promotionTarget,
  settlementCapacity,
  settlementNextClassColumn,
  settlementNextYield,
  settlementOpenSlots,
  settlementPopCapacity,
  settlementSlaveResource,
  settlementSlots,
  settlementIdleSlaves,
  settlementWorkingSlaves,
  tileSlaveColumn,
  totalPops,
  usesLeft,
} from "../../game/rules";
import { previewUpgradeColonyToCity } from "../../game/economy/preview";
import { occupiedBuildingSlots } from "../../game/ideaRules";
import { enumerateLegalCommands } from "../../game/legalMoves";
import { isCoastalTile } from "../../game/mapTopology";
import type { ActionStatus } from "../../game/rules";
import type {
  HegemonyState,
  HexTile,
  LuxuryAsset,
  LuxuryGoodId,
  PlayerId,
  PopType,
  Resources,
  Settlement,
} from "../../game/types";
import { cheapestCost } from "../../ui/frameFormat";
import { formatPopLabel } from "../../ui/formatters";
import {
  BUILDING_RASTERS,
  LUXURY_GOOD_RASTERS,
  LUXURY_RASTER,
  POP_RASTERS,
  RESOURCE_RASTERS,
} from "../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNames } from "../../ui/settlementNames";
import { useGameUi } from "../board/GameUiContext";
import { capitalize, getOwnedHoldings } from "../board/helpers";
import { Panel, PanelHead } from "../chrome/Panel";
import { Knob, Lacquer, Plaque } from "../chrome/controls";
import { Socket, SocketMeter } from "../chrome/Socket";
import { useConfirm } from "../chrome/confirmContext";
import { SpendDetail } from "../chrome/confirmDetail";
import { placeChanges } from "../../ui/confirmPreview";
import { Chips, Ico, Tip, TipBody } from "../frame/parts";
import { Tooltip } from "../overlays/Tooltip";
import { composeAnchor, refusal, titleCase } from "./words";
import type { DrawerId } from "./Drawer";
import type { LeftActions } from "./LeftShell";
import { BuildOptions, GrowOptions, SeatCard } from "./PlacePops";

/** What the map last picked: the empty sea, a tile, or a luxury good's mooring. */
export type PlaceSubject =
  { kind: "realm" } | { kind: "tile"; tileId: string } | { kind: "mooring"; vertexId: string };

/** What opens beside the place panel, above the hand's row. */
export type PlacePop = "grow" | "build" | "seat";

const BACK_NAMES: Record<DrawerId, string> = {
  overview: "Realm",
  cities: "Cities",
  people: "People",
  ideas: "Ideas",
  agora: "Agora",
  trade: "Trade",
  victory: "Victory",
  cards: "Cards",
};

type View =
  | { kind: "none" }
  | { kind: "settlement"; tile: HexTile; settlement: Settlement; own: boolean }
  | { kind: "oracle"; tile: HexTile }
  | { kind: "land"; tile: HexTile }
  | { kind: "luxury"; asset: LuxuryAsset };

/** A pick, read against the board: your settlement there first, then a rival's, then the ground. */
function viewOf(G: HegemonyState, viewer: PlayerId, subject: PlaceSubject): View {
  if (subject.kind === "mooring") {
    const asset = G.board.luxuries.find((candidate) => candidate.vertexId === subject.vertexId);
    return asset ? { kind: "luxury", asset } : { kind: "none" };
  }
  if (subject.kind === "realm") return { kind: "none" };
  const tile = G.board.tiles.find((candidate) => candidate.id === subject.tileId);
  if (!tile) return { kind: "none" };
  const own = tile.settlements.find((settlement) => settlement.owner === viewer);
  if (own) return { kind: "settlement", tile, settlement: own, own: true };
  if (tile.settlements[0])
    return { kind: "settlement", tile, settlement: tile.settlements[0], own: false };
  return tile.terrain === "oracle" ? { kind: "oracle", tile } : { kind: "land", tile };
}

/** "Forest, wood": the ground and what its slaves make. */
function groundWords(G: HegemonyState, tile: HexTile) {
  const resource = settlementSlaveResource(tile, G);
  return `${capitalize(tile.terrain)}${resource ? `, ${resource}` : ""}`;
}

/**
 * The place panel: one fixed 604×404 box at the screen's bottom-left, growing out of
 * the sidebar (its head continues the shaft's ink, its icon under the sidebar's
 * buttons). It never changes size between a settlement, a rival's, land, the Oracle
 * or a luxury good; its body scrolls. Every spend asks through the confirm bar.
 */
export function PlacePanel({
  subject,
  back,
  onBack,
  onClose,
  pop,
  onPop,
  actions,
}: {
  subject: PlaceSubject;
  /** The drawer the place was picked from, for the back plaque. */
  back: DrawerId | null;
  onBack: () => void;
  onClose: () => void;
  pop: PlacePop | null;
  onPop: (pop: PlacePop | null) => void;
  actions: LeftActions;
}) {
  const { G, viewerId } = useGameUi();
  const view = viewOf(G, viewerId, subject);
  const names = settlementNames(G.board.tiles);
  if (view.kind === "none") return null;

  const head = {
    back: back ? BACK_NAMES[back] : undefined,
    onBack: back ? onBack : undefined,
    onClose,
  };
  let body: ReactNode;
  let foot: ReactNode = null;
  let headProps: Parameters<typeof PanelHead>[0];
  let label: string;

  if (view.kind === "settlement") {
    const { tile, settlement, own } = view;
    const name = titleCase(names.get(settlement.id) ?? "Polis");
    const owner = PLAYER_GLAZES[settlement.owner].name;
    label = name;
    headProps = own
      ? {
          ...head,
          icon: `settlements/${settlement.kind}`,
          title: name,
          sub: `Your ${settlement.kind} · ${groundWords(G, tile)}`,
          closeLabel: `Close ${name}`,
        }
      : {
          ...head,
          coin: settlement.owner,
          onCoin: () => onPop(pop === "seat" ? null : "seat"),
          coinLabel: `${owner}: open their card`,
          title: name,
          sub: `${owner}'s ${settlement.kind} · ${groundWords(G, tile)}`,
          closeLabel: `Close ${name}`,
        };
    body = (
      <SettlementBody name={name} own={own} onPop={onPop} settlement={settlement} tile={tile} />
    );
    foot = own ? (
      <OwnActions actions={actions} name={name} onPop={onPop} settlement={settlement} tile={tile} />
    ) : (
      <Lacquer
        className="pp-act"
        onClick={() => actions.onCompose(settlement.owner, composeAnchor())}
      >
        <span className="pp-act-n">Offer {owner} a trade</span>
        <span className="pp-act-why">opens the composer, {owner} chosen</span>
      </Lacquer>
    );
  } else if (view.kind === "oracle") {
    label = "The Oracle";
    headProps = { ...head, icon: "terrain/oracle", title: "The Oracle", sub: "Sacred ground" };
    body = (
      <div className="pp-lore">
        <OraclePage />
      </div>
    );
  } else if (view.kind === "land") {
    const { tile } = view;
    label = capitalize(tile.terrain);
    const resource = settlementSlaveResource(tile, G);
    headProps = {
      ...head,
      icon: `terrain/${tile.terrain}`,
      title: capitalize(tile.terrain),
      sub: `Unsettled · ${tile.slots} ${tile.slots === 1 ? "slot" : "slots"}${resource ? ` for ${resource}` : ""}`,
    };
    body = <LandBody tile={tile} />;
    foot = <FoundAction onFound={actions.onFound} tile={tile} />;
  } else {
    const { asset } = view;
    const good = getLuxuryGood(G.definition.content, asset.goodId);
    label = good?.name ?? "Luxury good";
    headProps = {
      ...head,
      icon: LUXURY_GOOD_RASTERS[asset.goodId as LuxuryGoodId] ?? LUXURY_RASTER,
      title: label,
      sub: `Luxury good · ${asset.owner ? `held by ${PLAYER_GLAZES[asset.owner].name}` : "unclaimed"}`,
    };
    body = <LuxuryBody asset={asset} />;
  }

  // Each pick unrolls out of the sidebar afresh.
  const key =
    subject.kind === "tile" ? subject.tileId : subject.kind === "mooring" ? subject.vertexId : "";
  return (
    <>
      <Panel
        aria-label={label}
        className="pp ch-unroll-x"
        corners={["tr"]}
        data-c="place"
        data-exclude
        key={key}
        role="region"
      >
        <PanelHead {...headProps} />
        <div className="pp-body">{body}</div>
        <footer className="pp-foot">{foot}</footer>
      </Panel>
      {view.kind === "settlement" && pop === "grow" && view.own ? (
        <GrowOptions name={label} onClose={() => onPop(null)} tile={view.tile} />
      ) : null}
      {view.kind === "settlement" && pop === "build" && view.own ? (
        <BuildOptions
          name={label}
          onBuild={actions.onBuild}
          onClose={() => onPop(null)}
          tile={view.tile}
        />
      ) : null}
      {view.kind === "settlement" && pop === "seat" && !view.own ? (
        <SeatCard
          onClose={() => onPop(null)}
          onTrade={() => actions.onCompose(view.settlement.owner, composeAnchor())}
          seat={view.settlement.owner}
        />
      ) : null}
    </>
  );
}

/** A small-caps stat over its figure. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pp-stat">
      <span className="pp-k">{label}</span>
      {children}
    </div>
  );
}

const CLASS_ORDER: readonly PopType[] = ["citizens", "freemen", "slaves"];

/** A settlement's facts: people and slots as meters, what it makes, its slots, its classes. */
function SettlementBody({
  tile,
  settlement,
  own,
  name,
  onPop,
}: {
  tile: HexTile;
  settlement: Settlement;
  own: boolean;
  name: string;
  onPop: (pop: PlacePop | null) => void;
}) {
  const { G } = useGameUi();
  const pops = totalPops(settlement.pops);
  const capacity = settlementCapacity(settlement, G);
  const slots = settlementSlots(tile, settlement, G);
  const built = occupiedBuildingSlots(G, settlement);
  const working = settlementWorkingSlaves(tile, settlement, G);
  const idle = settlementIdleSlaves(tile, settlement, G);
  const open = settlementOpenSlots(tile, settlement, G);
  const resource = settlementSlaveResource(tile, G);
  const ground = buildingGround(G, settlement.owner, tile.id);
  const raise = own && ground.raisable > 0 ? () => onPop("build") : undefined;
  const held = luxuriesBeside(G, tile.id)
    .filter((asset) => asset.owner === settlement.owner)
    .map((asset) => luxuryName(G, asset));
  const others = tile.settlements
    .filter((other) => other !== settlement)
    .map((other) => PLAYER_GLAZES[other.owner].name);

  return (
    <>
      <div className="pp-stats">
        <Stat label="People">
          <span className="pp-v">
            {pops}
            <small>/ {capacity}</small>
          </span>
          <SocketMeter label={`People ${pops} of ${capacity}`} n={capacity} value={pops} />
        </Stat>
        <Stat label="Slots used">
          <span className="pp-v">
            {built + working}
            <small>/ {slots}</small>
          </span>
          <SocketMeter
            label={`Slots ${built + working} of ${slots}, ${working} worked`}
            n={Math.max(slots, 1)}
            value={built + working}
            worked={working}
          />
        </Stat>
        {own ? (
          <Stat label="Makes a turn">
            <span className="pp-v pp-makes">
              <Chips
                amounts={settlementNextYield(G, tile, settlement)}
                empty={<small>nothing</small>}
                signed
              />
            </span>
          </Stat>
        ) : (
          <Stat label="Buildings">
            <span className="pp-v">
              {settlement.buildings.length}
              <small>{settlement.buildings.map((id) => capitalize(id)).join(", ") || "none"}</small>
            </span>
          </Stat>
        )}
      </div>
      <div className="pp-two">
        <section aria-label="Slots" className="pp-sec">
          <h3 className="pp-k">Slots · {slots}</h3>
          <div className="pp-slots">
            {settlement.buildings.map((id, i) => (
              <Socket key={`${id}-${i}`} state="filled">
                <Ico path={BUILDING_RASTERS[id]} size="ui" />
                <span>{capitalize(id)}</span>
              </Socket>
            ))}
            {Array.from({ length: working }, (_, i) => (
              <Socket key={`w-${i}`} state="worked">
                <Ico
                  path={resource ? RESOURCE_RASTERS[resource] : "resources/stockpile"}
                  size="ui"
                />
                <span>Worked</span>
              </Socket>
            ))}
            {Array.from({ length: Math.max(0, open - working) }, (_, i) =>
              raise ? (
                <Socket
                  aria-label={`Raise a building in ${name}`}
                  key={`o-${i}`}
                  onClick={raise}
                  state="open"
                >
                  <b aria-hidden="true">+</b>
                  <span>Raise</span>
                </Socket>
              ) : (
                <Socket key={`o-${i}`} state="open">
                  <span>Open</span>
                </Socket>
              ),
            )}
          </div>
        </section>
        <section aria-label="People" className="pp-sec">
          <h3 className="pp-k">People</h3>
          <div className="pp-classes">
            {CLASS_ORDER.map((pop) => (
              <ClassRow
                key={pop}
                name={name}
                own={own}
                pop={pop}
                settlement={settlement}
                tile={tile}
              />
            ))}
          </div>
        </section>
      </div>
      {held.length || others.length || idle ? (
        <p className="pp-note">
          {idle
            ? `${idle} ${idle === 1 ? "slave stands" : "slaves stand"} idle: no slot to work. `
            : ""}
          {held.length ? `Its Port holds ${held.join(", ")}. ` : ""}
          {others.length ? `Shares the tile with ${others.join(", ")}.` : ""}
        </p>
      ) : null}
    </>
  );
}

/** One class here: its count, what it makes here, and (yours) the ladder's knobs. */
function ClassRow({
  tile,
  settlement,
  pop,
  own,
  name,
}: {
  tile: HexTile;
  settlement: Settlement;
  pop: PopType;
  own: boolean;
  name: string;
}) {
  const { G, viewerId, moves, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const count = settlement.pops[pop];
  const column = settlementNextClassColumn(G, tile, settlement, pop);
  const store = G.players[viewerId].resources;
  const left = usesLeft(G, viewerId, "ladder");
  const limit = G.ruleset.turnCaps.ladder;

  const knob = (kind: "promote" | "demote") => {
    const can =
      kind === "promote"
        ? (PROMOTE_FROM as readonly PopType[]).includes(pop)
        : (DEMOTE_FROM as readonly PopType[]).includes(pop);
    const glyph = kind === "promote" ? "▲" : "▼";
    if (!can) {
      const edge = kind === "promote" ? "Top of the ladder" : "Bottom of the ladder";
      return (
        <Tooltip content={<Tip title={edge} />} key={kind}>
          <Knob disabled label={`${edge}: no ${kind} from ${formatPopLabel(pop, 2)}`}>
            {glyph}
          </Knob>
        </Tooltip>
      );
    }
    const to = kind === "promote" ? promotionTarget(pop) : demotionTarget(pop);
    const status = (kind === "promote" ? getPromotePopStatus : getDemotePopStatus)(
      G,
      viewerId,
      tile.id,
      pop,
    );
    const why = refusal(status, turnBlocked, store);
    const what = `${kind} a ${formatPopLabel(pop, 1)} to ${formatPopLabel(to, 1)}`;
    const capLine =
      limit === null ? undefined : `Up to ${limit} ladder moves a turn; ${left} left.`;
    return (
      <Tooltip
        content={
          <Tip title={capitalize(what)}>
            {status.cost ? <TipBody>{`Costs ${costWords(status.cost)}.`}</TipBody> : null}
            {why ? <TipBody>{why}</TipBody> : capLine ? <TipBody>{capLine}</TipBody> : null}
          </Tip>
        }
        key={kind}
      >
        <Knob
          className={why ? "is-short" : undefined}
          disabled={why !== null}
          label={`${capitalize(what)} in ${name}`}
          onClick={() =>
            ask({
              icon: kind === "promote" ? "pops/promote" : "pops/demote",
              question: `Are you sure you want to ${what} in ${name}?`,
              detail: (
                <SpendDetail
                  command={{
                    type: kind === "promote" ? "promotePop" : "demotePop",
                    tileId: tile.id,
                    from: pop,
                  }}
                  cost={status.cost ?? {}}
                  G={G}
                  note={capLine}
                  viewerId={viewerId}
                />
              ),
              verb: capitalize(kind),
              onYes: () =>
                kind === "promote" ? moves.promotePop(tile.id, pop) : moves.demotePop(tile.id, pop),
            })
          }
        >
          {glyph}
        </Knob>
      </Tooltip>
    );
  };

  return (
    <div className="pp-class">
      <Ico path={POP_RASTERS[pop]} size="tile" />
      <span className="pp-class-n">
        <b>{count}</b>
        <span className="pp-k">{formatPopLabel(pop, 2)}</span>
      </span>
      <span className="pp-class-y">
        {column.zeroed ? (
          <span className="lw-quiet">struck by the year</span>
        ) : (
          <Chips
            amounts={column.income}
            empty={<span className="lw-quiet">{count ? "makes nothing" : "none here"}</span>}
            signed
          />
        )}
      </span>
      {own ? <span className="pp-knobs">{[knob("promote"), knob("demote")]}</span> : null}
    </div>
  );
}

/** "2 food, 1 gold". */
const costWords = (cost: Partial<Resources>) =>
  Object.entries(cost)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([resource, n]) => `${n} ${resource}`)
    .join(", ");

/** A footer act: its name, its price, and the engine's reason when it cannot be taken. */
function Act({
  label,
  cost,
  why,
  onClick,
}: {
  label: string;
  cost?: Partial<Resources>;
  why: string | null;
  onClick: () => void;
}) {
  const Control = why ? Plaque : Lacquer;
  return (
    <Tooltip
      content={
        <Tip title={label}>
          <TipBody>
            {why ?? (cost && costWords(cost) ? `Costs ${costWords(cost)}.` : "Ready.")}
          </TipBody>
        </Tip>
      }
      triggerClassName="pp-act-tip"
    >
      <Control
        aria-label={why ? `${label}: ${why}` : label}
        className="pp-act"
        disabled={why !== null}
        onClick={onClick}
      >
        <span className="pp-act-n">
          {label}
          {cost ? <Chips amounts={cost} short={why !== null} /> : null}
        </span>
        {why ? <span className="pp-act-why">{why}</span> : null}
      </Control>
    </Tooltip>
  );
}

/** The quickest of several statuses: the first that can, else the first. */
const pickStatus = (statuses: ActionStatus[]) =>
  statuses.find((status) => status.can) ?? statuses[0];

/** Your settlement's acts: grow here, raise a building or make it a city, move a pop out. */
function OwnActions({
  tile,
  settlement,
  name,
  onPop,
  actions,
}: {
  tile: HexTile;
  settlement: Settlement;
  name: string;
  onPop: (pop: PlacePop | null) => void;
  actions: LeftActions;
}) {
  const { G, viewerId, moves, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const store = G.players[viewerId].resources;

  const grows = GROWABLE_POPS.map((pop) => getGrowPopStatus(G, viewerId, tile.id, pop));
  const grow = pickStatus(grows);
  const growCost = cheapestCost(grows.map((status) => status.cost ?? {}));

  let second: ReactNode;
  if (settlement.kind === "colony") {
    const up = getUpgradeColonyToCityStatus(G, viewerId, tile.id);
    const why = refusal(up, turnBlocked, store);
    second = (
      <Act
        cost={up.cost}
        label="Make it a city"
        onClick={() =>
          ask({
            icon: "settlements/upgrade",
            question: `Are you sure you want to make ${name} a city?`,
            detail: (
              <SpendDetail
                command={{ type: "upgradeColonyToCity", tileId: tile.id }}
                cost={up.cost ?? {}}
                extra={placeChanges(previewUpgradeColonyToCity(G, viewerId, tile.id), tile.id)}
                G={G}
                viewerId={viewerId}
              />
            ),
            verb: "Make it a city",
            onYes: () => moves.upgradeColonyToCity(tile.id),
          })
        }
        why={why}
      />
    );
  } else {
    const options = getBuildBuildingOptions(G, viewerId, tile.id);
    const ground = buildingGround(G, viewerId, tile.id);
    const ready = options.some(({ status }) => status.can);
    // The nearest building out of reach names the shortfall.
    const nearest = options
      .filter(({ status }) => !status.can)
      .reduce<(typeof options)[number] | undefined>(
        (best, option) =>
          !best || gap(store, option.status.cost ?? {}) < gap(store, best.status.cost ?? {})
            ? option
            : best,
        undefined,
      );
    const why =
      turnBlocked ??
      (ground.raisable === 0
        ? "No open slot"
        : ready
          ? null
          : nearest
            ? `Nothing affordable: ${nearest.building.name} is ${refusal(nearest.status, null, store)}`
            : "Nothing to raise");
    second = <Act label="Raise a building" onClick={() => onPop("build")} why={why} />;
  }

  const holdings = getOwnedHoldings(G, viewerId).filter((other) => other.tile.id !== tile.id);
  const moves1 = holdings.flatMap((to) =>
    POP_TYPES.filter((pop) => settlement.pops[pop] > 0).map((pop) =>
      getMovePopsStatus(G, viewerId, tile.id, to.tile.id, { ...EMPTY_POPS, [pop]: 1 }),
    ),
  );
  const move = moves1.length
    ? pickStatus(moves1)
    : {
        can: false,
        reasons: [totalPops(settlement.pops) ? "No other place of yours." : "No one lives here."],
      };

  return (
    <>
      <Act
        cost={growCost}
        label="Grow here"
        onClick={() => onPop("grow")}
        why={refusal(grow, turnBlocked, store)}
      />
      {second}
      <Act
        cost={move.cost}
        label="Move a pop out"
        onClick={() => actions.onMoveOut(tile.id)}
        why={refusal(move, turnBlocked, store)}
      />
    </>
  );
}

/** How far a store is from a price, in units: the nearest building is the smallest gap. */
const gap = (store: Resources, cost: Partial<Resources>) =>
  (Object.entries(cost) as Array<[keyof Resources, number]>).reduce(
    (sum, [resource, n]) => sum + Math.max(0, n - store[resource]),
    0,
  );

/** Unsettled land: what its ground gives, what it would hold, the goods off it. */
function LandBody({ tile }: { tile: HexTile }) {
  const { G } = useGameUi();
  const column = tileSlaveColumn(G, tile);
  const coastal = isCoastalTile(tile, G.board.tiles);
  const goods = G.board.luxuries.filter((asset) => asset.tileIds.includes(tile.id));
  return (
    <ul className="pp-facts">
      <li>
        <Ico path={POP_RASTERS.slaves} size="ui" />
        {column.resource
          ? `Slaves here make ${column.perPop} ${column.resource} each`
          : "Slaves here make nothing: the ground holds buildings"}
      </li>
      <li>
        <Ico path="pops/capacity" size="ui" />
        Room for {settlementPopCapacity("colony", G)} pops as a colony
      </li>
      <li>
        <Ico path="settlements/slot" size="ui" />
        {tile.slots} {tile.slots === 1 ? "slot" : "slots"} · {coastal ? "on the coast" : "inland"}
      </li>
      <li>
        <Ico path={LUXURY_RASTER} size="ui" />
        {goods.length
          ? `Moored here: ${goods.map((asset) => luxuryName(G, asset)).join(", ")}`
          : "No good moored here"}
      </li>
    </ul>
  );
}

/** Found a colony here, through the confirm; the map then asks which pop goes. */
function FoundAction({ tile, onFound }: { tile: HexTile; onFound: (tileId: string) => void }) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const store = G.players[viewerId].resources;
  const found = getFoundColonyStatus(G, viewerId, tile.id);
  const why = refusal(found, turnBlocked, store);
  return (
    <Act
      cost={found.cost}
      label="Found a colony here"
      onClick={() =>
        ask({
          icon: "settlements/found",
          question: `Are you sure you want to found a colony on this ${tile.terrain}?`,
          detail: (
            <SpendDetail
              command={enumerateLegalCommands(G, viewerId).find(
                (command) => command.type === "foundColony" && command.tileId === tile.id,
              )}
              cost={found.cost ?? {}}
              G={G}
              note="Then pick the place a pop leaves from."
              viewerId={viewerId}
            />
          ),
          verb: "Found it",
          onYes: () => onFound(tile.id),
        })
      }
      why={why}
    />
  );
}

/** A luxury good at its mooring: its lore, its worth, its holder, where it is won. */
function LuxuryBody({ asset }: { asset: LuxuryAsset }) {
  const { G } = useGameUi();
  const good = getLuxuryGood(G.definition.content, asset.goodId);
  const names = settlementNames(G.board.tiles);
  const rules = G.ruleset.economy.luxury;
  const shores = asset.tileIds
    .map((id) => G.board.tiles.find((tile) => tile.id === id))
    .flatMap((tile) =>
      tile
        ? [
            tile.settlements[0]
              ? titleCase(names.get(tile.settlements[0].id) ?? "")
              : `the ${tile.terrain}`,
          ]
        : [],
    );
  return (
    <>
      {good ? <p className="pp-lore">{`${good.name}: ${good.flavour}.`}</p> : null}
      <ul className="pp-facts">
        <li>
          <Ico path={RESOURCE_RASTERS.happiness} size="ui" />+{rules.happinessPerGood} happiness
          while active
        </li>
        <li>
          <Ico path={BUILDING_RASTERS.port} size="ui" />
          Won by a Port at {shores.join(" or ")}
        </li>
        <li>
          <Ico path={LUXURY_RASTER} size="ui" />
          {asset.owner ? `Held by ${PLAYER_GLAZES[asset.owner].name}` : "Unclaimed"}
        </li>
      </ul>
    </>
  );
}

/** The oracle: sacred ground that nobody may settle. */
function OraclePage() {
  return (
    <>
      <p className="settle-meta caps">
        <span className="meta-i">
          <Ico path="terrain/oracle" size="chip" />
          oracle
        </span>
        <span className="meta-i">sacred ground</span>
      </p>
      <p className="lore">
        Here the god speaks for every polis and belongs to none. Envoys climb the road with gifts
        and come down with riddles; the wise build their year on the answer.
      </p>
      <p className="lore-rule cap">No one may found, raise or settle on it, by any act or event.</p>
    </>
  );
}
