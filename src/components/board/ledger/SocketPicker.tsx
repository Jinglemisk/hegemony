import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getBuildBuildingOptions } from "../../../game/rules";
import type { BuildingId, HexTile, Settlement } from "../../../game/types";
import { presentBuildingEffect } from "../../../ui/effects";
import { formatNumber } from "../../../ui/formatters";
import { BUILDING_GLYPHS, RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { Popover } from "../../overlays/Popover";
import { useGameUi } from "../GameUiContext";
import { buildRefusal, shortfallOf } from "./buildRefusal";

/**
 * What could stand here — the answer the socket was posing and could not give.
 *
 * The socket was the overhaul's central new primitive and it only ever said
 * *there is room*. Everything needed to say *and this is what fits* was already
 * computed: `getBuildBuildingOptions` prices every building for this exact
 * settlement, discounts and all, and the Build page's refusal phrasings say why
 * a place declines one. So this is a second door onto that work, opened where
 * the question is asked, and it shares the wording so the two cannot drift.
 *
 * Why a popover rather than a page or an expander. Raising is a decision taken
 * *about a settlement*, and the settlement's other three bands — its people, its
 * income, its rank — are what the decision is made against. An expander would
 * push them off screen inside a 250px tablet; a page would lose the settlement
 * entirely, which is the exact failure this row exists to close. The popover
 * leaves the card standing behind it.
 */

/** The gap `Popover` leaves between an anchor and its surface. Mirrored here
 *  because the height has to be decided before the surface exists to measure. */
const ANCHOR_GAP = 12;
/** Head, its rule, and the surface's own padding — everything above and below
 *  the scrolling list. Measured off the rendered picker. */
const SURFACE_CHROME = 56;
/** Three rows. Below this the picker stops being a list and starts being a
 *  peephole, so a cramped socket overhangs its band rather than shrink further. */
const LEAST_USEFUL_LIST = 168;

/**
 * Where the socket is, and how much room stands over and under it.
 *
 * Two things have to be re-measured, not measured once. The ledger scrolls, so a
 * rect taken at open floats over the wrong row a moment later. And the room is
 * read off the LEDGER TABLET, not the viewport: `positionAnchoredOverlay` clamps
 * to the window, which at 1366×768 is how a 368px picker ended up at y=40 with
 * its head laid across the omen, season and fate slips — the window had space
 * there, the game did not. The page the socket belongs to already sits inside the
 * chrome, so its own box is the honest ceiling and floor.
 */
function useAnchorGeometry(anchorElement: HTMLElement) {
  const measure = useCallback(() => {
    const rect = anchorElement.getBoundingClientRect();
    const panel = anchorElement.closest<HTMLElement>(".panel");
    const band = panel?.getBoundingClientRect();

    return {
      rect,
      above: rect.top - (band?.top ?? 0) - ANCHOR_GAP,
      below: (band?.bottom ?? window.innerHeight) - rect.bottom - ANCHOR_GAP,
    };
  }, [anchorElement]);

  const [geometry, setGeometry] = useState(measure);

  useEffect(() => {
    const remeasure = () => setGeometry(measure());

    remeasure();
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);

    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [measure]);

  return geometry;
}

export function SocketPicker({
  anchorElement,
  name,
  onDismiss,
  onRaise,
  open,
  settlement,
  tile,
}: {
  /** The socket that was pressed. Focus goes back to it on close, and a press
   *  landing on it is the socket's own business to toggle, not a dismissal. */
  anchorElement: HTMLElement;
  name: string;
  onDismiss: () => void;
  onRaise: (tileId: string, buildingId: BuildingId) => void;
  /** Slots still standing open, so a refusal can say "no slot" honestly. */
  open: number;
  settlement: Settlement;
  tile: HexTile;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const bodyRef = useRef<HTMLDivElement>(null);
  const { rect, above, below } = useAnchorGeometry(anchorElement);
  // The picker takes the roomier side of its socket and is cut to fit it, so the
  // surface never needs the viewport clamp that used to slide it over the chrome.
  const placement = below >= above ? "below" : "above";
  const listMax = Math.max(LEAST_USEFUL_LIST, Math.max(above, below) - SURFACE_CHROME);
  const held = G.players[playerID].resources;
  const options = getBuildBuildingOptions(G, playerID, tile.id);
  // One gate over the whole picker, worded as the Build page words it. When the
  // turn is what stops you, that is a fact about the moment and not about any
  // one building, so it is said once at the head instead of nine times.
  const shut = !isActive ? "not your turn" : phase !== "gameplay" ? "not in this phase" : null;

  /** Tab stays inside. The picker is a dialog opened from a mark 26px across;
   *  tabbing out of it lands a keyboard player at the end of the document with
   *  no way back to the socket they came from. Escape and a press both close it
   *  and `Popover` hands focus back. */
  useEffect(() => {
    const surface = bodyRef.current?.closest<HTMLElement>(".sharedPopover");

    if (!surface) return;

    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const items = [...surface.querySelectorAll<HTMLElement>("button")];
      const active = surface.ownerDocument.activeElement;
      const inside = active instanceof Node && surface.contains(active);

      if (items.length === 0) {
        event.preventDefault();
        surface.focus();
        return;
      }

      // The surface itself counts as an edge, not as "somewhere in the middle".
      // It is what `Popover` focuses on open, and it is the PARENT of the options
      // — so a plain Tab from it falls onto the first option by document order
      // and looked like the trap working, while Shift+Tab from it walked
      // backwards straight out of the dialog and landed on the TUNE button.
      const edge = event.shiftKey ? items[0] : items[items.length - 1];

      if (!inside || active === edge || active === surface) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    };

    const document_ = surface.ownerDocument;
    document_.addEventListener("keydown", trap, true);

    return () => document_.removeEventListener("keydown", trap, true);
  }, []);

  /** A press anywhere else closes it — except on the socket itself, which owns
   *  its own open/shut and would otherwise be shut here and reopened by its own
   *  click a moment later. */
  useEffect(() => {
    const surface = bodyRef.current?.closest<HTMLElement>(".sharedPopover");

    const away = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (surface?.contains(target) || anchorElement.contains(target)) return;

      onDismiss();
    };

    document.addEventListener("pointerdown", away, true);

    return () => document.removeEventListener("pointerdown", away, true);
  }, [anchorElement, onDismiss]);

  return (
    <Popover
      anchor={rect}
      ariaLabel={`Raise a building in ${name}`}
      className="socketPicker"
      measureKey={`${tile.id}-${settlement.buildings.length}-${listMax}`}
      onDismiss={onDismiss}
      preferredPlacement={placement}
    >
      <div
        className="socketPickerBody"
        ref={bodyRef}
        style={{ "--socketListMax": `${listMax}px` } as CSSProperties}
      >
        <p className="socketPickerHead label">
          {name} · {shut ?? (open === 1 ? "1 slot open" : `${open} slots open`)}
        </p>

        <div className="socketPickList">
          {options.map(({ building, status }) => {
            const cost = status.cost ?? building.cost;
            const shortfall = shortfallOf(cost, held);
            const refused = shut !== null || !status.can;
            const refusal = refused
              ? (shut ?? buildRefusal(settlement, building, open, shortfall))
              : null;

            return (
              <button
                aria-disabled={refused}
                aria-label={
                  refusal
                    ? `${building.name} in ${name}: ${refusal}.`
                    : `Raise ${building.name} in ${name}.`
                }
                className={`socketOption${refused ? " socketOptionGhost" : ""}`}
                key={building.id}
                onClick={refused ? undefined : () => onRaise(tile.id, building.id)}
                type="button"
              >
                <span className="socketOptionTile" aria-hidden="true">
                  <Icon glyph={BUILDING_GLYPHS[building.id]} size="rail" />
                </span>

                <b className="socketOptionName title">{building.name}</b>

                <span className="socketOptionCost num">
                  {RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0).map(
                    (resource) => (
                      <span
                        className={
                          (cost[resource] ?? 0) > held[resource]
                            ? "socketCostItem socketCostShort"
                            : "socketCostItem"
                        }
                        key={resource}
                      >
                        <Icon glyph={RESOURCE_GLYPHS[resource]} />
                        {formatNumber(cost[resource] ?? 0)}
                      </span>
                    ),
                  )}
                </span>

                <span className="socketOptionEffects">
                  {building.effects.map((effect, index) => {
                    const presented = presentBuildingEffect(effect);

                    return (
                      <span
                        className={`effectRow ${presented.tone === "negative" ? "neg" : "pos"}`}
                        key={index}
                      >
                        <EffectIcon family="building" effect={effect} />
                        <span className="caption">{presented.text}</span>
                      </span>
                    );
                  })}
                </span>

                {refusal ? <span className="socketOptionBlocker label">{refusal}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
