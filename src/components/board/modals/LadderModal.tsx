import { useMemo, useState } from "react";
import type { Phase } from "../../../game/controller";
import {
  demotionTarget,
  getDemotePopStatus,
  getPromotePopStatus,
  promotionTarget,
  settlementPopCapacity,
  totalPops
} from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { TerrainSprite } from "../../Sprites";
import { actionRequirementText, actionTitle, capitalize, getOwnedHoldings, holdingShortLabel } from "../helpers";

export type LadderRequest = { kind: "promote" | "demote"; from: PopType };

/**
 * The social ladder's targeting modal (D8): the player picks WHICH settlement pays
 * the move — a slave's yield depends on its tile, so the town is the decision.
 * (Within a town, pops of a type are identical; there is no "which slave".)
 */
export function LadderModal({
  G,
  playerID,
  request,
  phase,
  isActive,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  request: LadderRequest;
  phase: Phase;
  isActive: boolean;
  onCancel: () => void;
  onConfirm: (tileId: string, from: PopType, kind: "promote" | "demote") => void;
}) {
  const { kind, from } = request;
  const getStatus = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
  const to = kind === "promote" ? promotionTarget(from) : demotionTarget(from);

  // Every holding that has one of the pop to move; legality (cost, throttle) is
  // re-checked live so the confirm button and the reason line never disagree.
  const holdings = useMemo(
    () => getOwnedHoldings(G, playerID).filter(({ settlement }) => settlement.pops[from] > 0),
    [G, playerID, from]
  );
  const [tileId, setTileId] = useState(holdings[0]?.tile.id ?? "");
  const holding = holdings.find(({ tile }) => tile.id === tileId) ?? holdings[0];
  const status = holding ? getStatus(G, playerID, holding.tile.id, from) : null;
  const disabled = !holding || !isActive || phase !== "gameplay" || !status?.can;
  const verb = kind === "promote" ? "Promote" : "Demote";

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal populationModal" role="dialog" aria-modal="true" aria-labelledby="ladder-title">
        <div className="modalHeader">
          <div>
            <h2 id="ladder-title">
              {verb} {formatPopLabel(from, 1)} → {formatPopLabel(to, 1)}
            </h2>
            <p>Choose which settlement the {formatPopLabel(from, 1)} steps from — one ladder move per turn.</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        {holdings.length > 0 ? (
          <>
            <div className="settlementPickGrid" role="group" aria-label="Settlement">
              {holdings.map(({ tile, settlement }) => {
                const candidateStatus = getStatus(G, playerID, tile.id, from);
                const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);

                return (
                  <button
                    className={
                      holding?.tile.id === tile.id ? "settlementPickCard selectedChoice" : "settlementPickCard"
                    }
                    key={tile.id}
                    onClick={() => setTileId(tile.id)}
                    title={actionTitle(`${verb} on ${tile.id}`, candidateStatus, phase, isActive)}
                  >
                    <TerrainSprite terrain={tile.terrain} className="settlementPickTerrain" />
                    <span className="settlementPickBody">
                      <strong>
                        {capitalize(settlement.kind)} {tile.id}
                      </strong>
                      <em>
                        {capitalize(tile.terrain)} · +{tile.resource.amount} {tile.resource.type}
                        {rivals.length > 0
                          ? ` · shares tile with ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
                          : ""}
                      </em>
                      <em>
                        {settlement.pops[from]} {formatPopLabel(from, settlement.pops[from])} here ·{" "}
                        {totalPops(settlement.pops)}/{settlementPopCapacity(settlement.kind, G.ruleset)} pops
                      </em>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="growPopBenefitPanel">
              <div>
                <strong>Cost</strong>
                <span>{Object.keys(status?.cost ?? {}).length > 0 ? formatResourceCost(status?.cost ?? {}) : "free"}</span>
              </div>
              {kind === "demote" && from === "freemen" && G.pendingRiot?.playerID !== playerID ? (
                <div>
                  <strong>Also</strong>
                  <span>−{G.ruleset.ladder.demoteHappinessPenalty.freemen} happiness</span>
                </div>
              ) : null}
            </div>

            {disabled ? (
              <div className="selectionSummary negative">
                <span>{actionRequirementText(status, phase, isActive)}</span>
              </div>
            ) : (
              <div className="selectionSummary positive">
                <span>
                  Ready: {verb.toLowerCase()} 1 {formatPopLabel(from, 1)} to {formatPopLabel(to, 1)} in{" "}
                  {holdingShortLabel(holding.tile, holding.settlement)}.
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="emptyState">No settlement holds a {formatPopLabel(from, 1)} to {verb.toLowerCase()}.</p>
        )}

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={disabled}
            onClick={() => holding && onConfirm(holding.tile.id, from, kind)}
          >
            {verb}
          </button>
        </div>
      </section>
    </div>
  );
}
