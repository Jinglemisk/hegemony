import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { getLuxuryGood } from "../../../game/content";
import { settlementBuildingSlots } from "../../../game/rules";
import type { Ruleset } from "../../../game/ruleset";
import { luxuryEligibleVertices } from "../../../game/mapTopology";
import type { HegemonyState, HexTile, PopType, Settlement } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { hexCenter, hexPoints, luxuryMarkerPosition, vertexCenter } from "../../../ui/hexGeometry";
import { rasterIcon } from "../../../ui/icons/placeholders";
import { settlementNames } from "../../../ui/settlementNames";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import {
  LuxuryVertexMarker,
  MOORING_LABEL_X,
  MOORING_RADIUS,
} from "../../board/map/LuxuryVertexMarker";
import { fitIsland } from "./fit";
import type { IslandFit, UnitBox } from "./fit";

/**
 * The island, after the Hybrid arc mock: a canvas the player drags to pan and
 * wheels to zoom. Its opening view is fitted against the chrome (every element
 * marked `data-exclude`), so no tile starts under a panel; a resize or the 0 key
 * returns to it.
 *
 * Tiles are drawn in user units where a hex is 100 from centre to corner. Board
 * text is sized in user units too and grows as the hex shrinks, so it never drops
 * below the 12px floor on screen (`--b-scale` carries screen px per user unit).
 */

const HEX = 100;
const SQ3 = Math.sqrt(3);
const POPS_BASE = 16;
const GLYPH_W = 18;
const PLATE_MIN = 18;
/** Board text never drops below this on screen: the stylesheet's --b-floor. */
const TEXT_FLOOR = 12;
/** The svg's margin past the fitted boxes, in hex units: room for the owner stroke. */
const PAD = 0.05;
const Z_MIN = 0.6;
const Z_MAX = 2.5;
const POP_ORDER: readonly PopType[] = ["slaves", "freemen", "citizens"];
const POP_ICON: Record<PopType, string> = {
  slaves: "pops/slaves",
  freemen: "pops/freemen",
  citizens: "pops/citizens",
};

/** A length token from the stylesheet, in px (0 where there is no document, as in SSR). */
const tokenPx = (name: string) =>
  typeof getComputedStyle === "undefined"
    ? 0
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

type TileCenter = { tile: HexTile; x: number; y: number };

/** The leading settlement of a tile: a city before a colony. */
function orderSettlements(settlements: readonly Settlement[]) {
  return [...settlements].sort((a, b) => Number(a.kind === "colony") - Number(b.kind === "colony"));
}

/**
 * Arrow keys walk the board by where the hexes are drawn: the nearest tile inside
 * a 120° cone, divided by how squarely it lies in the pressed direction (the east
 * and south-east neighbours are the same distance away).
 */
const ARROWS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function nextTileInDirection(centers: readonly TileCenter[], fromId: string, key: string) {
  const direction = ARROWS[key];
  const origin = centers.find(({ tile }) => tile.id === fromId);

  if (!direction || !origin) {
    return null;
  }

  let best: { id: string; cost: number } | null = null;

  for (const candidate of centers) {
    if (candidate.tile.id === fromId) {
      continue;
    }

    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const alignment = (dx * direction[0] + dy * direction[1]) / distance;

    if (alignment < 0.5) {
      continue;
    }

    const cost = distance / alignment;

    if (!best || cost < best.cost) {
      best = { id: candidate.tile.id, cost };
    }
  }

  return best?.id ?? null;
}

/** Three pop counts need the hex's width at their row; below that a tile shows one total. */
function compactAt(s: number) {
  const floor = TEXT_FLOOR;
  const k = Math.max(1, floor / ((POPS_BASE * s) / HEX));
  const plateH = 1.45 * Math.max(PLATE_MIN, (floor * HEX) / s);
  const rowBottom = 4 + plateH + 6 + GLYPH_W * k;
  const halfW = ((HEX * SQ3) / 2) * (rowBottom <= HEX / 2 ? 1 : (HEX - rowBottom) / (HEX / 2));
  return 60 * k + 4 > halfW;
}

