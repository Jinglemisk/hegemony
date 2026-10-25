import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { sign } from "../../../ui/frameFormat";
import { hexDistance } from "../../../game/mapTopology";
import type { HegemonyState } from "../../../game/types";
import { RESOURCE_LABELS, formatNumber } from "../../../ui/formatters";
import { BUILDING_RASTERS, RESOURCE_RASTERS, UNREST_TIER_RASTERS } from "../../../ui/iconRegistry";
import { rasterIcon } from "../../../ui/icons/placeholders";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { settlementNames } from "../../../ui/settlementNames";
import { Tip, TipLedger } from "../parts";
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

/** A tile's name plate: the settlements on it, their slots, and their pops close in. */
function Plate({ tile, dimmed }: { tile: MapTile; dimmed: boolean }) {
  const [lead] = tile.settlements;
  const alpha =
    lead.kind === "capital"
      ? "plates"
      : lead.kind === "city"
        ? "plates cityplate"
        : "plates colony";
  return (
    <div
      className={`lm-plate ${lead.kind}${lead.capital ? " capital" : ""}${dimmed ? " is-dimmed" : ""}`}
      data-alpha={alpha}
      data-wx={tile.x}
      data-wy={tile.y + 0.42}
    >
      <span className="pl-row">
        <span className="pl-name">
          {tile.settlements.map((s, i) => (
            <Fragment key={s.id}>
              {i ? <i>|</i> : null}
              {s.name}
            </Fragment>
          ))}
        </span>
        <span className="pips">
          {tile.settlements.map((s, i) => (
            <Fragment key={s.id}>
              {i ? <u /> : null}
              <Pips built={s.built} slots={s.slots} worked={s.worked} />
            </Fragment>
          ))}
        </span>
      </span>
      {/* Each settlement's own: two on a tile may have two owners. */}
      <span className="pl-pops">
        {tile.settlements.map((s, i) => (
          <Fragment key={s.id}>
            {i ? <i>|</i> : null}
            {s.pops} {s.pops === 1 ? "pop" : "pops"}
          </Fragment>
        ))}
      </span>
    </div>
  );
}

/** An open tile's yield chip: its slots and its land's resource (the Economy card
 *  says what a slave makes under the standing Laws). */
function Yield({ tile, dimmed }: { tile: MapTile; dimmed: boolean }) {
  const dim = dimmed ? " is-dimmed" : "";
  if (tile.terrain === "oracle") {
    return (
      <div
        className={`lm-yield oracle${dim}`}
        data-alpha="yield"
        data-wx={tile.x}
        data-wy={tile.y + 0.42}
      >
        Oracle · never settled
      </div>
    );
  }
  return (
    <div className={`lm-yield${dim}`} data-alpha="yield" data-wx={tile.x} data-wy={tile.y + 0.05}>
      {tile.slots} {tile.land ? RESOURCE_LABELS[tile.land].toLowerCase() : "slots"}
    </div>
  );
}

/** Each building as a bronze icon on a stem over it: a selected tile's always, every
 *  town's close in on Economy, clear of its tile's chip. */
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
        data-chip-y={tile.y + 0.05}
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

/** Economy's cards on a settled tile: compact (what its slots make, and the slots)
 *  far and middle; full close in (the settlement's net a turn, as its ledger prints
 *  it, and its buildings). Two colonies sharing the tile share the card, a row each,
 *  so it keeps to its hex. */
