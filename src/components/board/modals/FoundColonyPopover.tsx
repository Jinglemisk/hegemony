import { useRef, useState } from "react";
import {
  POP_TYPES,
  formatPops,
  getFoundColonyStatus,
  getTile,
  totalPops,
} from "../../../game/rules";
import { previewFoundedSettlement } from "../../../game/economy/preview";
import type { PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { settlementNameOf } from "../../../ui/settlementNames";
import { Panel, PanelHead } from "../../chrome/Panel";
import { Lacquer } from "../../chrome/controls";
import { useConfirm } from "../../chrome/confirmContext";
import { SpendDetail } from "../../chrome/confirmDetail";
import { Chips, Ico } from "../../frame/parts";
import { useReturnFocus } from "../../overlays/focus";
import { refusal, titleCase } from "../../left/words";
import { useGameUi } from "../GameUiContext";
import { capitalize, firstAvailablePop, getSettlementEntries } from "../helpers";

/**
 * Found a colony on a picked piece of land: it opens beside the place panel, above the
 * hand's row, like Grow and Build. The land is fixed (the place panel shows it); this
 * asks which place a pop leaves from and who goes, shows what the colony would make, and
 * the Found act asks through the confirm bar.
 */
export function FoundColonyPopover({
  tileId,
  onCancel,
  onConfirm,
}: {
  tileId: string;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, pop: PopType) => void;
}) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const target = getTile(G, tileId);
  const sources = getSettlementEntries(G, viewerId).filter((entry) => totalPops(entry.pops) > 0);
  const [sourceTileId, setSourceTileId] = useState(() => sources[0]?.tile.id ?? "");
  const source = sources.find((entry) => entry.tile.id === sourceTileId) ?? sources[0];
  const [picked, setPop] = useState<PopType>(() => firstAvailablePop(source?.pops));
  // A source without the class picked sends the first class it has.
  const pop = source && source.pops[picked] > 0 ? picked : firstAvailablePop(source?.pops);

  // Opening moves focus in, to the first choice, and closing hands it back.
  const ref = useRef<HTMLDivElement>(null);
  useReturnFocus(ref, ".pp-opt");

  if (!target) return null;
  const store = G.players[viewerId].resources;
  const status = getFoundColonyStatus(G, viewerId, tileId);
  const cost = status.cost ?? G.ruleset.actionCosts.foundColony;
  const preview = source
    ? previewFoundedSettlement(G, viewerId, tileId, source.tile.id, pop)
    : null;
  const why =
    sources.length === 0
      ? "No place of yours has a pop to spare."
      : (refusal(status, turnBlocked, store) ?? (preview ? null : "This pop cannot found here."));
  const from = source
    ? titleCase(
        settlementNameOf(
          G.board.tiles,
          source.tile.settlements.find((s) => s.owner === viewerId)!.id,
        ),
      )
    : "";

  return (
    <Panel
      aria-label={`Found a colony on the ${target.terrain}`}
      className="pp-pop is-found ch-settle"
      corners={["tr", "br"]}
      data-exclude
      ref={ref}
      role="dialog"
    >
      <PanelHead
        closeLabel="Close Found a colony"
        icon="settlements/found"
        onClose={onCancel}
        sub={`On the ${target.terrain} · the pop arrives next turn`}
        title="Found a colony"
      />
      <div className="pp-pop-body">
        <h3 className="pp-k pp-pop-k">It would make a turn</h3>
        <p className="pp-pop-line">
          {preview ? <Chips amounts={preview.income} empty="nothing" signed /> : "—"}
        </p>
        <h3 className="pp-k pp-pop-k">Send a pop from</h3>
        {sources.map(({ tile, pops }) => {
          const own = tile.settlements.find((s) => s.owner === viewerId)!;
          const name = titleCase(settlementNameOf(G.board.tiles, own.id));
          const on = tile.id === source?.tile.id;
          return (
            <button
              aria-label={`From ${name}, which holds ${formatPops(pops)}`}
              aria-pressed={on}
              className="pp-opt"
              key={tile.id}
              onClick={() => setSourceTileId(tile.id)}
              type="button"
            >
              <Ico path={`settlements/${own.kind}`} size="tile" />
              <span className="pp-opt-n">{name}</span>
              <span className="pp-opt-line">
                {capitalize(tile.terrain)} · {formatPops(pops)}
              </span>
            </button>
          );
        })}
        <h3 className="pp-k pp-pop-k">Who goes</h3>
        {POP_TYPES.map((candidate) => {
          const here = source?.pops[candidate] ?? 0;
          const label = `A ${formatPopLabel(candidate, 1)}`;
          return (
            <button
              aria-disabled={here <= 0 || undefined}
              aria-label={here > 0 ? label : `${label}: none in ${from}`}
              aria-pressed={candidate === pop}
              className="pp-opt"
              key={candidate}
              onClick={here > 0 ? () => setPop(candidate) : undefined}
              type="button"
            >
              <Ico path={POP_RASTERS[candidate]} size="tile" />
              <span className="pp-opt-n">{label}</span>
              <span className="pp-opt-line">
                {here} in {from}
              </span>
            </button>
          );
        })}
      </div>
      <footer className="pp-pop-foot">
        <Lacquer
          aria-label={why ? `Found it: ${why}` : "Found it"}
          disabled={why !== null}
          onClick={() =>
            source &&
            ask({
              icon: "settlements/found",
              question: `Are you sure you want to found a colony on the ${target.terrain}, a ${formatPopLabel(pop, 1)} from ${from}?`,
              detail: (
                <SpendDetail
                  command={{ type: "foundColony", tileId, sourceTileId: source.tile.id, pop }}
                  cost={cost}
                  G={G}
                  note="The pop arrives next turn."
                  viewerId={viewerId}
                />
              ),
              verb: "Found it",
              onYes: () => onConfirm(source.tile.id, pop),
            })
          }
        >
          Found it <Chips amounts={cost} short={why !== null} />
        </Lacquer>
      </footer>
    </Panel>
  );
}
