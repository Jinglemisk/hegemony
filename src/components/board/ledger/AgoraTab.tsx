import { PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/core/calendar";
import { getResolutionCard, politicianStandings } from "../../../game/assembly";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState } from "../../../game/types";
import { POLITICIAN_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { StandingLaw } from "../assembly/StandingLaw";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";

/**
 * The Agora — what the Assembly left standing, readable at any time.
 *
 * The Assembly panel only exists while the house sits; its consequences last all
 * game. Between assemblies a player needs to know which Laws are biting and who
 * leads each orator's stack, and this page is that record — read from exactly the
 * same board-derived standings the panel uses, so the two can never disagree.
 *
 * A standing Law is drawn as an **aegean slab**, and it is the same component
 * the Assembly's colonnade uses. One law, three lives: a card at the bema, a
 * stele in the colonnade, a slab here.
 */

/** The empty stelae are counted in words, the way the floor announces them; past
 *  the words the numeral does the job. Only the law cap's range ever lands here. */
const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

function spell(count: number): string {
  return SPELLED[count] ?? String(count);
}

/** Stones bear names, but only Laws take a stele: Stratokles raises monuments. */
function stoneWord(count: number, monuments: boolean): string {
  if (monuments) {
    return count === 1 ? "monument" : "monuments";
  }
  return count === 1 ? "stele" : "stelae";
}

export function AgoraTab({ G }: { G: HegemonyState }) {
  const standings = politicianStandings(G);
  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");
  const voicePassed = voice ? Math.max(...PLAYER_IDS.map((id) => voice.values[id])) : 0;
  const rules = G.ruleset.assembly;
  const nextYear = Math.max(rules.firstYear, yearOf(G.season) + (G.assembly ? 1 : 0));

  return (
    <div className="agoraPage">
      {/* The Voice plaque: the one standing thing that is a victory card. */}
      <Tooltip
        content={
          <MechanicsDetails heading={voice?.card.name ?? "Voice"}>
            <p className="mechanicsExplanation">
              Claimed by the first player to author and pass {voice?.minimum} resolutions, and taken
              only by a rival who strictly exceeds the holder. Repeal does not take them back.
            </p>
            <p className="mechanicsExplanation">
              The house has sat {spell(G.assembliesHeld)}{" "}
              {G.assembliesHeld === 1 ? "time" : "times"}.
            </p>
          </MechanicsDetails>
        }
        triggerClassName="voiceboxTrigger"
      >
        <div className="voicebox">
          <Icon glyph="voice" size="rail" />
          <span>
            <b className="title">Voice</b>
            {/* The same fact the Victory tab's Voice card prints, in the same words
                and the same figures — the two pages read the same standing, so a
                reader flipping between them must not find two answers. */}
            <span className="caption">
              {voice?.holder ? PLAYER_NAMES[voice.holder] : "unheld"} · {voicePassed}/
              {voice?.minimum} passed
            </span>
          </span>
          {voice?.holder ? (
            <span className="voiceGlaze verb" style={{ background: glazeOf(voice.holder) }}>
              {PLAYER_GLAZES[voice.holder].blazon}
            </span>
          ) : null}
        </div>
      </Tooltip>

      <h3 className="pageSection label">
        Standing laws · {G.activeLaws.length} of {rules.lawCap}
      </h3>

      {G.activeLaws
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((law) => (
          <StandingLaw
            content={G.definition.content}
            key={`${law.cardId}-${law.order}`}
            stele={law}
          />
        ))}

      {/* The room left on the floor is a slab of its own, dashed, standing beside
          the laws that already stand — how many more the house may pass is a fact
          you want at four laws as much as at none. */}
      {G.activeLaws.length < rules.lawCap ? (
        <div className="lawslab lawslabEmpty body-em">
          {spell(rules.lawCap - G.activeLaws.length)}{" "}
          {rules.lawCap - G.activeLaws.length === 1 ? "stele stands" : "stelae stand"} empty
        </div>
      ) : null}

      {/* Counted, not quoted: the roster is authored data, and a fifth politician
          would otherwise leave this heading insisting there are four. */}
      <h3 className="pageSection label">The {spell(standings.length)} orators</h3>

      {standings.map((standing) => {
        const isStratokles = standing.politician.id === "stratokles";
        const stelae = isStratokles
          ? G.tallyMonuments
          : G.activeLaws.filter(
              (law) =>
                getResolutionCard(G.definition.content, law.cardId)?.politician ===
                standing.politician.id,
            );

        return (
          <Tooltip
            content={
              <MechanicsDetails heading={standing.politician.name}>
                <p className="mechanicsExplanation">{standing.politician.creed}</p>
                <p className="mechanicsExplanation">
                  {standing.patron
                    ? `${PLAYER_NAMES[standing.patron]} is descriptive patron of this stack.`
                    : standing.power === 0
                      ? "No stele bears his name."
                      : "No patron — the stack is split."}
                </p>
              </MechanicsDetails>
            }
            key={standing.politician.id}
            triggerClassName="polTrigger"
          >
            <section className="pol">
              <span
                className="polMedallion"
                style={{ background: standing.patron ? glazeOf(standing.patron) : "var(--stone)" }}
              >
                <Icon glyph={POLITICIAN_GLYPHS[standing.politician.id]} size="rail" />
              </span>
              <span className="polWho">
                <b className="title">{standing.politician.name}</b>
                <span className="polEpithet label">{standing.politician.epithet}</span>
                {/* Notches for the glance, a count for the fact. They sit under
                    the epithet rather than at the row's end because a name like
                    KLEISTOPHENES and six notches want 250px between them and the
                    tablet gives 192 — hung on the right they ran 71px out through
                    the frame.

                    The track is the law cap, because that is how many stelae the
                    house may keep standing. Stratokles's monuments take no slot
                    and have no cap, so his track grows past six rather than
                    filling up and reading as maxed at the seventh. */}
                <span className="steleNotches">
                  {Array.from({ length: Math.max(rules.lawCap, stelae.length) }, (_, index) => (
                    <i className={index < stelae.length ? "notch notchWon" : "notch"} key={index} />
                  ))}
                  <em className="steleCount label">
                    {stelae.length} {stoneWord(stelae.length, isStratokles)}
                  </em>
                </span>
              </span>
            </section>
          </Tooltip>
        );
      })}

      <div className="anchorRow">
        <span className="anchorKey label">Next assembly</span>
        <span className="anchorValue title">
          {rules.firstYear === 0
            ? "never"
            : G.assembly
              ? "sitting now"
              : `spring, Year ${nextYear + (yearOf(G.season) >= rules.firstYear ? 1 : 0)}`}
        </span>
      </div>
    </div>
  );
}
