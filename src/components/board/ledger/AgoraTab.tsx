import { PLAYER_COLORS, PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/core/calendar";
import { getResolutionCard, politicianStandings } from "../../../game/assembly";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";

/**
 * The Agora — the standing record, readable at any time.
 *
 * The Assembly panel itself only exists while the house sits, but its consequences
 * last all game: between assemblies a player still needs to know which Laws are
 * biting them, and who is patron of what. Stratokles's danger reads through colour and
 * his stack of monuments alone — the coup COUNTER lives in the Victory ledger. This
 * page is that record, and it reads from exactly the same board-derived standings the
 * panel does, so the two can never tell different stories.
 */
export function AgoraTab({ G }: { G: HegemonyState }) {
  const standings = politicianStandings(G);
  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");
  const rules = G.ruleset.assembly;
  const nextYear = Math.max(rules.firstYear, yearOf(G.season) + (G.assembly ? 1 : 0));

  return (
    <div className="agoraPage">
      <section className="agoraSummary">
        <div className="agoraSummaryRow">
          <span className="agoraKey">Standing laws</span>
          <span className="agoraValue">
            {G.activeLaws.length}
            <span className="agoraOf">/{rules.lawCap}</span>
          </span>
        </div>
        <div className="agoraSummaryRow">
          <span className="agoraKey">Assemblies held</span>
          <span className="agoraValue">{G.assembliesHeld}</span>
        </div>
        <div className="agoraSummaryRow">
          <span className="agoraKey">Voice of the Assembly</span>
          <span className="agoraValue agoraVoice">
            {voice?.holder ? (
              <>
                <span className="agoraDot" style={{ background: PLAYER_COLORS[voice.holder] }} />
                {PLAYER_NAMES[voice.holder]}
              </>
            ) : (
              <em>unheld</em>
            )}
          </span>
        </div>
      </section>

      <p className="agoraNote">
        {rules.firstYear === 0 ? (
          "The Assembly is not convening in this game."
        ) : G.assembly ? (
          "The Assembly is sitting now."
        ) : (
          <>
            The Assembly convenes each spring from Year {rules.firstYear} — next in the spring of Year{" "}
            {nextYear + (yearOf(G.season) >= rules.firstYear ? 1 : 0)}. A passed Law stands until it is repealed.
          </>
        )}
      </p>

      {standings.map((standing) => {
        const isStratokles = standing.politician.id === "stratokles";
        const stelae = isStratokles
          ? G.tallyMonuments
          : G.activeLaws.filter((law) => getResolutionCard(law.cardId)?.politician === standing.politician.id);

        return (
          <section className="agoraPolitician" key={standing.politician.id}>
            <header className={isStratokles ? "agoraHead strat" : "agoraHead"}>
              <span className="agoraPower">{standing.power}</span>
              <span className="agoraName">
                {standing.politician.name}
                <em>{standing.politician.epithet}</em>
              </span>
            </header>

            <p className="agoraCreed">{standing.politician.creed}</p>

            <div className="agoraPatron">
              {standing.patron ? (
                <>
                  <span className="agoraDot" style={{ background: PLAYER_COLORS[standing.patron] }} />
                  <strong>{PLAYER_NAMES[standing.patron]}</strong> is patron
                  {standing.dominant ? (
                    <>
                      {" "}
                      and holds <em>{standing.politician.patronBuff.label}</em>
                    </>
                  ) : (
                    <>
                      {" "}
                      — {rules.dominanceThreshold - standing.power} more stele
                      {rules.dominanceThreshold - standing.power === 1 ? "" : "e"} to unlock{" "}
                      <em>{standing.politician.patronBuff.label}</em>
                    </>
                  )}
                </>
              ) : (
                <em>{standing.power === 0 ? "No stelae stand." : "No patron — the stack is split."}</em>
              )}
            </div>

            {stelae.length > 0 ? (
              <ul className="agoraLaws">
                {stelae
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((stele) => {
                    const card = getResolutionCard(stele.cardId);

                    return (
                      <li key={`${stele.cardId}-${stele.order}`}>
                        <span className="agoraDot" style={{ background: authorColor(stele.author) }} />
                        <span className="agoraLawBody">
                          <strong>{card?.name ?? stele.cardId}</strong>
                          <span className="agoraLawText">
                            <AnnotatedText text={card?.text ?? ""} />
                          </span>
                          <span className="agoraLawMeta">
                            {isStratokles ? "Monument" : "Law"} · carried by {authorName(stele.author)} in Year{" "}
                            {yearOf(stele.enactedSeason)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** An unauthored house resolution reads as stone, not as anyone's seat colour. */
function authorColor(author: PlayerId | null): string {
  return author ? PLAYER_COLORS[author] : "var(--stone)";
}

function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
