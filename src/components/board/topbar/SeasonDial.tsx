import type { CSSProperties } from "react";
import { SEASONS, seasonName } from "../../../game/rules";
import type { SeasonName } from "../../../game/types";
import { capitalize } from "../helpers";

/** Hand-painted, Greek vase-style season emblems (background-removed webp). */
const SEASON_ART: Record<SeasonName, string> = {
  spring: new URL("../../../../assets/season-icons/spring.webp", import.meta.url).href,
  summer: new URL("../../../../assets/season-icons/summer.webp", import.meta.url).href,
  autumn: new URL("../../../../assets/season-icons/autumn.webp", import.meta.url).href,
  winter: new URL("../../../../assets/season-icons/winter.webp", import.meta.url).href
};

/** The ring/tint hue for each season. */
const SEASON_TINT: Record<SeasonName, string> = {
  spring: "var(--olive)",
  summer: "var(--ochre)",
  autumn: "var(--clay)",
  winter: "var(--aegean)"
};

/** A round indicator showing the current season's painted emblem, framed in its hue. */
export function SeasonDial({ seasonIndex }: { seasonIndex: number }) {
  const season = seasonName(seasonIndex);

  return (
    <div
      className={`seasonDial seasonDial-${season}`}
      role="img"
      aria-label={`${capitalize(season)}, season ${SEASONS.indexOf(season) + 1} of 4`}
      style={{ "--season-tint": SEASON_TINT[season] } as CSSProperties}
    >
      <img className="seasonDialArt" src={SEASON_ART[season]} alt="" />
    </div>
  );
}

