import { useRef, useState } from "react";
import {
  EMPTY_POPS,
  POP_TYPES,
  clonePops,
  formatPops,
  getMovePopsStatus,
  totalPops,
} from "../../../game/rules";
import type { Pops } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { settlementNameOf } from "../../../ui/settlementNames";
import { Panel, PanelHead } from "../../chrome/Panel";
import { Knob, Lacquer } from "../../chrome/controls";
import { useConfirm } from "../../chrome/confirmContext";
import { Chips, Ico } from "../../frame/parts";
import { CostDetail } from "../../left/atoms";
import { useReturnFocus } from "../../overlays/focus";
import { refusal, titleCase } from "../../left/words";
import { useGameUi } from "../GameUiContext";
import { capitalize } from "../helpers";

/**
 * Move Pops, map-first: the place panel names the settlement they leave from, the map
 * picks the one they travel to, and this pop beside the place panel, above the hand's
 * row, chooses exactly who travels. Send asks through the confirm bar.
 */
export function MovePopsTargetPopover({
  sourceTileId,
  tileId,
  onCancel,
  onConfirm,
}: {
  sourceTileId: string;
  tileId: string;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
}) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const [pops, setPops] = useState<Pops>(() => clonePops(EMPTY_POPS));

  // Opening moves focus in, to the first control that can be pressed, and closing
  // hands it back (the pop is keyed by its destination, so each one is an opening).
  const ref = useRef<HTMLDivElement>(null);
  useReturnFocus(ref, '.pp-step .ch-knob:not([aria-disabled="true"])');

  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const sourceTile = G.board.tiles.find((candidate) => candidate.id === sourceTileId);
  const source = sourceTile?.settlements.find((candidate) => candidate.owner === viewerId);
  const target = tile?.settlements.find((candidate) => candidate.owner === viewerId);
  if (!tile || !sourceTile || !source || !target) return null;

  const from = titleCase(settlementNameOf(G.board.tiles, source.id));
  const to = titleCase(settlementNameOf(G.board.tiles, target.id));
  const store = G.players[viewerId].resources;
  const status = getMovePopsStatus(G, viewerId, sourceTileId, tileId, pops);
  const cost = status.cost ?? {};
  const travellers = totalPops(pops);
  const why = refusal(status, turnBlocked, store) ?? (travellers ? null : "Choose who travels.");
  const step = (pop: keyof Pops, by: number) =>
    setPops((current) => ({
      ...current,
      [pop]: Math.max(0, Math.min(source.pops[pop], current[pop] + by)),
    }));

  return (
    <Panel
      aria-label={`Move pops from ${from} to ${to}`}
      className="pp-pop is-move ch-settle"
      corners={["tr", "br"]}
      data-exclude
      ref={ref}
      role="dialog"
    >
      <PanelHead
        closeLabel="Close Move pops"
        icon="pops/move"
        onClose={onCancel}
        sub={`From ${from} · they arrive next turn`}
        title={`Move to ${to}`}
      />
      <div className="pp-pop-body">
        <h3 className="pp-k pp-pop-k">Who travels</h3>
        {POP_TYPES.map((pop) => {
          const one = formatPopLabel(pop, 1);
          return (
            <div className="pp-step" key={pop}>
              <Ico path={POP_RASTERS[pop]} size="tile" />
              <span className="pp-opt-n">{capitalize(formatPopLabel(pop, 2))}</span>
              <span className="pp-opt-line">
                {source.pops[pop]} in {from}
              </span>
              <span className="pp-step-ctl">
                <Knob
                  disabled={pops[pop] <= 0}
                  label={`Remove a ${one}`}
                  onClick={() => step(pop, -1)}
                >
                  −
                </Knob>
                <b aria-live="polite" className="pp-step-n">
                  {pops[pop]}
                </b>
                <Knob
                  disabled={pops[pop] >= source.pops[pop]}
                  label={`Add a ${one}`}
                  onClick={() => step(pop, 1)}
                >
                  +
                </Knob>
              </span>
            </div>
          );
        })}
        <p className="pp-pop-line">One move a turn.</p>
      </div>
      <footer className="pp-pop-foot">
        <Lacquer
          aria-label={why ? `Send: ${why}` : `Send ${formatPops(pops)}`}
          disabled={why !== null}
          onClick={() =>
            ask({
              icon: "pops/move",
              question: `Are you sure you want to send ${formatPops(pops)} from ${from} to ${to}?`,
              detail: <CostDetail cost={cost} more="They arrive next turn." store={store} />,
              verb: "Send",
              onYes: () => onConfirm(sourceTileId, tileId, clonePops(pops)),
            })
          }
        >
          Send <Chips amounts={cost} short={why !== null} />
        </Lacquer>
      </footer>
    </Panel>
  );
}
