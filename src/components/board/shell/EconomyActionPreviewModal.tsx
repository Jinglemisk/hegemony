import type { EconomyPreview } from "../../../game/rules";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { formatNumber } from "../../../ui/formatters";
import { settlementNameOf } from "../../../ui/settlementNames";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { useGameUi } from "../GameUiContext";
import { ModalShell } from "../modals/ModalShell";

export function EconomyActionPreviewModal({
  confirmLabel,
  onCancel,
  onConfirm,
  preview,
  targetLabel,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  preview: EconomyPreview;
  targetLabel: string;
}) {
  const { G, viewerId } = useGameUi();
  const changedSettlements = preview.settlements.filter(
    (settlement) =>
      settlement.popsDelta !== 0 ||
      settlement.capacityDelta !== 0 ||
      settlement.overCapacityDelta !== 0 ||
      RESOURCE_ORDER.some((resource) => settlement.incomeDelta[resource] !== 0),
  );

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop actionPreviewBackdrop"
      className="actionPreviewCard"
      labelledBy="action-preview-title"
      onDismiss={onCancel}
    >
      <header className="actionPreviewHead">
        <span className="label">Before you commit</span>
        <h2 className="display" id="action-preview-title">
          {preview.title}
        </h2>
        <span className="actionPreviewTarget body">{targetLabel}</span>
      </header>

      <div className="actionPreviewColumns">
        <PreviewStockpile label="Now" resources={preview.before.resources} />
        <span className="actionPreviewArrow" aria-hidden="true">
          →
        </span>
        <PreviewStockpile label="After payment" resources={preview.after.resources} />
      </div>

      <div className="actionPreviewDeltas">
        <section>
          <span className="label">Immediate stockpile</span>
          <ResourceDeltaList resources={preview.immediateResourceDelta} />
        </section>
        <section>
          <span className="label">Income each turn</span>
          <ResourceDeltaList resources={preview.incomeDelta} />
        </section>
        <section>
          <span className="label">After next income</span>
          <ResourceDeltaList resources={preview.projectedResourceDelta} />
        </section>
      </div>

      {changedSettlements.length > 0 ? (
        <section className="actionPreviewSettlements">
          <span className="label">Places changed</span>
          {changedSettlements.map((settlement) => (
            <p className="body" key={settlement.tileId}>
              <strong>
                {currentSettlementName(G, viewerId, settlement.tileId) ?? settlement.label}
              </strong>
              {settlement.popsDelta !== 0 ? ` · pops ${signed(settlement.popsDelta)}` : ""}
              {settlement.capacityDelta !== 0
                ? ` · capacity ${signed(settlement.capacityDelta)}`
                : ""}
              <ResourceDeltaList resources={settlement.incomeDelta} />
            </p>
          ))}
        </section>
      ) : null}

      <footer className="actionPreviewActions">
        <button className="placementCancelButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primaryButton eventResolveButton" onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </footer>
    </ModalShell>
  );
}

function PreviewStockpile({
  label,
  resources,
}: {
  label: string;
  resources: EconomyPreview["before"]["resources"];
}) {
  return (
    <section className="actionPreviewStockpile">
      <span className="label">{label}</span>
      <span className="actionPreviewResourceGrid">
        {RESOURCE_ORDER.map((resource) => (
          <span className="actionPreviewResource stat num" key={resource}>
            <Icon glyph={RESOURCE_GLYPHS[resource]} />
            {formatNumber(resources[resource])}
          </span>
        ))}
      </span>
    </section>
  );
}

const signed = (value: number) => `${value > 0 ? "+" : ""}${formatNumber(value)}`;

function currentSettlementName(
  G: ReturnType<typeof useGameUi>["G"],
  viewerId: ReturnType<typeof useGameUi>["viewerId"],
  tileId: string,
): string | null {
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === viewerId);
  return settlement ? settlementNameOf(G.board.tiles, settlement.id) : null;
}
