import type { LogEntry, LogMoment } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { commitVerb } from "./ceremonyMood";
import { LossCard } from "./LossCard";
import { leaveLines, nextFoot, tokensLine } from "./lossLines";

/**
 * The revolt card: the largest loss in the game, read by the seat that revolted once
 * its turn has passed. No roll and no choice: half the slaves leave, rounded down,
 * and the Unrest tokens clear. With no slaves it costs only the tokens, as intended.
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
  const { slaves, left, tokensCleared, level } = entry.moment;

  return (
    <LossCard
      blow={{
        text: `−${left.length} slaves`,
        tone: "negative",
        magnitude: left.length ? `−${left.length}` : "0",
        subject: "Slaves",
        condition: slaves ? `half of ${slaves}, rounded down` : "no slaves are left to walk away",
      }}
      blowIcon="pops/slaves"
      commit={commitVerb("wound")}
      foot={nextFoot(G, entry)}
      kicker={`Turn end · ${G.players[owner].name}’s realm`}
      lines={[...leaveLines(G, owner, left), tokensLine(tokensCleared, level)]}
      onCommit={onClose}
      title="Revolt"
      voice="The fields are empty by morning."
    />
  );
}
