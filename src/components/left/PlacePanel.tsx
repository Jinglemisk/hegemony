import type { ReactNode } from "react";
import {
  DEMOTE_FROM,
  EMPTY_POPS,
  GROWABLE_POPS,
  POP_TYPES,
  PROMOTE_FROM,
  buildingGround,
  demotionTarget,
  formatPops,
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
import { formatPopLabel, withArticle } from "../../ui/formatters";
import {
  BUILDING_RASTERS,
  LUXURY_GOOD_RASTERS,
  LUXURY_RASTER,
  POP_RASTERS,
  RESOURCE_RASTERS,
} from "../../ui/iconRegistry";
import { arrivingPops } from "../../ui/frameSelectors";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNames } from "../../ui/settlementNames";
import { useGameUi } from "../board/GameUiContext";
import { capitalize, getOwnedHoldings } from "../board/helpers";
import { Panel, PanelHead } from "../chrome/Panel";
import { Knob, Plaque } from "../chrome/controls";
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
import { FoundColonyPopover } from "../board/modals/FoundColonyPopover";

/** What the map last picked: the empty sea, a tile, or a luxury good's mooring. */
export type PlaceSubject =
  { kind: "realm" } | { kind: "tile"; tileId: string } | { kind: "mooring"; vertexId: string };