/** Lay the plates, pop rows and pips out from the font sizes the stylesheet resolved. */
function layoutLabels(svg: SVGSVGElement, s: number) {
  const fs = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
  svg.classList.toggle("is-compact", compactAt(s));

  const place = (set: Element, x: number, top: number, k: number) => {
    set
      .querySelector(".popset-glyph")
      ?.setAttribute("transform", `translate(${x - 20 * k},${top}) scale(${0.75 * k})`);
    const text = set.querySelector(".pops");
    text?.setAttribute("x", String(x + 8 * k));
    text?.setAttribute("y", String(top + 14 * k));
  };

  for (const g of svg.querySelectorAll<SVGGElement>(".settle")) {
    const text = g.querySelector<SVGTextElement>(".plate-text");
    const plate = g.querySelector(".plate");
    const pops = g.querySelector(".pops");

    if (!text || !plate || !pops) {
      continue;
    }

    const f = fs(text);
    const h = 1.45 * f;
    const w = text.getComputedTextLength() + 1.3 * f;
    plate.setAttribute("x", String(-w / 2));
    plate.setAttribute("y", "4");
    plate.setAttribute("width", String(w));
    plate.setAttribute("height", String(h));
    text.setAttribute("y", String(4 + h / 2 + 0.35 * f));
    const k = fs(pops) / POPS_BASE;
    const top = 4 + h + 6;
    g.querySelectorAll(".pops-split .popset").forEach((set, i) =>
      place(set, (i - 1) * 40 * k, top, k),
    );
    const total = g.querySelector(".pops-total .popset");
    if (total) place(total, 0, top, k);
    g.parentElement
      ?.querySelector(".pips")
      ?.setAttribute("transform", `translate(0,${top + GLYPH_W * k + 6 + 5})`);
  }

  for (const t of svg.querySelectorAll<SVGTextElement>(".mooring-name")) {
    const f = fs(t);
    const side = t.dataset.side;
    const y =
      side === "above"
        ? -MOORING_RADIUS - 0.4 * f
        : side === "below"
          ? MOORING_RADIUS + f
          : 0.35 * f;
    t.setAttribute("y", String(y));
  }
}

function PopSet({ icon, count }: { icon: string; count: number }) {
  return (
    <g className="popset">
      <g className="popset-glyph">
        <image height="24" href={rasterIcon(icon)} width="24" />
      </g>
      <text className="pops">{count}</text>
    </g>
  );
}

function SettlementMark({ settlement, name }: { settlement: Settlement; name: string }) {
  const total = POP_ORDER.reduce((sum, pop) => sum + settlement.pops[pop], 0);

  return (
    <g
      className="settle"
      style={{ "--owner": PLAYER_GLAZES[settlement.owner].color } as CSSProperties}
    >
      <g transform="translate(0,-32)">
        <circle className={`seal-disc ${settlement.kind}`} r="28" />
        <image
          height="40"
          href={rasterIcon(`settlements/${settlement.kind}`)}
          width="40"
          x="-20"
          y="-20"
        />
      </g>
      <rect className="plate" rx="1" />
      <text className="plate-text">{name}</text>
      <g className="pops-split">
        {POP_ORDER.map((pop) => (
          <PopSet count={settlement.pops[pop]} icon={POP_ICON[pop]} key={pop} />
        ))}
      </g>
      <g className="pops-total">
        <PopSet count={total} icon="pops/crowd" />
      </g>
    </g>
  );
}

/** A second settlement sharing the tile: a small seal on the tile's shoulder. */
function SharedSeal({ settlement }: { settlement: Settlement }) {
  return (
    <g
      className="settle-shared"
      style={{ "--owner": PLAYER_GLAZES[settlement.owner].color } as CSSProperties}
      transform="translate(52,-52)"
    >
      <circle className={`seal-disc ${settlement.kind}`} r="18" />
      <image
        height="26"
        href={rasterIcon(`settlements/${settlement.kind}`)}
        width="26"
        x="-13"
        y="-13"
      />
    </g>
  );
}

type TileState = { selected: boolean; candidate: boolean; dimmed: boolean };

