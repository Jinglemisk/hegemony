import { useEffect, useRef, useState } from "react";
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

/** The picker follows its socket: the ledger scrolls, and an anchored overlay
 *  measured once ends up floating over the wrong row. `useAnchoredOverlay`
 *  re-measures on scroll but reads the rect it was handed, so the rect is what
 *  has to be refreshed. */
function useAnchorRect(anchorElement: HTMLElement) {
  const [rect, setRect] = useState(() => anchorElement.getBoundingClientRect());

  useEffect(() => {
    const remeasure = () => setRect(anchorElement.getBoundingClientRect());

    remeasure();
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);

    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [anchorElement]);

  return rect;
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
  const rect = useAnchorRect(anchorElement);
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

      const edge = event.shiftKey ? items[0] : items[items.length - 1];

      if (!inside || active === edge) {
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
      measureKey={`${tile.id}-${settlement.buildings.length}`}
      onDismiss={onDismiss}
    >
      <div className="socketPickerBody" ref={bodyRef}>
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
                  {RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0).map((resource) => (
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
                  ))}
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
