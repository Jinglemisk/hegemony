import { useState } from "react";
import { IDEA_PURCHASE_COST, getNationalIdeas, ideaDraft, ideaHolders } from "../../../game/ideas";
import type { NationalIdeaId, IdeaPopChoice } from "../../../game/ideaTypes";
import { enumerateLegalOptions } from "../../../game/legalMoves";
import type { HegemonyState } from "../../../game/types";
import { IDEA_ICON } from "../../../ui/frameFormat";
import { formatNumber } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../GameUiContext";
import { Chips, Ico, SeatMark } from "../../frame/parts";
import { ModalShell } from "./ModalShell";

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * The National Idea list, three ways: the seat choosing in the open draft (in
 * hotseat the viewer follows the turn, so a rival's pick is already marked when the
 * next seat sits down), the draft read back once the last pick lands, and the
 * in-play purchase. Every taken Idea carries its holder's mark and cannot be taken
 * again.
 */
export function IdeasModal({
  onClose,
  draftDone = false,
}: {
  onClose?: () => void;
  /** The draft has just ended: show it with no controls, and the commit into Year I. */
  draftDone?: boolean;
}) {
  const { G, viewerId, currentPlayerId, moves } = useGameUi();
  const [selected, setSelected] = useState<NationalIdeaId | null>(null);
  const [target, setTarget] = useState<IdeaPopChoice | undefined>();
  const setup = G.phase === "setupIdeas" || draftDone;
  const buying = !setup;
  const options = enumerateLegalOptions(G, viewerId).filter(
    ({ command }) => command.type === (buying ? "buyIdea" : "pickIdea"),
  );
  const legal = (id: NationalIdeaId) =>
    options.some(
      ({ command }) =>
        (command.type === "pickIdea" || command.type === "buyIdea") && command.ideaId === id,
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
  const ideas = getNationalIdeas(G);
  const holders = ideaHolders(G);
  const draft = ideaDraft(G);
  // Picks land in draft order, so the last seat holding one took the newest.
  const latest = [...draft].reverse().find((seat) => seat.ideaId);
  const fresh = draftDone ? (latest?.ideaId ?? undefined) : undefined;
  const selectedIdea = ideas.find((idea) => idea.id === selected);
  const names = settlementNames(G.board.tiles);
  const picked = draft.filter((seat) => seat.ideaId).length;
  const left = ideas.length - holders.size;

  const commit = () => {
    if (!choice || (choice.command.type !== "pickIdea" && choice.command.type !== "buyIdea"))
      return;
    if (choice.command.type === "pickIdea") {
      moves.pickIdea(viewerId, choice.command.ideaId, choice.command.target);
      setSelected(null);
      setTarget(undefined);
    } else {
      moves.buyIdea(choice.command.ideaId, choice.command.target);
      onClose?.();
    }
  };

  // The setup page owns the viewport and is gated as a layout; the purchase sheet
  // is a dialog over the frame and, like the fate card, carries no `data-c`.
  const gate = (name: string) => (setup ? { "data-c": name } : {});
  const rows = (
    <div className={`ideas-list${draftDone ? " is-view" : ""}`} {...gate("ideas-list")}>
      {ideas.map((idea) => {
        const holder = holders.get(idea.id);
        const own = holder?.playerID === viewerId && buying;
        const taken = Boolean(holder) && !own && idea.id !== fresh;
        const mark =
          idea.id === selected
            ? "Selected"
            : idea.id === fresh
              ? "Just taken"
              : own
                ? "Yours"
                : holder
                  ? "Taken"
                  : null;
        return (
          <button
            aria-pressed={selected === idea.id}
            className={`idea-choice${taken ? " is-taken" : ""}${own ? " is-own" : ""}${idea.id === fresh ? " is-fresh" : ""}`}
            {...gate("idea-choice")}
            disabled={!legal(idea.id) || draftDone}
            key={idea.id}
            onClick={() => {
              setSelected(idea.id);
              setTarget(undefined);
            }}
            type="button"
          >
            <Ico className="idea-icon" path={IDEA_ICON[idea.id]} size="tile" />
            <span className="idea-words">
              <strong>{idea.name}</strong>
              <span>{idea.text}</span>
            </span>
            <span className="idea-hold">
              {holder ? (
                <SeatMark
                  playerID={holder.playerID}
                  year={holder.acquired === "purchase" ? holder.year : undefined}
                />
              ) : null}
              {mark ? (
                <span className={`idea-mark${own ? " is-own" : holder ? " is-taken" : ""}`}>
                  {mark}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );

  const settlerPicker =
    popChoices.length > 0 ? (
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
    ) : null;

  if (buying) {
    const influence = G.players[viewerId].resources.influence;
    return (
      <ModalShell
        backdropClassName="ideas-backdrop"
        className="ideas-modal"
        labelledBy="ideas-heading"
        onDismiss={onClose}
      >
        <header className="ideas-head">
          <Ico path="assembly/national-idea" size="disc" />
          <div className="ideas-title">
            <span className="ideas-kicker">Once per game</span>
            <h2 id="ideas-heading">Buy a National Idea</h2>
            <p>
              {formatNumber(IDEA_PURCHASE_COST.influence)} influence · you hold{" "}
              {formatNumber(influence)} · {COUNT[left] ?? formatNumber(left)}{" "}
              {left === 1 ? "Idea" : "Ideas"} left
            </p>
          </div>
          <button className="ideas-close" onClick={onClose} type="button">
            Close
          </button>
        </header>
        {rows}
        <footer className="ideas-footer">
          {settlerPicker ?? (
            <span className="ideas-legend">
              A holder&rsquo;s mark: plain for the draft, tagged with the year when bought.
            </span>
          )}
          <button
            className="primaryButton"
            data-idea-confirm
            disabled={!choice}
            onClick={commit}
            type="button"
          >
            {selectedIdea ? `Buy ${selectedIdea.name}` : "Buy an Idea"}
            {choice ? <Chips amounts={choice.cost ?? {}} /> : null}
          </button>
        </footer>
      </ModalShell>
    );
  }

  const acting = draftDone ? latest?.playerID : currentPlayerId;
  return (
    <ModalShell
      backdropClassName="ideas-backdrop ideas-setup"
      className="ideas-modal"
      labelledBy="ideas-heading"
      onDismiss={draftDone ? onClose : undefined}
    >
      <div className="draft">
        <div className="draft-main">
          <header className="ideas-heading" data-c="ideas-heading">
            <span className="ideas-kicker">
              Setup · the draft · pick {Math.min(picked + (draftDone ? 0 : 1), draft.length)} of{" "}
              {draft.length}
            </span>
            <h2 id="ideas-heading">
              {acting ? <SeatMark playerID={acting} /> : null}
              {draftDone
                ? `${acting ? G.players[acting].name : "The last seat"} took ${ideas.find((i) => i.id === fresh)?.name ?? "an Idea"}`
                : `${G.players[currentPlayerId].name} · take a National Idea`}
            </h2>
            <p>
              {draftDone
                ? "The draft is done. The Ideas left can be bought in play for 6 influence."
                : "Seats pick in turn. A taken Idea is gone for everyone else."}
            </p>
          </header>
          {rows}
          <footer className="ideas-footer" data-c="ideas-footer">
            {draftDone ? (
              <>
                <span className="ideas-legend">Year I&rsquo;s card comes next.</span>
                <button className="primaryButton" onClick={onClose} type="button">
                  Turn the first year
                </button>
              </>
            ) : (
              <>
                {settlerPicker ??
                  (selectedIdea ? (
                    <span className="ideas-legend">
                      {selectedIdea.name} · {selectedIdea.text}
                    </span>
                  ) : null)}
                <button
                  className="primaryButton"
                  data-idea-confirm
                  disabled={!choice}
                  onClick={commit}
                  type="button"
                >
                  {selectedIdea ? `Take ${selectedIdea.name}` : "Take an Idea"}
                </button>
              </>
            )}
          </footer>
        </div>
        <DraftOrder G={G} draftDone={draftDone} />
      </div>
    </ModalShell>
  );
}

/** Who took what, who is choosing, who is next. */
function DraftOrder({ G, draftDone }: { G: HegemonyState; draftDone: boolean }) {
  const draft = ideaDraft(G);
  const ideas = getNationalIdeas(G);
  const nextIndex = draft.findIndex((seat) => seat.state === "choosing") + 1;
  return (
    <section aria-labelledby="draft-order-heading" className="draft-order" data-c="draft-order">
      <h3 className="ideas-kicker" id="draft-order-heading">
        Draft order
      </h3>
      <ol>
        {draft.map((seat, index) => {
          const idea = ideas.find((i) => i.id === seat.ideaId);
          const status = idea
            ? idea.name
            : seat.state === "choosing"
              ? "choosing"
              : index === nextIndex
                ? "next"
                : "waiting";
          const now = seat.state === "choosing" || (draftDone && index === draft.length - 1);
          return (
            <li
              className={`draft-seat${now ? " is-now" : ""}`}
              data-c="draft-seat"
              key={seat.playerID}
            >
              <span className="draft-n">{index + 1}</span>
              <SeatMark playerID={seat.playerID} />
              <span className="draft-who">
                <b>{G.players[seat.playerID].name}</b>
                <span className={`draft-what is-${idea ? "picked" : seat.state}`}>{status}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
