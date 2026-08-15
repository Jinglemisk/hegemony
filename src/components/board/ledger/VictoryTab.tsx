import { PLAYER_NAMES, PLAYER_IDS } from "../../../game/data";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId, VictoryMetric } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import type { GlyphId } from "../../../ui/icons/glyphs";
import { Icon } from "../../../ui/icons/Icon";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";

/**
 * The victory race — six laurels, and how close each seat is to holding one.
 *
 * Every card shows the LEADER, not four columns of numbers. The old tab printed
 * all four values on every card: twenty-four figures, of which the two that
 * matter are the leader's and yours. Those two are on the card; the full standing
 * is one hover away.
 *
 * The meter is `--warn`, never a glaze. A glaze on a progress bar would say the
 * leader's colour means "ahead", and colour on this board means whose, not how
 * good. Reads from the same engine helper the win check uses, so the ledger can
 * never disagree with the rules.
 */

/** What each laurel is actually about, in the icon vocabulary. */
const METRIC_GLYPHS: Record<VictoryMetric, GlyphId> = {
  cities: "city",
  pops: "crowd",
  citizens: "citizens",
  stockpile: "stockpile",
  happiness: "happiness",
  voice: "voice",
};

export function VictoryTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const standings = victoryStandings(G);
  const cardsToWin = G.ruleset.victory.cardsToWin;
  const held = standings.filter(({ holder }) => holder === playerID).length;

  return (
    <div className="victoryPage">
      {/* What the deleted scoring lecture was really carrying: how close you are.
          A count is a fact you can act on; the rule behind it lives in the Codex,
          one hover away, where it belongs. */}
      <p className="heldline">
        <b className="heldlineBig num">
          {held}
          <small>/{cardsToWin}</small>
        </b>
        <span className="label">laurels held</span>
      </p>

      {standings.map(({ card, holder, minimum, values }) => {
        const leader = holder ?? bestOf(values);
        const leadValue = values[leader];
        const progress = minimum > 0 ? Math.min(1, leadValue / minimum) : 1;

        return (
          <Tooltip
            content={
              <MechanicsDetails heading={card.name}>
                <p className="mechanicsExplanation">
                  {card.description} · minimum {minimum}.
                </p>
                <div className="detailTooltipRows">
                  {PLAYER_IDS.map((id) => (
                    <em key={id}>
                      {PLAYER_NAMES[id]} {formatNumber(values[id])}
                      {id === holder ? " — holds it" : ""}
                    </em>
                  ))}
                </div>
              </MechanicsDetails>
            }
            key={card.id}
            triggerClassName="vcardTrigger"
          >
            <article className={`vcard${holder === playerID ? " vcardHeld" : ""}`}>
              {holder === playerID ? <span className="vcardStamp label">Held</span> : null}
              <div className="vcardName">
                <Icon glyph={METRIC_GLYPHS[card.metric]} />
                <b className="title">{card.name}</b>
              </div>

              <div className="vcardRace">
                <span
                  className="vcardGlaze label"
                  style={{ background: PLAYER_GLAZES[leader].color }}
                >
                  {PLAYER_GLAZES[leader].blazon}
                </span>
                <span className="vcardLead stat num">
                  {formatNumber(leadValue)}
                  <small>/{minimum}</small>
                </span>
                <span className="vcardMeter" aria-hidden="true">
                  <i style={{ width: `${progress * 100}%` }} />
                </span>
              </div>
            </article>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Who is furthest along when nobody holds the card yet. */
function bestOf(values: Record<PlayerId, number>): PlayerId {
  return PLAYER_IDS.reduce((best, id) => (values[id] > values[best] ? id : best), PLAYER_IDS[0]);
}