/** What opens beside the place panel, above the hand's row. */
export type PlacePop = "grow" | "build" | "seat" | "found";

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
  const { G, viewerId, moves } = useGameUi();
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
      <Act
        icon="market/handshake"
        label={`Offer ${owner} a trade`}
        note={`Opens the composer, ${owner} chosen.`}
        onClick={() => actions.onCompose(settlement.owner, composeAnchor())}
        why={null}
      />
    );
  } else if (view.kind === "oracle") {
    label = "The Oracle";
    headProps = {
      ...head,
      icon: "terrain/oracle",
      title: "The Oracle",
      sub: "Sacred ground",
      closeLabel: "Close the Oracle",
    };
    body = <OraclePage tile={view.tile} />;
  } else if (view.kind === "land") {
    const { tile } = view;
    label = capitalize(tile.terrain);
    const resource = settlementSlaveResource(tile, G);
    headProps = {
      ...head,
      icon: `terrain/${tile.terrain}`,
      title: capitalize(tile.terrain),
      sub: `Unsettled · ${tile.slots} ${tile.slots === 1 ? "slot" : "slots"}${resource ? ` for ${resource}` : ""}`,
      closeLabel: `Close ${capitalize(tile.terrain)}`,
    };
    body = <LandBody tile={tile} />;
    foot = <FoundAction onOpen={() => onPop(pop === "found" ? null : "found")} tile={tile} />;
  } else {
    const { asset } = view;
    const good = getLuxuryGood(G.definition.content, asset.goodId);
    label = good?.name ?? "Luxury good";
    headProps = {
      ...head,
      icon: LUXURY_GOOD_RASTERS[asset.goodId as LuxuryGoodId] ?? LUXURY_RASTER,
      title: label,
      sub: `Luxury good · ${asset.owner ? `held by ${PLAYER_GLAZES[asset.owner].name}` : "unclaimed"}`,
      closeLabel: `Close ${label}`,
    };
    body = <LuxuryBody asset={asset} />;
  }

  // The panel unrolls out of the sidebar when it opens; a new pick only changes what
  // it shows. Without acts, the body takes the foot's room: the box keeps its size.
  return (
    <>
      <Panel
        aria-label={label}
        className="pp ch-unroll-x"
        corners={["tr"]}
        data-c="place"
        data-exclude
        role="region"
      >
        <PanelHead {...headProps} />
        <div className="pp-body ch-scroll-fade">{body}</div>
        {foot ? <footer className="pp-foot">{foot}</footer> : null}
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
      {view.kind === "land" && pop === "found" ? (
        <FoundColonyPopover
          onCancel={() => onPop(null)}
          onConfirm={(sourceTileId, popType) => {
            onPop(null);
            moves.foundColony(view.tile.id, sourceTileId, popType);
          }}
          tileId={view.tile.id}
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

/** A small-caps stat over one line: its figure, and its meter beside it. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pp-stat">
      <span className="pp-k">{label}</span>
      <div className="pp-stat-line">{children}</div>
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
  const { G, turnBlocked } = useGameUi();
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
  // Seven sockets or more pack three short rows: the icon stands beside its word there.
  const slotIcon = settlement.buildings.length + Math.max(working, open) >= 7 ? "chip" : "ui";
  const held = luxuriesBeside(G, tile.id)
    .filter((asset) => asset.owner === settlement.owner)
    .map((asset) => luxuryName(G, asset));
  const others = tile.settlements
    .filter((other) => other !== settlement)
    .map((other) => PLAYER_GLAZES[other.owner].name);
  const arriving = arrivingPops(G, tile.id, settlement.owner);
  const coming = totalPops(arriving);
  const filled = settlement.buildings.length + working;
  const buildingNames = settlement.buildings.map((id) => capitalize(id)).join(", ");

  return (
    <>
      <div className="pp-stats">
        <Stat label="People">
          <span className="pp-v">
            {pops}
            <small>/ {capacity}</small>
            {coming ? <small className="pp-coming">+{coming}</small> : null}
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
              <small data-truncates="summary" title={buildingNames || undefined}>
                {buildingNames || "none"}
              </small>
            </span>
          </Stat>
        )}
      </div>
      <div className="pp-two">
        <section aria-label="Slots" className="pp-sec">
          <h3 className="pp-k pp-sec-head">
            Slots · {slots}
            <span className="pp-marks">
              {idle ? (
                <Mark
                  icon={POP_RASTERS.slaves}
                  line={`${idle} ${idle === 1 ? "slave stands" : "slaves stand"} idle: no slot to work.`}
                  word={`${idle} idle`}
                />
              ) : null}
              {held.length ? (
                <Mark
                  icon={LUXURY_RASTER}
                  line={`Its Port holds ${held.join(", ")}.`}
                  word={held.length === 1 ? held[0] : `${held.length} goods`}
                />
              ) : null}
            </span>
          </h3>
          <div className="pp-slots">
            {settlement.buildings.map((id, i) => (
              <Socket key={`${id}-${i}`} state="filled">
                <Ico path={BUILDING_RASTERS[id]} size={slotIcon} />
                <span>{capitalize(id)}</span>
              </Socket>
            ))}
            {Array.from({ length: working }, (_, i) => (
              <Socket key={`w-${i}`} state="worked">
                <Ico
                  path={resource ? RESOURCE_RASTERS[resource] : "resources/stockpile"}
                  size={slotIcon}
                />
                <span>Worked</span>
              </Socket>
            ))}
            {Array.from({ length: Math.max(0, open - working) }, (_, i) =>
              raise ? (
                <RaiseSlot
                  key={`o-${i}`}
                  label={`Raise a building in ${name}, slot ${filled + i + 1} of ${slots}`}
                  lock={turnBlocked}
                  onRaise={raise}
                />
              ) : (
                <Socket key={`o-${i}`} state="open">
                  <span>Open</span>
                </Socket>
              ),
            )}
          </div>
        </section>
        <section aria-label="People" className="pp-sec">
          <h3 className="pp-k pp-sec-head">
            People
            <span className="pp-marks">
              {coming ? (
                <Mark
                  icon="pops/pop-gain"
                  line={`${formatPops(arriving)} ${coming === 1 ? "is" : "are"} on the way here, arriving next turn.`}
                  word={`+${coming} arriving`}
                />
              ) : null}
              {others.length ? (
                <Mark
                  icon="settlements/seal"
                  line={`Shares the tile with ${others.join(", ")}.`}
                  word="Shared"
                />
              ) : null}
            </span>
          </h3>
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
    </>
  );
}

/** A notice on a section's head: a short word, its whole sentence in the tooltip. Not
 *  a stop of its own (it is no control, and too small for one): the sentence is read
 *  with the section's heading. */
function Mark({ icon, word, line }: { icon: string; word: string; line: string }) {
  return (
    <Tooltip
      content={
        <Tip title={word}>
          <TipBody>{line}</TipBody>
        </Tip>
      }
      triggerClassName="pp-mark"
    >
      <Ico path={icon} size="chip" />
      <span aria-hidden="true">{word}</span>
      <span className="visuallyHidden">{line}</span>
    </Tooltip>
  );
}

/** An open slot of yours: raises a building, or says why not while the turn is shut. */
function RaiseSlot({
  label,
  lock,
  onRaise,
}: {
  label: string;
  lock: string | null;
  onRaise: () => void;
}) {
  return (
    <Tooltip
      content={
        <Tip title="Raise a building">
          <TipBody>{lock ?? "Opens the buildings that fit here."}</TipBody>
        </Tip>
      }
      triggerClassName="pp-slot-tip"
    >
      <Socket
        aria-disabled={lock ? true : undefined}
        aria-label={lock ? `${label}: ${lock}` : label}
        onClick={lock ? () => undefined : onRaise}
        state="open"
      >
        <b aria-hidden="true">+</b>
        <span>Raise</span>
      </Socket>
    </Tooltip>
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
    const what = `${kind} ${withArticle(formatPopLabel(pop, 1))} to ${formatPopLabel(to, 1)}`;
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
          disabled={why !== null}
          label={`${capitalize(what)} in ${name}${why ? `: ${why}` : ""}`}
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

/**
 * A footer act: a bronze plaque with its own icon, its verb and its price as a chip.
 * Red lacquer is kept for the one primary act of a moment (End turn, a confirm's
 * yes), so these stay plaques. The reason it can't be taken is in its tooltip and
 * its name; a price the store can't meet reads red.
 */
function Act({
  icon,
  label,
  cost,
  why,
  note,
  onClick,
}: {
  icon: string;
  label: string;
  cost?: Partial<Resources>;
  why: string | null;
  /** What the tooltip says of a free act that can be taken. */
  note?: string;
  onClick: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const priced = cost && costWords(cost) ? cost : undefined;
  const short = priced ? gap(G.players[viewerId].resources, priced) > 0 : false;
  return (
    <Tooltip
      content={
        <Tip title={label}>
          <TipBody>
            {[priced ? `Costs ${costWords(priced)}.` : null, why ?? note]
              .filter(Boolean)
              .join(" ") || "Ready."}
          </TipBody>
        </Tip>
      }
      triggerClassName="pp-act-tip"
    >
      <Plaque
        aria-label={why ? `${label}: ${why}` : label}
        className="pp-act"
        disabled={why !== null}
        onClick={onClick}
      >
        <Ico path={icon} size="ui" />
        {/* One line at every Text size: cut to fit, the tooltip says it whole. */}
        <span className="pp-act-n" data-truncates="summary">
          {label}
        </span>
        {priced ? (
          <span className="pp-act-cost">
            <Chips amounts={priced} short={short} />
          </span>
        ) : null}
      </Plaque>
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
        icon="settlements/upgrade"
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
    second = (
      <Act
        icon="buildings/build"
        label="Raise a building"
        onClick={() => onPop("build")}
        why={why}
      />
    );
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
        icon="pops/pop-gain"
        label="Grow here"
        onClick={() => onPop("grow")}
        why={refusal(grow, turnBlocked, store)}
      />
      {second}
      <Act
        cost={move.cost}
        icon="pops/move"
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

/** Found a colony here: opens the Found pop beside the panel, which asks who goes. */
function FoundAction({ tile, onOpen }: { tile: HexTile; onOpen: () => void }) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const store = G.players[viewerId].resources;
  const found = getFoundColonyStatus(G, viewerId, tile.id);
  return (
    <Act
      cost={found.cost}
      icon="settlements/found"
      label="Found a colony here"
      onClick={onOpen}
      why={refusal(found, turnBlocked, store)}
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

/** The oracle: sacred ground that nobody may settle, in the Land page's rows. */
function OraclePage({ tile }: { tile: HexTile }) {
  const { G } = useGameUi();
  const coastal = isCoastalTile(tile, G.board.tiles);
  return (
    <ul className="pp-facts">
      <li>
        <Ico path="terrain/oracle" size="ui" />
        The god speaks here for every polis and belongs to none
      </li>
      <li>
        <Ico path="settlements/found" size="ui" />
        No one may found, raise or settle on it, by any act or event
      </li>
      <li>
        <Ico path="settlements/slot" size="ui" />
        {tile.slots} {tile.slots === 1 ? "slot" : "slots"} · {coastal ? "on the coast" : "inland"}
      </li>
    </ul>
  );
}
