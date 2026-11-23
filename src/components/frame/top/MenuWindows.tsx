import { useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import { Panel, PanelHead } from "../../chrome/Panel";
import { Plaque } from "../../chrome/controls";
import { CodexTab } from "../../board/ledger/CodexTab";
import { CostsTab } from "../../board/ledger/CostsTab";
import { useGameUi } from "../../board/GameUiContext";
import { PLATE_CHOICES } from "../map3d/plates";
import type { Plates } from "../map3d/plates";
import { MENU_WINDOWS, WINDOW_FACE } from "./windowState";
import type { MenuWindow, MenuWindows as Windows, WindowSpot } from "./windowState";

/** Where an unmoved window opens: top right, as in the prototype; each further window
 *  steps down past the head above it, and in, so no head or corner lies on another. */
const FIRST_TOP = 64;
const STEP_X = 48;
const STEP_Y = 88;
const EDGE = 12;
/** The bar's height: a window is never dragged under it. */
const BAR = 50;

/**
 * The menu's windows, each a panel whose head is its drag handle. They start at
 * the top right, stay inside the screen, and the one pressed comes to the top.
 * Escape closes the top one (useMenuWindows).
 */
export function MenuWindows({
  windows,
  codexTarget,
  plates,
  onPlates,
}: {
  windows: Windows;
  codexTarget: { chapter: string; nonce: number } | null;
  plates: Plates;
  onPlates: (plates: Plates) => void;
}) {
  const { G, viewerId } = useGameUi();
  const layer = useRef<HTMLDivElement>(null);
  if (windows.open.length === 0) return null;

  const body: Record<MenuWindow, ReactNode> = {
    codex: <CodexTab G={G} target={codexTarget} />,
    costs: <CostsTab G={G} playerID={viewerId} />,
    plates: <PlatesBody onPlates={onPlates} plates={plates} />,
  };

  return (
    <div className="menu-windows" data-c="menu-windows" ref={layer}>
      {/* Drawn in a fixed order, stacked by place in `open`: moving a node would
          throw away its scroll. */}
      {MENU_WINDOWS.filter((id) => windows.open.includes(id)).map((id) => (
        <MovableWindow
          id={id}
          key={id}
          layer={layer}
          onClose={() => windows.close(id)}
          onFront={() => windows.show(id)}
          onMove={(spot) => windows.move(id, spot)}
          order={windows.open.indexOf(id)}
          spot={windows.spots[id]}
          step={windows.steps[id] ?? 0}
        >
          {body[id]}
        </MovableWindow>
      ))}
    </div>
  );
}

function MovableWindow({
  id,
  order,
  spot,
  step,
  layer,
  onFront,
  onMove,
  onClose,
  children,
}: {
  id: MenuWindow;
  /** Its place in the stack, 0 at the bottom. */
  order: number;
  spot: WindowSpot | undefined;
  /** Its step down the cascade while unmoved. */
  step: number;
  layer: RefObject<HTMLDivElement | null>;
  onFront: () => void;
  onMove: (spot: WindowSpot) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const face = WINDOW_FACE[id];
  const self = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; x: number; y: number; k: number } | null>(null);

  // Held inside the screen by the stylesheet's clamp, whatever the screen's size.
  const place: CSSProperties = spot
    ? {
        left: `clamp(0px, ${spot.x}px, calc(var(--vw) - ${face.w}px))`,
        top: `clamp(${BAR}px, ${spot.y}px, calc(var(--vh) - ${face.h}px))`,
      }
    : { right: EDGE + step * STEP_X, top: FIRST_TOP + step * STEP_Y };

  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = self.current;
    const host = layer.current;
    if (!box || !host || event.button !== 0) return;
    if ((event.target as Element).closest("button, input, a")) return;
    // Screen px to design px: the layer is the logical screen.
    const k = host.getBoundingClientRect().width / host.offsetWidth || 1;
    drag.current = {
      sx: event.clientX,
      sy: event.clientY,
      x: box.offsetLeft,
      y: box.offsetTop,
      k,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    const host = layer.current;
    if (!from || !host) return;
    const x = from.x + (event.clientX - from.sx) / from.k;
    const y = from.y + (event.clientY - from.sy) / from.k;
    onMove({
      x: Math.round(Math.max(0, Math.min(host.offsetWidth - face.w, x))),
      y: Math.round(Math.max(BAR, Math.min(host.offsetHeight - face.h, y))),
    });
  };
  const drop = () => {
    drag.current = null;
  };

  return (
    <div
      aria-label={face.title}
      className="menu-window ch-settle"
      data-window={id}
      onPointerDownCapture={onFront}
      ref={self}
      role="dialog"
      // Stacked by its place among the open windows, inside the windows' own layer.
      style={{ ...place, width: face.w, height: face.h, zIndex: `calc(var(--z-lift) + ${order})` }}
    >
      <Panel className="menu-window-panel" corners={["tl", "tr", "bl", "br"]}>
        <div
          className="menu-window-grip"
          onLostPointerCapture={drop}
          onPointerCancel={drop}
          onPointerDown={grab}
          onPointerMove={follow}
          onPointerUp={drop}
        >
          <span aria-hidden="true" className="menu-window-dots" />
          <PanelHead
            closeLabel={`Close ${face.title}`}
            icon={face.icon}
            onClose={onClose}
            sub={face.sub}
            title={face.title}
          />
        </div>
        <div className="menu-window-body">
          <div className="empireIntel">
            <div className="intelBody">{children}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** How the map draws each tile's resource badge: the Plates choices, as plaques. */
function PlatesBody({ plates, onPlates }: { plates: Plates; onPlates: (plates: Plates) => void }) {
  return (
    <div className="plates-body">
      {PLATE_CHOICES.map((choice) => (
        <div aria-label={choice.label} className="plates-line" key={choice.key} role="group">
          <span className="caps">{choice.label}</span>
          <span className="plates-opts">
            {choice.options.map((option) => (
              <Plaque
                aria-pressed={plates[choice.key] === option.value}
                key={option.value}
                onClick={() => onPlates({ ...plates, [choice.key]: option.value } as Plates)}
              >
                {option.label}
              </Plaque>
            ))}
          </span>
        </div>
      ))}
      <p className="plates-hint">Hold Alt to show every plate.</p>
    </div>
  );
}
