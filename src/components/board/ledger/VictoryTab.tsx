import { PLAYER_IDS } from "../../../game/data";
import { victoryStandings } from "../../../game/victory";
import type { VictoryCardStanding } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber, numberWord } from "../../../ui/formatters";
import { Ico, SeatMark } from "../../frame/parts";

/**
 * The victory race as a ledger, like the realm's pages: a numbers line per title,
 * every seat's value under its seal printed once at the head; under it, what the
 * title measures, its minimum, and who holds it, who leads short of the minimum, or
 * that the lead is tied. Holders and leaders come from the engine helper the win
 * check uses, so the ledger cannot disagree with the rules.
 */
export function VictoryTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = victoryStandings(G);
  const cardsToWin = G.ruleset.victory.cardsToWin;
  const held = standings.filter(({ holder }) => holder === playerID).length;

  return (
    <div className="victoryPage roster" data-c="victory">
      <p className="v-held caps">
        You hold {held} of {cardsToWin} · {numberWord(cardsToWin)} at your turn’s start win
      </p>
      <div className="r-grid v-grid r-head">
        <span className="caps">Title</span>
        {PLAYER_IDS.map((id) => (
          <span className={id === playerID ? "is-you" : undefined} key={id}>
            <SeatMark playerID={id} />
          </span>
        ))}
      </div>
      {standings.map((standing) => (
        <TitleRow G={G} key={standing.card.id} standing={standing} />
      ))}
    </div>
  );
}

/** One title's numbers line and sub-line. The Agora ends on Voice's. */
export function TitleRow({ G, standing }: { G: HegemonyState; standing: VictoryCardStanding }) {
  const { card, holder, leader, minimum, values } = standing;
  return (
    <div className="r-place-rows" data-title={card.id}>
      <div className="r-grid v-grid r-a">
        <span className="r-place">
          <Ico path={`victory/${card.id}`} size="chip" />
          <b className="v-name">{card.name}</b>
        </span>
        {PLAYER_IDS.map((id) => (
          <span
            className={`cell${id === holder ? " is-held" : id === leader ? " is-lead" : ""}`}
            key={id}
          >
            {formatNumber(values[id]).replace("-", "−")}
          </span>
        ))}
      </div>
      <div className="r-b">
        <span className="cap">
          {card.description.toLowerCase()}, min {formatNumber(minimum)} ·{" "}
          {standingLine(G, standing)}
        </span>
      </div>
    </div>
  );
}

function standingLine(G: HegemonyState, { holder, leader, minimum }: VictoryCardStanding) {
  if (holder) return `held by ${G.players[holder].name}`;
  if (leader) return `${G.players[leader].name} leads, short of ${formatNumber(minimum)}`;
  return "tied";
}
