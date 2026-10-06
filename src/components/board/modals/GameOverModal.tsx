import { PLAYER_IDS } from "../../../game/data";
import { ageEndRanking, victoryCardsHeld, victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { TITLE_SHORT, numberWord, sign } from "../../../ui/frameFormat";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { Ico } from "../../frame/parts";
import { ModalShell } from "./ModalShell";

/**
 * The end of the game: someone opened their turn holding enough titles (the race),
 * or the year deck ran out and the tally resolved (the age). A tablet in the `rite`
 * weather, worded for the winner when the viewer won and by name otherwise. Every
 * seat shows its titles; after the age, one line names the tiebreak that decided
 * it. Blocking with no Escape: the player leaves through "Inspect the board", or
 * starts a new game.
 */
export function GameOverModal({
  G,
  viewerId,
  onInspectBoard,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  onInspectBoard: () => void;
}) {
  const winner = G.winner;

  if (!winner) {
    return null;
  }

  const standings = victoryStandings(G);
  const raced = G.gameOverReason === "victoryRace";
  const tally = raced ? null : ageEndRanking(G);
  // The race's winner leads even on a count others share; the age follows its tally.
  const ranked = tally
    ? tally.rows.map((row) => row.seat)
    : [...PLAYER_IDS].sort(
        (a, b) =>
          Number(b === winner) - Number(a === winner) ||
          victoryCardsHeld(G, b) - victoryCardsHeld(G, a),
      );
  const you = winner === viewerId;
  const name = (seat: PlayerId) => G.players[seat].name;
  const toWin = numberWord(G.ruleset.victory.cardsToWin);

  return (
    <ModalShell
      backdropClassName="tabletScrim"
      ceremony="rite"
      className="ceremonyTablet ageEnd"
      labelledBy="game-over-title"
    >
      <header className="tabletHead">
        <span className="tabletKicker label">
          {raced
            ? `The race is won · Year ${toRoman(G.year)}`
            : `The age has ended · after Year ${toRoman(G.year)}`}
        </span>
        <h2 className="display display-xl" id="game-over-title">
          {you ? "You rule" : `${name(winner)} rules`} the Hegemony
        </h2>
        <p className="tabletVoice body-em">
          {raced
            ? `${you ? "You" : name(winner)} opened their turn holding ${toWin} titles.`
            : "The year deck is spent. Most titles wins."}
        </p>
      </header>

      <ol className="ageStandings">
        {ranked.map((id, index) => {
          const held = standings.filter((standing) => standing.holder === id);
          return (
            <li className={id === winner ? "ageSeat ageSeatCrowned" : "ageSeat"} key={id}>
              <span className="ageRank num stat">{index + 1}</span>
              <span className="seatGlaze label" style={{ background: glazeOf(id) }}>
                {PLAYER_GLAZES[id].blazon}
              </span>
              <span className="ageWho">
                <b className="title">
                  {name(id)}
                  {id === viewerId ? " · you" : ""}
                </b>
                <span className="ageTitles caption">
                  {held.length
                    ? held.map(({ card }) => (
                        <span className="ageTitle" key={card.id}>
                          <Ico path={`victory/${card.id}`} size="ui" />
                          {TITLE_SHORT[card.id] ?? card.name}
                        </span>
                      ))
                    : "no titles held"}
                </span>
              </span>
              <span className="ageCards num stat-lg">{held.length}</span>
            </li>
          );
        })}
      </ol>

      {tally && tally.decidedBy !== "titles" ? (
        <p className="ageTiebreak body">
          <Ico path={TIEBREAK_ICON[tally.decidedBy]} size="ui" />
          {tiebreakLine(tally, viewerId, name)}
        </p>
      ) : null}

      <footer className="tabletFoot ageActs">
        <button className="ghostVerb verb" onClick={onInspectBoard} type="button">
          Inspect the board
        </button>
        <button
          className="ceremonyCommit verb verb-lg"
          onClick={() => window.location.assign(window.location.pathname)}
          type="button"
        >
          New game
        </button>
      </footer>
    </ModalShell>
  );
}

const TIEBREAK_ICON = {
  titles: "victory/laurel",
  happiness: "resources/happiness",
  pops: "pops/crowd",
  seat: "victory/laurel",
} as const;

/** "Tied on two titles. You win on happiness: +4 to Damon's +1." */
function tiebreakLine(
  tally: ReturnType<typeof ageEndRanking>,
  viewerId: PlayerId,
  name: (seat: PlayerId) => string,
): string {
  const [first, second] = tally.rows;
  const winner = first.seat === viewerId ? "You win" : `${name(first.seat)} wins`;
  const rival = second.seat === viewerId ? "your" : `${name(second.seat)}’s`;
  const tied = first.titles
    ? `Tied on ${numberWord(first.titles)} ${first.titles === 1 ? "title" : "titles"}`
    : "Tied with no titles";
  switch (tally.decidedBy) {
    case "happiness":
      return `${tied}. ${winner} on happiness: ${sign(first.happiness)} to ${rival} ${sign(second.happiness)}.`;
    case "pops":
      return `${tied}, and on happiness. ${winner} on pops: ${first.pops} to ${rival} ${second.pops}.`;
    default:
      return `${tied}, and on happiness and pops. ${winner} on seat order.`;
  }
}