function EcoCards({ tile }: { tile: MapTile }) {
  const makes = (s: MapSettlement) =>
    tile.resource ? (
      <>
        {icon(RESOURCE_RASTERS[tile.resource])}+{formatNumber(s.worksFor)}
      </>
    ) : (
      <em>no yield</em>
    );
  return (
    <>
      <div className="lm-eco compact" data-alpha="ecoC" data-wx={tile.x} data-wy={tile.y + 0.05}>
        {tile.settlements.map((s, i) => (
          <Fragment key={s.id}>
            {i ? <hr /> : null}
            <span className="row">
              {makes(s)}
              <span className="pips">
                <Pips built={s.built} slots={s.slots} worked={s.worked} />
              </span>
            </span>
          </Fragment>
        ))}
      </div>
      <div className="lm-eco full" data-alpha="ecoF" data-wx={tile.x} data-wy={tile.y - 0.02}>
        {tile.settlements.map((s, i) => {
          const net = RESOURCE_ORDER.filter((k) => s.net[k]);
          return (
            <Fragment key={s.id}>
              {i ? <hr /> : null}
              <span className="en">{s.name}</span>
              <span className="pips">
                <Pips built={s.built} slots={s.slots} worked={s.worked} />
              </span>
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

/** Economy's card on an open tile: its slots, and what a slave would make there. */
function EcoEmpty({ tile, dimmed }: { tile: MapTile; dimmed: boolean }) {
  const oracle = tile.terrain === "oracle";
  return (
    <div
      className={`lm-eco empty${oracle ? " oracle" : ""}${dimmed ? " is-dimmed" : ""}`}
      data-alpha="ecoE"
      data-wx={tile.x}
      data-wy={tile.y + (oracle ? 0.42 : 0.05)}
    >
      {oracle ? (
        <em>Oracle · 0 slots, never settled</em>
      ) : (
        <>
          {tile.resource && tile.perSlave ? icon(RESOURCE_RASTERS[tile.resource]) : null}
          {tile.slots} slots
          {tile.resource && tile.perSlave ? null : <em>no yield</em>}
        </>
      )}
    </div>
  );
}

/** What each realm shows over its land: its name (Political), its level and tier
 *  (Unrest), its riot over each burning city and its titles (the events, in Terrain). */
function RealmLabels({ model, layout }: { model: MapModel; layout: Layout }) {
  return model.realms.flatMap((realm: MapRealm) => {
    const tiles = model.tiles.filter((t) => t.settlements.some((s) => s.owner === realm.owner));
    const capital = tiles.find((t) =>
      t.settlements.some((s) => s.owner === realm.owner && s.capital),
    );
    if (!tiles.length) return [];
    // The name sits over the capital's own stretch of land: the tiles joined to it.
    const home = [capital ?? tiles[0]];
    for (const t of home)
      for (const n of tiles) if (!home.includes(n) && hexDistance(n, t) === 1) home.push(n);
    const seat = PLAYER_GLAZES[realm.owner];
    const { cities, colonies } = realm.census;
    const at = (t: { x: number; y: number }, h: number) => ({
      "data-wx": t.x,
      "data-wy": t.y + MAIN_Z,
      "data-wh": h,
    });
    return [
      <div
        className="lm-realm"
        data-alpha="realm"
        data-wx={home.reduce((n, t) => n + t.x, 0) / home.length}
        data-wy={home.reduce((n, t) => n + t.y, 0) / home.length}
        key={`realm-${realm.owner}`}
      >
        <b>{seat.name.toUpperCase()}</b>
        <small>
          {seat.glaze} {seat.blazon} · {cities} {cities === 1 ? "city" : "cities"}, {colonies}{" "}
          {colonies === 1 ? "colony" : "colonies"}
        </small>
      </div>,
      capital ? (
        <div
          className="lm-chip"
          data-alpha="unrest"
          data-tier={realm.tier}
          {...at(capital, 0.95)}
          key={`unrest-${realm.owner}`}
        >
          {icon(
            realm.tier === "calm" ? RESOURCE_RASTERS.happiness : UNREST_TIER_RASTERS[realm.tier],
          )}
          {seat.name} {sign(realm.happiness)}
          {/* At the riot or revolt line, the chip says what ending the turn sets off. */}
          <small>
            · {realm.riot ?? realm.tier}
            {realm.tokens
              ? ` · ${realm.tokens} Unrest ${realm.tokens === 1 ? "token" : "tokens"}`
              : ""}
          </small>
        </div>
      ) : null,
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

/** Trade's chip over each Port: the good it holds. */
function PortChips({ towns, model }: { towns: Town[]; model: MapModel }) {
  return towns.flatMap((town) =>
    town.sites
      .filter((site) => site.building === "port")
      .map((site) => {
        const good = model.moorings.find((m) => m.claimedBy === town.settlementId);
        return (
          <div
            className="lm-chip"
            data-alpha="port"
            data-wh={H_TILE + 0.3}
            data-wx={site.x}
            data-wy={site.z}
            key={`port-${town.settlementId}`}
          >
            {icon("resources/luxury")}
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

  const [hover, setHover] = useState<{ tileId: string; rect: DOMRect } | null>(null);
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

  // The badges follow the selection, so the labels are collected again with it.
  useLayoutEffect(() => {
    runtime.current?.setModel(model, layout);
    runtime.current?.collect();
  }, [model, layout, selectedTileId]);

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
        if (dragged() || (event.target as Element).closest("[data-tile-id], .lm-moor")) return;
        const raft = runtime.current?.pickMooring(event.clientX, event.clientY);
        if (raft) onMooringAction?.(raft);
        else onBackgroundAction?.();
      }}
      ref={stageRef}
      role="application"
      tabIndex={0}
    >
      <p className="visuallyHidden" id="lm-help">
        Drag to pan. Wheel or pinch to zoom toward the pointer. Keys 1 to 5 switch the map mode. Q
        and E turn the map up to 15° either way. With the map focused, arrows pan, + and − zoom, 0
        returns to the opening view. Tab once more to walk the tiles with the arrow keys; Enter
        picks one.
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
        {model.tiles.map((tile) =>
          tile.land ? (
            <div
              className={`lm-far${candidates && !candidates.has(tile.id) ? " is-dimmed" : ""}`}
              data-alpha="faryield"
              data-far=""
              data-wx={tile.x}
              data-wy={tile.y}
              key={`far-${tile.id}`}
            >
              <b>{tile.slots}</b>
              <img alt="" src={rasterIcon(RESOURCE_RASTERS[tile.land])} />
            </div>
          ) : null,
        )}
        {model.tiles.map((tile) => {
          const dimmed = Boolean(candidates && !candidates.has(tile.id));
          return tile.settlements.length ? (
            <Fragment key={tile.id}>
              <Plate dimmed={dimmed} tile={tile} />
              <EcoCards tile={tile} />
            </Fragment>
          ) : (
            <Fragment key={tile.id}>
              <Yield dimmed={dimmed} tile={tile} />
              <EcoEmpty dimmed={dimmed} tile={tile} />
            </Fragment>
          );
        })}
        <RealmLabels layout={layout} model={model} />
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
            data-alpha="goodname"
            data-vertex-id={m.vertexId}
            data-wh="0"
            data-wx={m.x}
            data-wy={m.y + 0.12}
            key={m.vertexId}
            onClick={() => {
              if (!dragged()) onMooringAction?.(m.vertexId);
            }}
            type="button"
          >
            <span className="m-name">
              {m.owner ? (
                <b style={{ "--own": PLAYER_GLAZES[m.owner].color } as CSSProperties} />
              ) : null}
              <span>
                {m.name}
                {m.owner ? null : <small>unclaimed</small>}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div aria-hidden="true" className="lm-compass">
        <b>N</b>
        <i />
      </div>
      {hover && tip ? (
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