function Tile({
  tile,
  x,
  y,
  names,
  state,
  isTabStop,
  ruleset,
  onAction,
  onFocus,
  onRove,
  onHover,
}: {
  tile: HexTile;
  x: number;
  y: number;
  names: Map<string, string>;
  state: TileState;
  isTabStop: boolean;
  ruleset: Ruleset;
  onAction: (tileId: string) => void;
  onFocus: (tileId: string) => void;
  onRove: (fromId: string, key: string) => boolean;
  onHover: (tileId: string | null, element?: Element) => void;
}) {
  const [lead, second] = orderSettlements(tile.settlements);
  const slots =
    tile.terrain === "oracle"
      ? 0
      : lead
        ? settlementBuildingSlots(tile, lead, ruleset)
        : tile.buildingSlots;
  const built = lead ? lead.buildings.length : 0;
  const yieldLabel = tile.resource
    ? `${tile.resource.amount} ${RESOURCE_LABELS[tile.resource.type].toLowerCase()}`
    : "no yield";
  const leadName = lead ? names.get(lead.id) : undefined;
  const className = [
    "tile-btn",
    state.selected ? "is-selected" : "",
    state.candidate ? "is-candidate" : "",
    state.dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${yieldLabel}${leadName ? `, ${leadName}` : ""}`}
      className={className}
      data-tile={tile.id}
      data-tile-id={tile.id}
      onClick={() => onAction(tile.id)}
      onFocus={() => onFocus(tile.id)}
      onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onAction(tile.id);
        } else if (event.key in ARROWS && onRove(tile.id, event.key)) {
          event.preventDefault();
        }
      }}
      onPointerEnter={(event) => onHover(tile.id, event.currentTarget)}
      onPointerLeave={() => onHover(null)}
      role="button"
      tabIndex={isTabStop ? 0 : -1}
      transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
    >
      <polygon
        className={`tile ${tile.terrain}${lead ? " owned" : ""}`}
        points={hexPoints(HEX)}
        style={lead ? ({ "--owner": PLAYER_GLAZES[lead.owner].color } as CSSProperties) : undefined}
      />
      {lead ? (
        <SettlementMark name={leadName ?? "POLIS"} settlement={lead} />
      ) : (
        <>
          <image
            className="emblem"
            height="48"
            href={rasterIcon(`terrain/${tile.terrain}`)}
            width="48"
            x="-24"
            y="-48"
          />
          {tile.resource ? (
            <g className="tile-yield" transform="translate(0,26)">
              <text className="yield-n" x="-4">
                {tile.resource.amount}
              </text>
              <image
                height="24"
                href={rasterIcon(`resources/${tile.resource.type}`)}
                width="24"
                x="2"
                y="-19"
              />
            </g>
          ) : null}
        </>
      )}
      {second ? <SharedSeal settlement={second} /> : null}
      <g className="pips" transform={lead ? undefined : "translate(0,72)"}>
        {Array.from({ length: slots }, (_, i) => (
          <circle
            className={`pip${i < built ? " built" : ""}`}
            cx={(i - (slots - 1) / 2) * 16}
            cy="0"
            key={i}
            r="5"
          />
        ))}
      </g>
    </g>
  );
}

function tileTip(G: HegemonyState, tile: HexTile, names: Map<string, string>) {
  const settlements = orderSettlements(tile.settlements);

  if (settlements.length === 0) {
    return {
      title: `${tile.terrain[0].toUpperCase()}${tile.terrain.slice(1)}`,
      sub: `Hex ${tile.id}`,
      rows: [
        ["Yield", tile.resource ? `${tile.resource.amount} ${tile.resource.type}` : "none"],
        ["Building slots", String(tile.buildingSlots)],
      ] as Array<[string, string]>,
    };
  }

  const [lead] = settlements;
  return {
    title: names.get(lead.id) ?? "Polis",
    sub: `${PLAYER_GLAZES[lead.owner].name} · ${lead.kind}`,
    rows: [
      ...POP_ORDER.map((pop): [string, string] => [
        `${pop[0].toUpperCase()}${pop.slice(1)}`,
        String(lead.pops[pop]),
      ]),
      ...settlements
        .slice(1)
        .map((other): [string, string] => [
          `Also ${PLAYER_GLAZES[other.owner].name}'s ${other.kind}`,
          names.get(other.id) ?? "",
        ]),
      ...(tile.resource
        ? [["Yield", `${tile.resource.amount} ${tile.resource.type}`] as [string, string]]
        : []),
    ],
  };
}

