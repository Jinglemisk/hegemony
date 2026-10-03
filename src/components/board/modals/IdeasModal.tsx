import { useState } from "react";
import { getNationalIdeas } from "../../../game/ideas";
import { getPlayerName } from "../../../game/core/query";
import type { NationalIdeaId, IdeaPopChoice } from "../../../game/ideaTypes";
import { enumerateLegalOptions } from "../../../game/legalMoves";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../GameUiContext";
import { Chips } from "../../frame/parts";
import { ModalShell } from "./ModalShell";

export function IdeasModal({
  onClose,
  onNextSeat,
}: {
  onClose?: () => void;
  onNextSeat?: () => void;
}) {
  const { G, viewerId, moves } = useGameUi();
  const [selected, setSelected] = useState<NationalIdeaId | null>(null);
  const [target, setTarget] = useState<IdeaPopChoice | undefined>();
  const setup = G.phase === "setupIdeas";
  const options = enumerateLegalOptions(G, viewerId).filter(
    ({ command }) => command.type === (setup ? "pickIdea" : "buyIdea"),
  );
  const choice = options.find(
    ({ command }) =>
      (command.type === "pickIdea" || command.type === "buyIdea") &&
      command.ideaId === selected &&
      (command.target
        ? command.target.pop === target?.pop && command.target.tileId === target?.tileId
        : !target),
  );
  const popChoices = options.flatMap(({ command }) =>
    (command.type === "pickIdea" || command.type === "buyIdea") &&
    command.ideaId === selected &&
    command.target
      ? [command.target]
      : [],
  );
  const names = settlementNames(G.board.tiles);
  const locked = setup && Boolean(G.setupIdeaPicks[viewerId]);
  return (
    <ModalShell
      backdropClassName={`ideas-backdrop${setup ? " ideas-setup" : ""}`}
      className="ideas-modal"
      labelledBy="ideas-heading"
      onDismiss={onClose}
    >
      <header className="ideas-heading" data-c="ideas-heading">
        <h2 id="ideas-heading">
          {setup ? `${getPlayerName(G, viewerId)} · Choose a National Idea` : "Buy a National Idea"}
        </h2>
        <p>
          {setup
            ? "Each seat chooses one; choices reveal together before Year 1."
            : "Spend influence for your second permanent Idea."}
        </p>
      </header>
      {locked ? (
        <p>Your choice is locked; the other seats still need to choose.</p>
      ) : (
        <div className="ideas-list" data-c="ideas-list">
          {getNationalIdeas(G).map((idea) => (
            <button
              aria-pressed={selected === idea.id}
              className="idea-choice"
              data-c="idea-choice"
              disabled={
                !options.some(
                  ({ command }) =>
                    (command.type === "pickIdea" || command.type === "buyIdea") &&
                    command.ideaId === idea.id,
                )
              }
              key={idea.id}
              onClick={() => {
                setSelected(idea.id);
                setTarget(undefined);
              }}
              type="button"
            >
              <span className="idea-choice-name">
                <strong>{idea.name}</strong>
                {selected === idea.id ? <span className="idea-selected">✓ Selected</span> : null}
              </span>
              <span>{idea.text}</span>
            </button>
          ))}
        </div>
      )}
      <footer className="ideas-footer" data-c="ideas-footer">
        {popChoices.length > 0 ? (
          <label className="idea-target">
            New settler
            <select
              aria-label="New Settlers pop and settlement"
              value={target ? `${target.tileId}:${target.pop}` : ""}
              onChange={(event) =>
                setTarget(popChoices.find((t) => `${t.tileId}:${t.pop}` === event.target.value))
              }
            >
              <option value="">Choose a pop and settlement</option>
              {popChoices.map((t) => {
                const s = G.board.tiles
                  .find((tile) => tile.id === t.tileId)
                  ?.settlements.find((s) => s.owner === viewerId);
                return (
                  <option key={`${t.tileId}:${t.pop}`} value={`${t.tileId}:${t.pop}`}>
                    {t.pop === "slaves" ? "Slave" : "Freeman"} · {s ? names.get(s.id) : t.tileId}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}
        {onClose ? (
          <button onClick={onClose} type="button">
            Close Ideas
          </button>
        ) : null}
        {locked ? (
          <button className="primaryButton" onClick={onNextSeat} type="button">
            Next seat
          </button>
        ) : (
          <button
            className="primaryButton"
            data-idea-confirm
            disabled={!choice}
            onClick={() => {
              if (
                !choice ||
                (choice.command.type !== "pickIdea" && choice.command.type !== "buyIdea")
              )
                return;
              if (setup) moves.pickIdea(viewerId, choice.command.ideaId, choice.command.target);
              else {
                moves.buyIdea(choice.command.ideaId, choice.command.target);
                onClose?.();
              }
            }}
            type="button"
          >
            {setup ? "Choose Idea" : "Buy Idea"}
            {!setup && choice ? <Chips amounts={choice.cost ?? {}} /> : null}
          </button>
        )}
      </footer>
    </ModalShell>
  );
}
