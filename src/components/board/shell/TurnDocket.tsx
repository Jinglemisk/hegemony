import { useEffect, useMemo, useRef, useState } from "react";
import { getTurnAdvisory, seasonName, yearOf } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { TurnDial } from "../topbar/TurnDial";

export function TurnDocket({
  G,
  actingPlayerId,
  canEndTurn,
  onEndTurn,
}: {
  G: HegemonyState;
  actingPlayerId: PlayerId;
  canEndTurn: boolean;
  onEndTurn: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const advisory = useMemo(() => getTurnAdvisory(G, actingPlayerId), [G, actingPlayerId]);
  const calendar = `Year ${toRoman(yearOf(G.season))} · ${seasonName(G.season)}`;

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="turnDocketCluster">
      <TurnDial
        G={G}
        actingPlayerId={actingPlayerId}
        canEndTurn={canEndTurn}
        onEndTurn={onEndTurn}
      />
      <button
        aria-controls="turn-docket"
        aria-expanded={open}
        className="turnDocketToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <strong className="verb">End turn</strong>
        <span className="caption">{calendar}</span>
      </button>

      {open ? (
        <section
          aria-label="End-turn review"
          className="turnDocket"
          id="turn-docket"
          ref={panelRef}
        >
          <header>
            <span className="label">Before the table passes</span>
            <button
              className="turnDocketDismiss caption"
              onClick={() => setOpen(false)}
              type="button"
            >
              Close
            </button>
          </header>

          <div className="turnDocketIncome">
            <span className="label">Next income</span>
            <ResourceDeltaList resources={advisory.income} />
          </div>

          <ul className="turnDocketList">
            {advisory.items.length > 0 ? (
              advisory.items.map((item) => (
                <li className={`turnDocketItem is-${item.tone}`} key={item.id}>
                  <strong className="body">{item.label}</strong>
                  <span className="caption">{item.detail}</span>
                </li>
              ))
            ) : (
              <li className="turnDocketItem is-info">
                <strong className="body">No unresolved warnings</strong>
                <span className="caption">The turn can pass as it stands.</span>
              </li>
            )}
          </ul>

          <button
            aria-disabled={!canEndTurn || !advisory.canCommit}
            className="turnDocketCommit verb"
            onClick={
              canEndTurn && advisory.canCommit
                ? () => {
                    setOpen(false);
                    onEndTurn();
                  }
                : undefined
            }
            type="button"
          >
            End turn now
          </button>
          <p className="turnDocketAlternative caption">
            The dial also commits after a deliberate press and hold.
          </p>
        </section>
      ) : null}
    </div>
  );
}
