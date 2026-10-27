import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { sign } from "../../../ui/frameFormat";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import { BUILDING_RASTERS, LUXURY_GOOD_RASTERS, RESOURCE_RASTERS } from "../../../ui/iconRegistry";
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
import type { MapModel, MapMooring, MapSettlement, MapTile } from "./mapModel";
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
/** A flat mark's disc in its owner's colour; without an owner it stays plain. */
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

/** Economy's slot readout, "output / free": what the worked slots make a turn, signed,
 *  and the slots neither built on nor worked. */
function Readout({ output, free }: { output: number; free: number }) {
  return (
    <span className="rd">
      {sign(output)} / {free}
    </span>
  );
}

/** Economy's cards on a settled tile: compact (the slot readout) far and middle; full
 *  close in (the readout, the settlement's net a turn as its ledger prints it, and its
 *  buildings). Two colonies sharing the tile share the card, a row each, so it keeps to
 *  its hex. The card hangs from the foot of the tile's largest seal. */
function EcoCards({ tile }: { tile: MapTile }) {
  const under = tile.settlements.some((s) => s.capital)
    ? "capital"
    : tile.settlements.some((s) => s.kind === "city")
      ? "city"
      : "colony";
  const slots = (s: MapSettlement) => (
    <span className="row">
      {tile.resource ? icon(RESOURCE_RASTERS[tile.resource]) : null}
      <Readout free={s.open} output={s.worksFor} />
    </span>
  );
  return (
    <>
      <div
        className={`lm-eco compact under-${under}`}
        data-alpha="ecoC"
        data-wx={tile.x}
        data-wy={tile.y + MAIN_Z}
      >
        {tile.settlements.map((s, i) => (
          <Fragment key={s.id}>
            {i ? <hr /> : null}
            {slots(s)}
          </Fragment>
        ))}
      </div>
      <div
        className={`lm-eco full under-${under}`}
        data-alpha="ecoF"
        data-wx={tile.x}
        data-wy={tile.y + MAIN_Z}
      >
        {tile.settlements.map((s, i) => {
          const net = RESOURCE_ORDER.filter((k) => s.net[k]);
          return (
            <Fragment key={s.id}>
              {i ? <hr /> : null}
              <span className="en">{s.name}</span>
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

/** Economy's card on an open tile: what a slave would make there, and its slots. The
 *  Oracle's hangs from its seal, which names it. */
function EcoEmpty({ tile, dimmed }: { tile: MapTile; dimmed: boolean }) {
  const oracle = tile.terrain === "oracle";
  return (
    <div
      className={`lm-eco empty${oracle ? " oracle under-colony" : ""}${dimmed ? " is-dimmed" : ""}`}
      data-alpha="ecoE"
      data-wx={tile.x}
      data-wy={tile.y + (oracle ? MAIN_Z : 0.05)}
    >
      {oracle ? (
        <em>Never settled</em>
      ) : (
        <>
          {tile.resource && tile.perSlave ? icon(RESOURCE_RASTERS[tile.resource]) : null}
          <Readout free={tile.slots} output={0} />
        </>
      )}
    </div>
  );
}

/** What each realm shows over its land: its name (Political), its riot over each
 *  burning city and its titles (the events, in Terrain). */
function RealmLabels({ model, layout }: { model: MapModel; layout: Layout }) {
  return model.realms.flatMap((realm: MapRealm) => {
    const tiles = model.tiles.filter((t) => t.settlements.some((s) => s.owner === realm.owner));
    const capital = tiles.find((t) =>
      t.settlements.some((s) => s.owner === realm.owner && s.capital),
    );
    if (!tiles.length) return [];
    // The name hangs under its capital's seal.
    const home = capital ?? tiles[0];
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
        data-wx={home.x}
        data-wy={home.y + 0.3}
        key={`realm-${realm.owner}`}
      >
        <b>{seat.name.toUpperCase()}</b>
        <small>
          {seat.glaze} {seat.blazon} · {cities} {cities === 1 ? "city" : "cities"}, {colonies}{" "}
          {colonies === 1 ? "colony" : "colonies"}
        </small>
      </div>,
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

/**
 * The flat marks every mode but Terrain draws, upright to the camera in place of the 3D
 * models: each settlement's icon on its owner's colour; each Port's icon; and the
 * Oracle's on a plain disc. Political adds a realm's Unrest tokens beside each of its
 * settlements when it holds any.
 */
function Seals({ model, towns, unrest }: { model: MapModel; towns: Town[]; unrest: boolean }) {
  const tokens = new Map(model.realms.map((realm) => [realm.owner, realm.tokens]));
  const settlements = new Map(model.tiles.flatMap((t) => t.settlements.map((s) => [s.id, s])));
  const seal = (kind: string, at: { x: number; z: number }) => ({
    className: `lm-disc seal ${kind}`,
    "data-alpha": "seal",
    "data-wh": H_TILE,
    "data-wx": at.x,
    "data-wy": at.z,
  });
  return (
    <>
      {towns.map((town) => {
        const s = settlements.get(town.settlementId)!;
        const kind = s.capital ? "capital" : s.kind;
        const held = unrest ? (tokens.get(s.owner) ?? 0) : 0;
        const port = town.sites.find((site) => site.building === "port");
        return (
          <Fragment key={`seal-${town.settlementId}`}>
            <div {...seal(kind, town.centre)} style={own(s.owner)}>
              {icon(`settlements/${kind}`)}
              {held ? (
                <span className="lm-tokens">
                  {icon("unrest/unrest")}
                  {held}
                </span>
              ) : null}
            </div>
            {port ? (
              <div {...seal("port", port)} style={own(s.owner)}>
                {icon(BUILDING_RASTERS.port)}
              </div>
            ) : null}
          </Fragment>
        );
      })}
      {model.tiles
        .filter((t) => t.terrain === "oracle")
        .map((t) => (
          <div {...seal("oracle", { x: t.x, z: t.y - 0.08 })} key={`seal-${t.id}`}>
            {icon("terrain/oracle")}
          </div>
        ))}
    </>
  );
}

/** Trade's chip on each Port: the good it holds. It hangs off the Port away from the
 *  good, whose disc it would cover. */
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
        const target = event.target as Element;
        if (dragged() || target.closest("[data-tile-id], .lm-moor")) return;
        const raft =
          target.closest<HTMLElement>("[data-good]")?.dataset.good ??
          runtime.current?.pickMooring(event.clientX, event.clientY);
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
        <Seals model={model} towns={layout.towns} unrest={mode === "political"} />
        {/* Trade's goods, flat in place of their rafts: a disc picks its good too. */}
        {model.moorings.map((m) => (
          <div
            className="lm-disc good"
            data-alpha="goodicon"
            data-good={m.vertexId}
            data-wh="0.05"
            data-wx={m.x}
            data-wy={m.y}
            key={`good-${m.vertexId}`}
            style={own(m.owner)}
          >
            {icon(LUXURY_GOOD_RASTERS[m.goodId])}
          </div>
        ))}
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
            data-alpha={m.owner ? "goodname heldgood" : "goodname"}
            data-hang={hangToSea(m)}
            data-vertex-id={m.vertexId}
            data-wh="0"
            data-wx={m.x}
            data-wy={m.sy < m.vy ? m.y - 0.12 : m.y + 0.12}
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

/** Which way a good's name hangs off its raft: toward the open sea, clear of the two
 *  tiles it is moored between. Between islands a name always hung below lands on land. */
function hangToSea(m: MapMooring) {
  const east = m.sx - m.vx;
  return [m.sy < m.vy ? "up" : "down", east > 0.3 ? "east" : east < -0.3 ? "west" : ""]
    .join(" ")
    .trim();
}

export default memo(LivingMap);
