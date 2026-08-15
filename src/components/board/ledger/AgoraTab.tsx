import { PLAYER_NAMES } from "../../../game/data";
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

export function AgoraTab({ G }: { G: HegemonyState }) {
  const standings = politicianStandings(G);
  const voice = victoryStandings(G).find((standing) => standing.card.metric === "voice");
  const rules = G.ruleset.assembly;
  const nextYear = Math.max(rules.firstYear, yearOf(G.season) + (G.assembly ? 1 : 0));

  return (
    <div className="agoraPage">
      {/* The Voice plaque: the one standing thing that is a victory card. */}
      <Tooltip
        content={
          <MechanicsDetails heading="Voice of the Assembly">
            <p className="mechanicsExplanation">
              Held by whoever has authored and passed the most resolutions. Repeal does not take
              them back.
            </p>
          </MechanicsDetails>
        }
        triggerClassName="voiceboxTrigger"
      >
        <div className="voicebox">
          <Icon glyph="voice" size="rail" />
          <span>
            <b className="title">Voice</b>
            <span className="caption">
              {voice?.holder ? PLAYER_NAMES[voice.holder] : "unheld"} · {G.assembliesHeld}{" "}
              assemblies held
            </span>
          </span>
          {voice?.holder ? (
            <span className="voiceGlaze verb" style={{ background: glazeOf(voice.holder) }}>
              {PLAYER_GLAZES[voice.holder].blazon}
            </span>
          ) : null}
        </div>
      </Tooltip>

      <h3 className="ladderSection label">
        Standing laws · {G.activeLaws.length}/{rules.lawCap}
      </h3>

      {G.activeLaws.length === 0 ? (
        <div className="lawslab lawslabEmpty body-em">No law stands. The stones are bare.</div>
      ) : (
        G.activeLaws
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((law) => (
            <StandingLaw
              content={G.definition.content}
              key={`${law.cardId}-${law.order}`}
              stele={law}
              variant="slab"
            />
          ))
      )}

      <h3 className="ladderSection label">The four orators</h3>

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
              </span>
              {/* Notches, not a number: how many stones bear his name, at a glance. */}
              <span className="steleNotches" aria-label={`${stelae.length} stelae`}>
                {Array.from({ length: rules.lawCap }, (_, index) => (
                  <i className={index < stelae.length ? "notch notchWon" : "notch"} key={index} />
                ))}
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
