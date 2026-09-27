import { useEffect, useRef, useState } from "react";
import type { HegemonyState, LogEntry, PlayerId } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { AnnotatedText } from "../../AnnotatedText";
import { ModalShell } from "../modals/ModalShell";

type Handoff = {
  playerID: PlayerId;
  entries: LogEntry[];
  firstTurn: boolean;
  revealed: boolean;
};

export function SeatHandoff({
  G,
  onTakeSeat,
}: {
  G: HegemonyState;
  onTakeSeat: (playerID: PlayerId) => void;
}) {
  const previousPlayer = useRef(G.currentPlayer);
  const previousLogLength = useRef(G.log.length);
  const lastLeftAt = useRef<Partial<Record<PlayerId, number>>>({});
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  useEffect(() => {
    const previous = previousPlayer.current;
    const next = G.currentPlayer;

    if (next !== previous && G.phase === "gameplay" && !G.assembly) {
      lastLeftAt.current[previous] = previousLogLength.current;
      const lastSeen = lastLeftAt.current[next];
      setHandoff({
        playerID: next,
        entries: lastSeen === undefined ? [] : G.log.slice(lastSeen).slice(-5),
        firstTurn: lastSeen === undefined,
        revealed: false,
      });
      previousPlayer.current = next;
    }

    previousLogLength.current = G.log.length;
  }, [G.currentPlayer, G.log, G.phase, G.assembly]);

  if (!handoff) return null;

  const glaze = PLAYER_GLAZES[handoff.playerID];
  const rulerName = G.players[handoff.playerID].name;

  return (
    <ModalShell
      backdropClassName="handoffBackdrop"
      className="handoffCard"
      label={`Pass the table to ${rulerName}`}
    >
      {!handoff.revealed ? (
        <div className="handoffSeal">
          <span className="handoffBlazon display" style={{ background: glaze.color }}>
            {glaze.blazon}
          </span>
          <p className="label">Pass the table</p>
          <h2 className="display">{rulerName}</h2>
          <p className="body">The next turn stays covered until its ruler takes the seat.</p>
          <button
            className="primaryButton handoffButton verb"
            onClick={() => {
              onTakeSeat(handoff.playerID);
              setHandoff((current) => (current ? { ...current, revealed: true } : null));
            }}
            type="button"
          >
            I am {rulerName}
          </button>
        </div>
      ) : (
        <div className="handoffDigest">
          <p className="label">Since your last turn</p>
          <h2 className="display">{rulerName}</h2>
          {handoff.firstTurn ? (
            <p className="body">
              This is your first seat at the table. No earlier turn needs review.
            </p>
          ) : handoff.entries.length > 0 ? (
            <ol>
              {handoff.entries.map((entry) => (
                <li className="body" key={entry.id}>
                  <AnnotatedText links={false} text={entry.message} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="body">No chronicle entries were added while you were away.</p>
          )}
          <button
            className="primaryButton handoffButton verb"
            onClick={() => setHandoff(null)}
            type="button"
          >
            Begin turn
          </button>
        </div>
      )}
    </ModalShell>
  );
}
