import { PLAYER_COLORS, PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard, politicianStandings, stratoklesCoupStatus } from "../../../game/assembly";
import type { ActiveLaw, PoliticianStanding, TallyMonument } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";

/**
 * The colonnade — four narrow columns, each politician standing over their own stack
 * of stelae.
 *
 * This one drawing does quadruple duty (design §1.2): stack height is POWER, the
 * colour that dominates a stack is the PATRON, who owns the most stacks is the
 * Voice-of-the-Assembly race, and Stratokles's stack nearing three is the COUP clock.
 * Because every one of those is read off `G.activeLaws` / `G.tallyMonuments` rather
 * than tracked, the picture can never disagree with the board.
 */
export function AssemblyColonnade({ G }: { G: HegemonyState }) {
  const standings = politicianStandings(G);
  const coup = stratoklesCoupStatus(G);

  return (
    <div className="colonnade">
      {standings.map((standing) => (
        <PoliticianColumn
          G={G}
          coup={standing.politician.id === "stratokles" ? coup : null}
          key={standing.politician.id}
          standing={standing}
        />
      ))}
    </div>
  );
}

function PoliticianColumn({
  G,
  standing,
  coup
}: {
  G: HegemonyState;
  standing: PoliticianStanding;
  coup: ReturnType<typeof stratoklesCoupStatus> | null;
}) {
  const { politician, power, patron, dominant } = standing;
  const isStratokles = politician.id === "stratokles";
  // Stratokles's stelae are permanent monuments, everyone else's are standing Laws —
  // the two are drawn differently because they mean different things.
  const stelae: Array<ActiveLaw | TallyMonument> = isStratokles
    ? G.tallyMonuments
    : G.activeLaws.filter((law) => getResolutionCard(law.cardId)?.politician === politician.id);

  return (
    <div className={`acol${isStratokles ? " strat" : ""}`}>
      <div className="ahead">
        <span className="apow" title={`${power} ${isStratokles ? "monuments" : "standing laws"}`}>
          {power}
        </span>
        <span className="aname">{politician.name}</span>
        <span className="aep">{politician.epithet}</span>
      </div>

      {/* The patron line only exists once there is a stack to have a patron OF — an
          empty column says "no stelae stand" once, in the stack, and not twice. */}
      {power > 0 ? (
        <div className="ameta">
          {patron ? (
            <>
              <span className="dot" style={{ background: PLAYER_COLORS[patron] }} />
              <b>{PLAYER_NAMES[patron]}</b>
              {dominant ? (
                <> · {politician.patronBuff.label}</>
              ) : (
                <> · {standing.politician.id === "stratokles" ? "feeding him" : "not yet dominant"}</>
              )}
            </>
          ) : (
            <span className="ametaNone">no patron — the stack is split</span>
          )}
        </div>
      ) : null}

      <div className="stack">
        {stelae
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stele) =>
            isStratokles ? (
              <div
                className="tally"
                key={`${stele.cardId}-${stele.order}`}
                title={`${getResolutionCard(stele.cardId)?.name ?? stele.cardId} — carried by ${PLAYER_NAMES[stele.author]}. A monument never repeals.`}
              >
                <span className="tk">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="tn">{getResolutionCard(stele.cardId)?.name ?? "Directive resolved"}</span>
              </div>
            ) : (
              <div
                className="stele"
                key={stele.cardId}
                title={`${getResolutionCard(stele.cardId)?.name ?? stele.cardId} — enacted by ${PLAYER_NAMES[stele.author]}. ${getResolutionCard(stele.cardId)?.text ?? ""}`}
              >
                <span className="sd" style={{ background: PLAYER_COLORS[stele.author] }} />
                <span className="sn">{getResolutionCard(stele.cardId)?.name ?? stele.cardId}</span>
              </div>
            )
          )}
        {stelae.length === 0 ? <div className="steleEmpty">No stelae stand.</div> : null}
      </div>

      {coup ? (
        <div
          className="coup"
          title={`Stratokles seizes the city — and his patron wins — at ${coup.threshold} monuments while he leads the agora. The only brake is voting his Directives down.`}
        >
          <span className="ck">Coup</span>
          <span className="bd">
            {Array.from({ length: coup.threshold }, (_, index) => (
              <i className={index < coup.tallies ? "f" : undefined} key={index} />
            ))}
          </span>
          <span className="cn">
            {Math.min(coup.tallies, coup.threshold)}/{coup.threshold}
          </span>
        </div>
      ) : null}
    </div>
  );
}