function BoardTip({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const gap = tokenPx("--board-gap") || 8;
    const { offsetWidth: w, offsetHeight: h } = el;
    const left = Math.min(
      innerWidth - w - gap,
      Math.max(gap, anchor.left + anchor.width / 2 - w / 2),
    );
    const above = anchor.top - h - gap;
    setAt({ left, top: above >= gap ? above : anchor.bottom + gap });
  }, [anchor]);

  return createPortal(
    <div
      className="sharedTooltip"
      ref={ref}
      role="tooltip"
      style={at ? { left: at.left, top: at.top, opacity: 1 } : { left: 0, top: 0, opacity: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}

function IslandComponent({
  G,
  selectedTileId,
  highlightTileIds,
  placementActive = false,
  onTileAction,
  onBackgroundAction,
  onMooringAction,
  onViewChange,
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  highlightTileIds?: readonly string[];
  placementActive?: boolean;
  onTileAction: (tileId: string) => void;
  /** A click on the sea, not on a tile or a mooring. */
  onBackgroundAction?: () => void;
  onMooringAction?: (vertexId: string) => void;
  /** The player moved the map: anything anchored to a tile's old position is stale. */
  onViewChange?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const highlight = useMemo(() => new Set(highlightTileIds ?? []), [highlightTileIds]);
  const names = useMemo(() => settlementNames(G.board.tiles), [G.board.tiles]);
  const centers = useMemo<TileCenter[]>(
    () =>
      G.board.tiles.map((tile) => {
        const { x, y } = hexCenter(tile.q, tile.r, HEX);
        return { tile, x, y };
      }),
    [G.board.tiles],
  );
  const moorings = useMemo(() => {
    const byId = new Map(luxuryEligibleVertices(G.board.tiles).map((v) => [v.id, v]));

    return G.board.luxuries.flatMap((asset) => {
      const vertex = byId.get(asset.vertexId);
      if (!vertex) return [];
      const at = luxuryMarkerPosition(vertex, HEX, MOORING_RADIUS + 8);
      const from = vertexCenter(vertex.cells, HEX);
      const [dx, dy] = [at.x - from.x, at.y - from.y];
      // The name reads out to sea: sideways off an east or west shore, over or
      // under the disc off a north or south one.
      const side =
        Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "start" : "end") : dy < 0 ? "above" : "below";
      const name = getLuxuryGood(G.definition.content, asset.goodId)?.name ?? "";
      return [{ asset, vertex, ...at, name, side } as const];
    });
  }, [G.board.tiles, G.board.luxuries, G.definition.content]);

  // The island's extent in hex units, and the boxes the fit must keep clear. Keyed on
  // the board's shape, not on the tiles array: every move that touches a tile gives
  // that array a new identity, and the view must not re-fit (and snap back) for it.
  const shape = G.board.tiles.map((tile) => `${tile.q},${tile.r}`).join(";");
  const tileBoxes = useMemo<UnitBox[]>(
    () =>
      shape.split(";").map((cell) => {
        const [q, r] = cell.split(",").map(Number);
        const { x, y } = hexCenter(q, r, 1);
        return [x - SQ3 / 2, x + SQ3 / 2, y - 1, y + 1];
      }),
    [shape],
  );
  const boxesAt = useCallback(
    (s: number): UnitBox[] => {
      const r = MOORING_RADIUS / HEX;
      const compact = compactAt(s);
      const f = Math.max(16, (TEXT_FLOOR * HEX) / s);

      return tileBoxes.concat(
        moorings.map(({ x, y, name, side }) => {
          const mx = x / HEX;
          const my = y / HEX;
          if (compact || !name) return [mx - r, mx + r, my - r, my + r];
          const len = (MOORING_LABEL_X + 0.6 * f * name.length) / HEX;
          const half = (0.3 * f * name.length) / HEX;
          const lift = (MOORING_RADIUS + f) / HEX;
          if (side === "end") return [mx - len, mx + r, my - r, my + r];
          if (side === "start") return [mx - r, mx + len, my - r, my + r];
          return side === "above"
            ? [mx - Math.max(r, half), mx + Math.max(r, half), my - lift, my + r]
            : [mx - Math.max(r, half), mx + Math.max(r, half), my - r, my + lift];
        }),
      );
    },
    [tileBoxes, moorings],
  );
  // The svg spans the tiles; labels and moorings draw past it (overflow is visible).
  const extent = useMemo(() => {
    const boxes = tileBoxes;
    return {
      x0: Math.min(...boxes.map((b) => b[0])) - PAD,
      x1: Math.max(...boxes.map((b) => b[1])) + PAD,
      y0: Math.min(...boxes.map((b) => b[2])) - PAD,
      y1: Math.max(...boxes.map((b) => b[3])) + PAD,
    };
  }, [tileBoxes]);

  // The view: the fitted opening frame (base) and the player's pan and zoom on top.
  const base = useRef<IslandFit | null>(null);
  const view = useRef({ x: 0, y: 0, z: 1 });
  const apply = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !base.current) return;
    const b = base.current;
    const v = view.current;
    // The island's centre never leaves the screen.
    const cx = Math.min(innerWidth, Math.max(0, b.cx + v.x));
    const cy = Math.min(innerHeight, Math.max(0, b.cy + v.y));
    v.x = cx - b.cx;
    v.y = cy - b.cy;
    const s = b.s * v.z;
    svg.style.setProperty("--board-x", `${(cx + extent.x0 * s).toFixed(1)}px`);
    svg.style.setProperty("--board-y", `${(cy + extent.y0 * s).toFixed(1)}px`);
    svg.style.setProperty("--board-w", `${((extent.x1 - extent.x0) * s).toFixed(1)}px`);
    svg.style.setProperty("--board-h", `${((extent.y1 - extent.y0) * s).toFixed(1)}px`);
    svg.style.setProperty("--b-scale", (s / HEX).toFixed(4));
    layoutLabels(svg, s);
  }, [extent]);
  // The fit reads the latest boxes (moorings change as goods are claimed) without
  // re-running on every change: it runs on mount, on resize and when fonts land.
  const boxesRef = useRef(boxesAt);
  useLayoutEffect(() => {
    boxesRef.current = boxesAt;
  }, [boxesAt]);
  const fit = useCallback(() => {
    const exclusions = [...document.querySelectorAll("[data-exclude]")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    const result = fitIsland({
      width: innerWidth,
      height: innerHeight,
      gap: tokenPx("--board-gap") || 8,
      exclusions,
      boxesAt: boxesRef.current,
    });
    base.current = result ?? { s: 24, cx: innerWidth / 2, cy: innerHeight / 2 };
    view.current = { x: 0, y: 0, z: 1 };
    apply();
  }, [apply]);

  useLayoutEffect(() => {
    fit();
    const fonts: FontFaceSet | undefined = document.fonts;
    let live = true;
    void fonts?.ready.then(() => live && fit());
    window.addEventListener("resize", fit);
    return () => {
      live = false;
      window.removeEventListener("resize", fit);
    };
  }, [fit]);

  // New settlements and names change the labels: lay them out again.
  useLayoutEffect(() => {
    if (svgRef.current && base.current)
      layoutLabels(svgRef.current, base.current.s * view.current.z);
  }, [G.board.tiles]);

  const [hover, setHover] = useState<{ tileId: string; rect: DOMRect } | null>(null);

  // Drag to pan, wheel to zoom about the pointer, 0 to return to the opening view.
  const dragged = useRef(false);
  const onViewChangeRef = useRef(onViewChange);
  useLayoutEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);
  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    if (!stage || !svg) return;
    let drag: { id: number; x: number; y: number; vx: number; vy: number; moved: boolean } | null =
      null;

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        vx: view.current.x,
        vy: view.current.y,
        moved: false,
      };
      dragged.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        dragged.current = true;
        stage.classList.add("is-panning");
        setHover(null);
        onViewChangeRef.current?.();
      }
      view.current.x = drag.vx + dx;
      view.current.y = drag.vy + dy;
      apply();
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        drag = null;
        stage.classList.remove("is-panning");
        // The click that ends a drag fires before timers run; after it, clicks count again.
        window.setTimeout(() => {
          dragged.current = false;
        });
      }
    };
    const wheel = (e: WheelEvent) => {
      if (!base.current) return;
      e.preventDefault();
      const v = view.current;
      const z = Math.min(
        Z_MAX,
        Math.max(Z_MIN, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))),
      );
      const k = z / v.z;
      const cx = base.current.cx + v.x;
      const cy = base.current.cy + v.y;
      v.x += (e.clientX - cx) * (1 - k);
      v.y += (e.clientY - cy) * (1 - k);
      v.z = z;
      apply();
      onViewChangeRef.current?.();
    };
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== "0" || target?.closest("input, textarea, select")) return;
      view.current = { x: 0, y: 0, z: 1 };
      apply();
    };

    stage.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    return () => {
      stage.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stage.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [apply]);

  // A drag that ends on a tile is a pan, not a click.
  const act = useCallback(
    (tileId: string) => {
      if (dragged.current) {
        dragged.current = false;
        return;
      }
      onTileAction(tileId);
    },
    [onTileAction],
  );

  // One tab stop for the board; arrows move it (it follows focus).
  const [roving, setRoving] = useState<string | null>(null);
  const tabStop =
    (roving && centers.some(({ tile }) => tile.id === roving) ? roving : null) ??
    selectedTileId ??
    centers[0]?.tile.id ??
    null;
  const rove = (fromId: string, key: string) => {
    const next = nextTileInDirection(centers, fromId, key);
    if (!next) return false;
    setRoving(next);
    svgRef.current
      ?.querySelector<SVGGElement>(`[data-tile-id="${next}"]`)
      ?.focus({ preventScroll: true });
    return true;
  };

  const onHover = useCallback((tileId: string | null, element?: Element) => {
    setHover(tileId && element ? { tileId, rect: element.getBoundingClientRect() } : null);
  }, []);
  const hoverTile = hover ? G.board.tiles.find((tile) => tile.id === hover.tileId) : undefined;
  const tip = hoverTile ? tileTip(G, hoverTile, names) : null;

  return (
    <div
      className="island-stage"
      onClick={(event) => {
        // A drag that ends on the sea is a pan; a click on a tile or mooring is theirs.
        if (dragged.current || (event.target as Element).closest("[data-tile-id], .moor")) return;
        onBackgroundAction?.();
      }}
      ref={stageRef}
    >
      <svg
        aria-label="The island"
        className={`island${placementActive ? " is-placing" : ""}`}
        id="board"
        ref={svgRef}
        role="group"
        viewBox={`${extent.x0 * HEX} ${extent.y0 * HEX} ${(extent.x1 - extent.x0) * HEX} ${(extent.y1 - extent.y0) * HEX}`}
      >
        <g>
          {centers.map(({ tile, x, y }) => (
            <Tile
              isTabStop={tile.id === tabStop}
              key={tile.id}
              names={names}
              onAction={act}
              ruleset={G.ruleset}
              onFocus={setRoving}
              onHover={onHover}
              onRove={rove}
              state={{
                selected: selectedTileId === tile.id,
                candidate: placementActive && highlight.has(tile.id),
                dimmed: placementActive && !highlight.has(tile.id),
              }}
              tile={tile}
              x={x}
              y={y}
            />
          ))}
          {moorings.map(({ asset, vertex, x, y, name, side }) => {
            const glaze = asset.owner ? PLAYER_GLAZES[asset.owner] : null;
            return (
              <LuxuryVertexMarker
                goodName={name || undefined}
                key={vertex.id}
                labelSide={side}
                onActivate={
                  onMooringAction
                    ? () => {
                        if (!dragged.current) onMooringAction(vertex.id);
                      }
                    : undefined
                }
                ownerColor={glaze?.color}
                ownerName={glaze?.name}
                vertex={vertex}
                x={x}
                y={y}
              />
            );
          })}
        </g>
      </svg>
      {hover && tip ? (
        <BoardTip anchor={hover.rect}>
          <div className="tip-title">
            {tip.title}
            <span className="tip-sub">{tip.sub}</span>
          </div>
          <div className="tip-ledger">
            {tip.rows.map(([k, v]) => (
              <span className="tip-row" key={k}>
                <span className="tip-k">{k}</span>
                <b>{v}</b>
              </span>
            ))}
          </div>
        </BoardTip>
      ) : null}
    </div>
  );
}

export const Island = memo(IslandComponent);
