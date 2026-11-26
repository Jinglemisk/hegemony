import { useEffect, useRef } from "react";
import type { LogEntry, LogMoment } from "../../../game/types";
import { revoltFace } from "../../../ui/cardFace";
import { presentUnrestOutcome } from "../../../ui/effects";
import { useGameUi } from "../GameUiContext";
import { LossSheet, LossSpread, SoBeIt } from "./LossSheet";
import { nextFoot, takenLines, tokensLine } from "./lossLines";

const CARD_TITLE_ID = "revolt-card-title";

/**
 * The revolt card: the largest loss in the game, read by the seat that revolted once
 * its turn has passed, on the riot's sheet. No roll and no choice: the ruleset's share of
 * the slaves leaves, rounded down, and the Unrest tokens clear. With no slaves it costs
 * only the tokens, as intended.
 */
export function RevoltModal({
  entry,
  onClose,
}: {
  entry: LogEntry & { moment: Extract<LogMoment, { kind: "revolt" }> };
  onClose: () => void;
}) {
  const { G } = useGameUi();
  const owner = entry.about!;
  const { left, tokensCleared, level, taken = [] } = entry.moment;
  const foot = nextFoot(G, entry);
  const commit = useRef<HTMLButtonElement>(null);

  // The one control is safe to land on: it only closes the card.
  useEffect(() => {
    const timer = window.setTimeout(() => commit.current?.focus());
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <LossSheet
      act={<SoBeIt next={foot.next} onClick={onClose} ref={commit} />}
      icon="unrest/revolt"
      kicker={`Turn end · ${G.players[owner].name}’s realm`}
      labelledBy={CARD_TITLE_ID}
      note={`${foot.when} · ${foot.next}`}
      title="Revolt"
    >
      <LossSpread
        face={revoltFace(presentUnrestOutcome(G.ruleset, "revolt").share, left.length)}
        lines={[...takenLines(G, owner, taken), tokensLine(tokensCleared, level)]}
        titleId={CARD_TITLE_ID}
      />
    </LossSheet>
  );
}
