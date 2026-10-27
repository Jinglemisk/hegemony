import { PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard, nextAssemblyYear, politicianStandings } from "../../../game/assembly";
import type { PoliticianStanding } from "../../../game/assembly";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { resolutionCardFace } from "../../../ui/cardFace";
import { turnsUntilYear } from "../../../ui/frameSelectors";
import { numberWord, yearLabel } from "../../../ui/formatters";
import { AnnotatedText, Prose } from "../../AnnotatedText";
import { GameCard } from "../../cards/GameCard";
import { Ico, SeatMark, Tip, TipBody, Turns } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { StandingLawDetails } from "../assembly/AssemblyPresentation";
import { TitleRow } from "./VictoryTab";

/**
 * The Agora: what the Assembly left standing, readable at any time, as a ledger like
 * Victory's. The Assembly panel only exists while the house sits; its consequences
 * last all game. So this page says when the house sits next, which Laws stand, and
 * how many stelae each seat has raised under each orator, and it ends on the Voice
 * title those Laws decide. Every figure comes from the same engine standings the
 * Assembly and the win check read, so the pages cannot disagree.
 */

export function AgoraTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = politicianStandings(G);
  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");
  const lawCap = G.ruleset.assembly.lawCap;
  const nextYear = nextAssemblyYear(G);
  const laws = G.activeLaws.slice().sort((left, right) => left.order - right.order);
  const empty = lawCap - laws.length;

  return (
    <div className="agoraPage" data-c="agora">
      <p className="a-next caps">
        {G.assembly ? (
          <Prose>The Assembly sits now</Prose>
        ) : nextYear === null ? (
          <Prose>No Assembly is left</Prose>
        ) : (
          <Prose>
            Next Assembly <Turns n={turnsUntilYear(G, playerID, nextYear)} />
          </Prose>
        )}
      </p>

      <div className="r-head a-head caps">Standing laws</div>
      {laws.map((law) => {
        const card = getResolutionCard(G.definition.content, law.cardId);
        return card ? (
          <div className="a-law" key={`${law.cardId}-${law.order}`}>
            <GameCard
              face={resolutionCardFace(card, G.ruleset, G.definition.content)}
              size="mini"
            />
            <div>
              <span className="r-place">
                <Ico path="assembly/law" size="chip" />
                <Tooltip
                  content={<StandingLawDetails G={G} card={card} law={law} />}
                  focusable
                  triggerClassName="name v-name"
                >
                  {card.name}
                </Tooltip>
              </span>
              <p className="a-law-text">
                <AnnotatedText linkContext={card.name} text={card.text} />
              </p>
              <p className="a-law-meta">
                carried by {PLAYER_NAMES[law.author]} · {yearLabel(law.enactedYear)}
              </p>
            </div>
          </div>
        ) : null;
      })}
      {empty > 0 ? (
        <p className="a-empty page-empty">
          <AnnotatedText
            text={`${numberWord(empty)} ${empty === 1 ? "stele stands" : "stelae stand"} empty`}
          />
        </p>
      ) : null}

      <div className="r-grid v-grid r-head a-head">
        <span className="caps">Orator</span>
        {PLAYER_IDS.map((id) => (
          <span className={id === playerID ? "is-you" : undefined} key={id}>
            <SeatMark playerID={id} />
          </span>
        ))}
      </div>
      {standings.map((standing) => (
        <div
          className="r-place-rows"
          data-orator={standing.politician.id}
          key={standing.politician.id}
        >
          <div className="r-grid v-grid r-a">
            <span className="r-place">
              <Ico path="assembly/politician" size="chip" />
              <Tooltip
                content={
                  <Tip title={standing.politician.name}>
                    <TipBody>{standing.politician.creed}</TipBody>
                  </Tip>
                }
                focusable
                triggerClassName="name v-name"
              >
                {standing.politician.name}
              </Tooltip>
            </span>
            {PLAYER_IDS.map((id) => (
              <span className={`cell${id === standing.patron ? " is-held" : ""}`} key={id}>
                {standing.authored[id]}
              </span>
            ))}
          </div>
          <div className="r-b">
            <AnnotatedText
              className="cap"
              linkContext={standing.politician.name}
              text={oratorLine(standing)}
            />
          </div>
        </div>
      ))}

      {voice ? (
        <div className="a-voice">
          <TitleRow G={G} standing={voice} />
        </div>
      ) : null}
    </div>
  );
}

/** The Directive politician counts monuments, which never come down; the others count
 *  standing Laws. */
function oratorLine({ politician, patron, power }: PoliticianStanding) {
  const epithet = politician.epithet.toLowerCase();
  const monuments = politician.kind === "directive";
  if (power === 0) {
    return `${epithet} · ${monuments ? "no monument yet" : "no stele"}`;
  }
  const standing = patron ? `patron ${PLAYER_NAMES[patron]}` : "split, no patron";
  return `${epithet} · ${monuments ? "monuments, " : ""}${standing}`;
}
