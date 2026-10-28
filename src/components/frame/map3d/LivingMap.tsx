import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { sign } from "../../../ui/frameFormat";
import type { HegemonyState, PlayerId } from "../../../game/types";
import type { LeanSide } from "../../../game/trade";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import { BUILDING_RASTERS, LUXURY_GOOD_RASTERS, RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { rasterIcon } from "../../../ui/icons/placeholders";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { settlementNames } from "../../../ui/settlementNames";
import { Tooltip } from "../../overlays/Tooltip";
import { Tip, TipBody, TipLedger } from "../parts";
import { BoardTip } from "./BoardTip";
import { H_TILE } from "./camera";
import { MAIN_Z, layoutMap } from "./layout";
import type { Layout, Town } from "./layout";
import { boardShape, mapModel, shapeKey } from "./mapModel";
import type { MapModel, MapSettlement, MapTile } from "./mapModel";
import { MAP_MODES } from "./modes";
import type { MapMode, MapRealm } from "./modes";
import { createRuntime } from "./runtime";
import type { Runtime } from "./runtime";
import { ARROWS, tileTip } from "./tileTip";
import "../../../styles/frame/map3d.css";

/**
 * The living map: the island as a three.js board, in the map mode (the shell's view
 * state). The scene draws the board; over it sit the HTML labels, upright at every
 * angle, and one real button per tile, clipped to the hex as drawn, so clicks, focus,
 * screen readers and the shell's popover anchors work on the tiles themselves. Every
 * mode's labels are drawn at once; the zoom bands and the mode fade each kind in or out.
 */

type BoardProps = {
  G: HegemonyState;
  mode: MapMode;
  selectedTileId: string | null;
  highlightTileIds?: readonly string[];
  placementActive?: boolean;
  onTileAction: (tileId: string) => void;
  /** A click on the sea, not on a tile or a mooring. */
  onBackgroundAction?: () => void;
  onMooringAction?: (vertexId: string) => void;
  /** The player moved the map: anything anchored to a tile's old position is stale. */
  onViewChange?: () => void;
};

const icon = (path: string) => <img alt="" src={rasterIcon(path)} />;
/** A mark in its owner's colour; without an owner it stays plain. */
const own = (owner: PlayerId | null) =>
  owner ? ({ "--own": PLAYER_GLAZES[owner].color } as CSSProperties) : undefined;

/** A settlement's slots as pips: built, worked by a slave, or open. */
function Pips({ built, worked, slots }: { built: number; worked: number; slots: number }) {
  return (
    <>
      {Array.from({ length: slots }, (_, i) => (
        <i className={i < built ? "b" : i < built + worked ? "w" : undefined} key={i} />
      ))}
    </>
  );
}

/** A tile's resource badge on its centre, one ivory plate: its slots and its land's
 *  resource (a slot where the land makes nothing). The same at both bands and in every
 *  mode; who holds the tile is its paint (the runtime's). */
function ResBadge({ tile }: { tile: MapTile }) {
  return (
    <div className="lm-res">
      <b>{tile.slots}</b>
      {icon(tile.land ? RESOURCE_RASTERS[tile.land] : "settlements/slot")}
    </div>
  );
}

/** A tile's name plate, one line: the settlements on it and, close in, each one's slots
 *  as pips and its pops. A capital's shows at both bands, the rest close in; a pick's
 *  candidate's at any zoom (`asked`). Trade's hint hangs under a capital's. */
function Plate({ tile, asked, hint }: { tile: MapTile; asked: boolean; hint?: ReactNode }) {
  const [lead] = tile.settlements;
  return (
    <div className={`lm-plate${lead.capital ? " capital" : ""}${asked ? " is-asked" : ""}`}>
      {hint}
      {/* Each settlement's own: two on a tile may have two owners. */}
      {tile.settlements.map((s, i) => (
        <Fragment key={s.id}>
          {i ? <u /> : null}
          <span className="pl-name">{s.name}</span>
          <span className="pips">
            <Pips built={s.built} slots={s.slots} worked={s.worked} />
          </span>
          <span className="pl-pops">
            {icon("pops/crowd")}
            {s.pops}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** Whether a slave here makes something other than the land's resource, which the badge
 *  above shows (Land Reform: food everywhere): then Economy's readout names it. */
const worksOther = (tile: MapTile) => tile.resource !== null && tile.resource !== tile.land;

/** Economy's slot readout, "output / free": what the worked slots make a turn, signed,
 *  and the slots neither built on nor worked. */
function Readout({ output, free }: { output: number; free: number }) {
  return (
    <span className="rd">
      {sign(output)} / {free}
    </span>
  );
}

/** Economy's cards on a settled tile: compact in the overview (the slot readout); full
 *  close in, where the hexes have room for it (the readout, the settlement's net a turn
 *  as its ledger prints it, and its buildings). The readout leads both, so it stays put
 *  as they cross. Two colonies sharing the tile share the card, a block each, in the
 *  order of their icons on the badge. */
function EcoCards({ tile }: { tile: MapTile }) {
  const slots = (s: MapSettlement) => (
    <span className="row">
      {worksOther(tile) ? icon(RESOURCE_RASTERS[tile.resource!]) : null}
      <Readout free={s.open} output={s.worksFor} />
    </span>
  );
  return (
    <>
      <div className="lm-eco compact">
        {tile.settlements.map((s, i) => (
          <Fragment key={s.id}>
            {i ? <hr /> : null}
            {slots(s)}
          </Fragment>
        ))}
      </div>
      <div className="lm-eco full">
        {tile.settlements.map((s, i) => {
          const net = RESOURCE_ORDER.filter((k) => s.net[k]);
          return (
            <Fragment key={s.id}>
              {i ? <hr /> : null}
              {slots(s)}
              {net.length ? (
                <span className="row">
                  {net.map((k) => (
                    <Fragment key={k}>
                      {icon(RESOURCE_RASTERS[k])}
                      {sign(s.net[k])}
                    </Fragment>
                  ))}
                </span>
              ) : null}
              {s.buildings.length ? (
                <span className="row">
                  {s.buildings.map((b) => (
                    <Fragment key={b}>{icon(BUILDING_RASTERS[b])}</Fragment>
                  ))}
                </span>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </>
  );
}

/** Economy's card on an open tile: what its slots make (nothing yet) over its free
 *  slots. */
function EcoEmpty({ tile }: { tile: MapTile }) {
  return (
    <div className="lm-eco empty">
      {worksOther(tile) && tile.perSlave ? icon(RESOURCE_RASTERS[tile.resource!]) : null}
      <Readout free={tile.slots} output={0} />
    </div>
  );
}

/** Political's realm name, under its capital in place of the capital's plate, with its
 *  Unrest tokens when it holds any; close in, its glaze and counts. */
function RealmName({ realm }: { realm: MapRealm }) {
  const seat = PLAYER_GLAZES[realm.owner];
  const { cities, colonies } = realm.census;
  return (
    <div className="lm-realm">
      <span className="rn">
        <b>{seat.name.toUpperCase()}</b>
        {realm.tokens ? (
          <span className="lm-tokens">
            {icon("unrest/unrest")}
            {realm.tokens}
          </span>
        ) : null}
      </span>
      <small>
        {seat.glaze} {seat.blazon} · {cities} {cities === 1 ? "city" : "cities"}, {colonies}{" "}
        {colonies === 1 ? "colony" : "colonies"}
      </small>
    </div>
  );
}

/** Trade's hint under a realm's capital: what it has to export (a red arrow out) and
 *  what it needs to import (a green arrow in). Its tip says why; hovering it is hovering
 *  the capital. */
function Hint({ realm, onHover }: { realm: MapRealm; onHover: (rect: DOMRect | null) => void }) {
  const { exports, imports } = realm.lean;
  if (!exports && !imports) return null;
  const side = (way: "out" | "in", s: LeanSide | null) =>
    s ? (
      <span className={`lean ${way}`}>
        <b>{way === "out" ? "↑" : "↓"}</b>
        {icon(RESOURCE_RASTERS[s.resource])}
      </span>
    ) : null;
  return (
    <div
      className="lm-hint"
      data-hint-tile={realm.home ?? undefined}
      onPointerEnter={(event) => onHover(event.currentTarget.getBoundingClientRect())}
      onPointerLeave={() => onHover(null)}
    >
      {side("out", exports)}
      {side("in", imports)}
    </div>
  );
}

/** The hint's tip: each side said with its numbers. */
function hintRows({ lean }: MapRealm) {
  const row = (key: string, verb: string, s: LeanSide | null) =>
    s
      ? [
          {
            key,
            icon: RESOURCE_RASTERS[s.resource],
            label: `${verb} ${RESOURCE_LABELS[s.resource].toLowerCase()}`,
            value: `${sign(s.income)} a turn, holds ${s.stock}`,
          },
        ]
      : [];
  return [...row("out", "Exports", lean.exports), ...row("in", "Imports", lean.imports)];
}

/**
 * Each tile's tag, anchored on its hex's centre: its resource badge, and under it what
 * the mode hangs there (a plate, the realm's name, Economy's card; the Oracle's chip).
 * Under a realm's capital's plate, Trade's hint. One anchor, so nothing jumps when the
 * zoom crosses the threshold or the mode changes.
 */
function TileTag({
  tile,
  realm,
  dimmed,
  asked,
  onHint,
}: {
  tile: MapTile;
  realm: MapRealm | undefined;
  dimmed: boolean;
  asked: boolean;
  onHint: (realm: MapRealm, rect: DOMRect | null) => void;
}) {
  const oracle = tile.terrain === "oracle";
  return (
    <div
      className={`lm-tag${dimmed ? " is-dimmed" : ""}`}
      data-far=""
      data-wx={tile.x}
      data-wy={tile.y}
    >
      {/* Before the badge, so the badge, drawn after it, lies over its tucked top edge. */}
      <div className="lm-under">
        {oracle ? (
          <div className="lm-oracle">Oracle · never settled</div>
        ) : tile.settlements.length ? (
          <>
            <Plate
              asked={asked}
              hint={realm ? <Hint onHover={(rect) => onHint(realm, rect)} realm={realm} /> : null}
              tile={tile}
            />
            <EcoCards tile={tile} />
            {realm ? <RealmName realm={realm} /> : null}
          </>
        ) : (
          <EcoEmpty tile={tile} />
        )}
      </div>
      {oracle ? null : <ResBadge tile={tile} />}
    </div>
  );
}

/** Each building as a bronze icon on a stem over it: a selected tile's always, every
 *  town's close in on Economy, above its tile's badge. */
function Badges({
  towns,
  model,
  selected,
}: {
  towns: Town[];
  model: MapModel;
  selected: string | null;
}) {
  return towns.flatMap((town) => {
    const tile = model.tiles.find((t) => t.id === town.tileId)!;
    return town.sites.map((site) => (
      <div
        className="lm-badge"
        data-alpha={town.tileId === selected ? undefined : "building"}
        data-chip-x={tile.x}
        data-chip-y={tile.y}
        data-wh={H_TILE + (site.building === "port" ? 0.19 : 0.24)}
        data-wx={site.x}
        data-wy={site.z}
        key={`badge-${town.settlementId}-${site.building}`}
      >
        {icon(BUILDING_RASTERS[site.building])}
      </div>
    ));
  });
}

/** The events over a realm's towns: its riot over each burning city and its titles
 *  over its capital. */
function RealmEvents({ model, layout }: { model: MapModel; layout: Layout }) {
  return model.realms.flatMap((realm: MapRealm) => {
    const capital = model.tiles.find((t) =>
      t.settlements.some((s) => s.owner === realm.owner && s.capital),
    );
    const at = (t: { x: number; y: number }, h: number) => ({
      "data-wx": t.x,
      "data-wy": t.y + MAIN_Z,
      "data-wh": h,
    });
    return [
      capital && realm.titles ? (
        <div
          className="lm-chip"
          data-alpha="event"
          {...at(capital, 0.92)}
          key={`titles-${realm.owner}`}
        >
          {icon("victory/laurel")}
          {realm.titles} titles
        </div>
      ) : null,
      ...layout.riots
        .filter((riot) => riot.owner === realm.owner)
        .map((riot) => (
          <div
            className="lm-chip"
            data-alpha="event"
            {...at({ x: riot.x, y: riot.z }, 1.05)}
            key={`riot-${riot.x},${riot.z}`}
          >
            {icon("unrest/riot")}
            {realm.riot === "revolt" ? "Revolt" : "Riot"} {sign(realm.happiness)}
          </div>
        )),
    ];
  });
}

/** Trade's chip on each Port: the good it holds. It hangs off the Port away from the
 *  good's raft and name. */
function PortChips({ towns, model }: { towns: Town[]; model: MapModel }) {
  return towns.flatMap((town) =>
    town.sites
      .filter((site) => site.building === "port")
      .map((site) => {
        const good = model.moorings.find((m) => m.claimedBy === town.settlementId);
        const below = good ? good.y < site.z : false;
        return (
          <div
            className="lm-chip"
            data-alpha="port"
            data-hang={below ? "down" : undefined}
            data-wh={below ? H_TILE : H_TILE + 0.3}
            data-wx={site.x}
            data-wy={site.z}
            key={`port-${town.settlementId}`}
          >
            {icon(good ? LUXURY_GOOD_RASTERS[good.goodId] : BUILDING_RASTERS.port)}
            {good ? `Port · ${good.name}` : "Port"}
          </div>
        );
      }),
  );
}

function LivingMap({
  G,
  mode,
  selectedTileId,
  highlightTileIds,
  placementActive = false,
  onTileAction,
  onBackgroundAction,
  onMooringAction,
  onViewChange,
}: BoardProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const runtime = useRef<Runtime | null>(null);
  const names = useMemo(() => settlementNames(G.board.tiles), [G.board.tiles]);
  // The scene is built once per board shape, not each time a piece moves.
  const key = shapeKey(G.board.tiles);
  const shape = useMemo(() => boardShape(key), [key]);
  const model = useMemo(() => mapModel(G, shape, names), [G, shape, names]);
  const layout = useMemo(() => layoutMap(model, G.seed), [model, G.seed]);
  const candidates = useMemo(
    () => (placementActive ? new Set(highlightTileIds ?? []) : null),
    [placementActive, highlightTileIds],
  );

  // A tile hovered, or a realm's trade hint.
  const [hover, setHover] = useState<{ tileId: string; rect: DOMRect; hint?: MapRealm } | null>(
    null,
  );
  const homes = useMemo(
    () => new Map(model.realms.flatMap((realm) => (realm.home ? [[realm.home, realm]] : []))),
    [model],
  );
  const onHint = (realm: MapRealm, rect: DOMRect | null) => {
    if (!rect) setHover(null);
    else if (!runtime.current?.isMoving()) setHover({ tileId: realm.home!, rect, hint: realm });
  };
  const [roving, setRoving] = useState<string | null>(null);
  // The tile the keyboard is on, ringed only when focus came by keyboard.
  const [focusRing, setFocusRing] = useState<string | null>(null);

  const viewChange = useRef(onViewChange);
  useLayoutEffect(() => {
    viewChange.current = onViewChange;
  });

  useLayoutEffect(() => {
    const made = createRuntime({
      stage: stageRef.current!,
      shape,
      onViewChange: () => {
        setHover(null);
        viewChange.current?.();
      },
    });
    runtime.current = made;
    return () => {
      made.dispose();
      runtime.current = null;
    };
  }, [shape]);

  // The heavy work (the fit, the shaders) waits for the passive pass; see `start`.
  useEffect(() => runtime.current?.start(), [shape]);

  // The badges follow the selection and the plates a pick's candidates, so the labels
  // are collected again with them.
  useLayoutEffect(() => {
    runtime.current?.setModel(model, layout);
    runtime.current?.collect();
  }, [model, layout, selectedTileId, candidates]);

  useLayoutEffect(() => {
    runtime.current?.setMode(mode);
  }, [shape, mode]);

  useLayoutEffect(() => {
    runtime.current?.setMarks({ selected: selectedTileId, focus: focusRing, candidates });
  }, [shape, selectedTileId, focusRing, candidates]);

  const tabStop =
    (roving && model.tiles.some((tile) => tile.id === roving) ? roving : null) ??
    selectedTileId ??
    model.tiles[0]?.id ??
    null;
  const dragged = () => runtime.current?.wasDrag() ?? false;
  const hoverTile = hover ? G.board.tiles.find((tile) => tile.id === hover.tileId) : undefined;
  const tip = hoverTile ? tileTip(G, hoverTile, names) : null;

  return (
    <div
      aria-describedby="lm-help"
      aria-label="The island"
      aria-roledescription="map"
      className="living-map"
      onClick={(event) => {
        // A drag that ends on the sea is a pan; a click on a tile or a good is theirs.
        const target = event.target as Element;
        if (dragged() || target.closest("[data-tile-id], .lm-moor, .lm-compass")) return;
        // A trade hint stands for its capital.
        const home = target.closest<HTMLElement>("[data-hint-tile]")?.dataset.hintTile;
        if (home) {
          onTileAction(home);
          return;
        }
        const raft = runtime.current?.pickMooring(event.clientX, event.clientY);
        if (raft) onMooringAction?.(raft);
        else onBackgroundAction?.();
      }}
      ref={stageRef}
      role="application"
      tabIndex={0}
    >
      <p className="visuallyHidden" id="lm-help">
        Drag to pan. Wheel or pinch to zoom toward the pointer. Keys 1 to 4 switch the map mode. Q
        and E turn the map up to 15° either way. With the map focused, arrows pan, + and − zoom, 0
        or the compass returns to the opening view. Tab once more to walk the tiles with the arrow
        keys; Enter picks one.
      </p>
      {/* A mode switched by its key is said, with what it shows. */}
      <p className="visuallyHidden" role="status">
        {MAP_MODES.filter((m) => m.id === mode).map((m) => `${m.label} map. ${m.note}`)}
      </p>
      <div aria-label="Tiles" className="lm-tiles" role="group">
        {model.tiles.map((tile) => (
          <button
            aria-label={tile.labels[mode]}
            className="lm-tile"
            data-tile={tile.id}
            data-tile-id={tile.id}
            key={tile.id}
            onBlur={() => setFocusRing(null)}
            onClick={() => {
              if (!dragged()) onTileAction(tile.id);
            }}
            onFocus={(event) => {
              setRoving(tile.id);
              setFocusRing(event.currentTarget.matches(":focus-visible") ? tile.id : null);
            }}
            onKeyDown={(event) => {
              if (event.key in ARROWS) {
                event.preventDefault();
                const next = runtime.current?.rove(tile.id, event.key);
                if (!next) return;
                setRoving(next);
                stageRef.current
                  ?.querySelector<HTMLElement>(`.lm-tile[data-tile-id="${next}"]`)
                  ?.focus({ preventScroll: true });
                runtime.current?.reveal(next);
              }
            }}
            onPointerEnter={(event) => {
              if (runtime.current?.isMoving()) return;
              setHover({ tileId: tile.id, rect: event.currentTarget.getBoundingClientRect() });
            }}
            onPointerLeave={() => setHover(null)}
            tabIndex={tile.id === tabStop ? 0 : -1}
            type="button"
          />
        ))}
      </div>
      <div aria-hidden="true" className="lm-overlay">
        {model.tiles.map((tile) => (
          <TileTag
            asked={Boolean(candidates?.has(tile.id))}
            dimmed={Boolean(candidates && !candidates.has(tile.id))}
            key={tile.id}
            onHint={onHint}
            realm={homes.get(tile.id)}
            tile={tile}
          />
        ))}
        <RealmEvents layout={layout} model={model} />
        <PortChips model={model} towns={layout.towns} />
        <Badges model={model} selected={selectedTileId} towns={layout.towns} />
        {layout.ships.map((ship, i) => (
          <div
            className="lm-ship"
            data-alpha="ship"
            data-ship={i}
            data-wh="0.3"
            data-wx={ship.route[0].x}
            data-wy={ship.route[0].z}
            key={ship.id}
          >
            {ship.label}
          </div>
        ))}
      </div>
      <div className="lm-moorings">
        {model.moorings.map((m) => (
          <button
            aria-label={m.label}
            className="lm-moor"
            data-vertex-id={m.vertexId}
            data-wh="0"
            data-wx={m.x}
            data-wy={m.y}
            key={m.vertexId}
            onClick={() => {
              if (!dragged()) onMooringAction?.(m.vertexId);
            }}
            type="button"
          >
            {/* The good's icon on its raft, ringed in its holder's colour once claimed,
                the holder's seat mark under it; its name under that. */}
            <b style={own(m.owner)}>{icon(LUXURY_GOOD_RASTERS[m.goodId])}</b>
            {m.owner ? <i style={own(m.owner)}>{PLAYER_GLAZES[m.owner].blazon}</i> : null}
            <span className="m-name">{m.name}</span>
          </button>
        ))}
      </div>
      {/* The compass turns with the map, and a click brings back the opening view. */}
      <Tooltip
        content={
          <Tip title="Compass">
            <TipBody>
              Click it or press <kbd>0</kbd> for the opening view. With the map focused,{" "}
              <kbd>Q</kbd> and <kbd>E</kbd> turn it.
            </TipBody>
          </Tip>
        }
        triggerClassName="lm-compass-anchor"
      >
        <button
          aria-keyshortcuts="0"
          aria-label="Compass: back to the opening view"
          className="lm-compass"
          onClick={() => {
            if (!dragged()) runtime.current?.reset();
          }}
          type="button"
        >
          <b aria-hidden="true">N</b>
          <i aria-hidden="true" />
        </button>
      </Tooltip>
      {hover?.hint ? (
        <BoardTip anchor={hover.rect}>
          <Tip title={`${PLAYER_GLAZES[hover.hint.owner].name}'s trade`}>
            <TipBody>
              What the realm makes most beyond its needs, and what it runs short of soonest, by its
              income a turn and its stock.
            </TipBody>
            <TipLedger rows={hintRows(hover.hint)} />
          </Tip>
        </BoardTip>
      ) : hover && tip ? (
        <BoardTip anchor={hover.rect}>
          <Tip title={tip.title}>
            <TipLedger rows={tip.rows} />
          </Tip>
        </BoardTip>
      ) : null}
    </div>
  );
}

export default memo(LivingMap);
