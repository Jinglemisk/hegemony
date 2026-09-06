import type { UnrestStatus } from "../../../game/rules";
import { formatNumber, formatSignedNumber } from "../../../ui/formatters";
import { Icon } from "../../../ui/icons/Icon";
import { UNREST_TIER_PLACEHOLDERS } from "../../../ui/icons/placeholders";

/**
 * The alarm — the one oxblood mass in the whole ledger.
 *
 * Unrest was a beige tinted strip with a sentence in it, which is to say it
 * looked exactly like the four notes around it and got read at the same speed:
 * never. This is a filled block, and it leads with **the number that is wrong**
 * at 32px, then names the consequence in caps.
 *
 * It is the only place the ledger raises its voice, which is what makes it work.
 * Two alarm banners would be one alarm banner.
 */

const TITLES: Record<Exclude<UnrestStatus["tier"], "calm">, string> = {
  discontent: "Discontent",
  unrest: "Unrest",
  revolt: "Revolt",
};

/** The consequence, in the fewest words that are still true — and it is a
 *  sentence with a verb in it. "The riot table, every turn, until it recovers"
 *  named a thing and left the player to guess what happens to it. */
function consequenceOf(status: UnrestStatus, popLossThreshold: number): string {
  if (status.tier === "revolt") {
    return "Rolls the severe riot table every turn until happiness recovers";
  }

  if (status.tier === "unrest") {
    return "Rolls the riot table every turn until happiness recovers";
  }

  return `Pops start dying at ${formatNumber(popLossThreshold)} happiness`;
}

/** The one line you read when things are going wrong is the last place to print
 *  "1 turns". Counts agree with their noun. */
function count(amount: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(amount)} ${amount === 1 ? singular : plural}`;
}

export function UnrestAlarm({
  status,
  popLossThreshold,
}: {
  status: UnrestStatus;
  popLossThreshold: number;
}) {
  if (status.tier === "calm") {
    return null;
  }

  const detail = [
    // The three-number rule: when a luxury offset is holding the line, say what is
    // stored and what the goods add — the big number above is the effective one.
    status.luxuryBonus !== 0
      ? `${formatNumber(status.storedHappiness)} stored ${formatSignedNumber(status.luxuryBonus)} from luxuries`
      : null,
    status.deficitTurns > 0 ? `${count(status.deficitTurns, "turn")} of food deficit` : null,
    status.timedModifiers > 0 ? count(status.timedModifiers, "lingering effect") : null,
    status.totalDeaths > 0 ? `${count(status.totalDeaths, "pop")} lost so far` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Three bands, not one block. The alarm's NAME belongs beside the number it
  // names — one word, so it fits the column the mask and the 34px figure leave.
  // Its consequence is a sentence and gets the full width underneath; setting it
  // in the same all-caps run as the name made a five-line slab in which neither
  // the name nor the consequence could be found.
  return (
    <div className={`alarm alarm-${status.tier}`} role="status">
      <div className="alarmRow">
        <Icon glyph="unhappiness" size="rail" src={UNREST_TIER_PLACEHOLDERS[status.tier]} />
        <b className="alarmNumber stat-lg stat-hero num">{formatNumber(status.happiness)}</b>
        <span className="alarmWord verb">{TITLES[status.tier]}</span>
      </div>
      <p className="alarmDetail body">{consequenceOf(status, popLossThreshold)}</p>
      {detail ? <p className="alarmDetail caption">{detail}</p> : null}
    </div>
  );
}
