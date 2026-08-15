import type { UnrestStatus } from "../../../game/rules";
import { formatNumber } from "../../../ui/formatters";
import { Icon } from "../../../ui/icons/Icon";

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

/** The consequence, in the fewest words that are still true. */
function consequenceOf(status: UnrestStatus, popLossThreshold: number): string {
  if (status.tier === "revolt") {
    return "The severe riot table, every turn, until it recovers";
  }

  if (status.tier === "unrest") {
    return "The riot table, every turn, until it recovers";
  }

  return `Pops start dying at ${formatNumber(popLossThreshold)} happiness`;
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
    status.deficitTurns > 0 ? `${status.deficitTurns} turns of food deficit` : null,
    status.timedModifiers > 0 ? `${status.timedModifiers} lingering effects` : null,
    status.totalDeaths > 0 ? `${status.totalDeaths} pops lost so far` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`alarm alarm-${status.tier}`} role="status">
      <div className="alarmRow">
        <Icon glyph="unhappiness" size="rail" />
        <b className="alarmNumber stat-lg stat-hero num">{formatNumber(status.happiness)}</b>
        <span className="alarmWord verb">
          {TITLES[status.tier]}
          <br />
          {consequenceOf(status, popLossThreshold)}
        </span>
      </div>
      {detail ? <p className="alarmDetail body-em">{detail}</p> : null}
    </div>
  );
}
