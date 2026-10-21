import { getActiveEffects } from "./activeEffects";
import type { ActiveEffectDescriptor } from "./activeEffects";
import { nextAssemblyYear } from "./assembly/assembly";
import { portClaimSites } from "./status";
import type { HegemonyState, PlayerId, TradeOffer, YearCard } from "./types";
import { unrestStatus } from "./unrest";
import type { UnrestStatus } from "./unrest";
import { oneTitleShort, victoryThreats } from "./victory";
import type { VictoryThreat } from "./victory";

/**
 * The alarms row as data: everything a seat should know is happening, in the order the
 * row shows it. The UI picks each one's icon, tone and words; the sim can read the
 * same list.
 */
export type RealmAlarm =
  /** Seats holding enough titles to win when their next turn starts. */
  | { kind: "victoryThreat"; threats: VictoryThreat[] }
  /** Rivals one title short of that. */
  | { kind: "oneTitleShort"; seats: VictoryThreat[] }
  /** An open trade offer: every seat sees it, the seats it names answer it. */
  | { kind: "offer"; offer: TradeOffer }
  | { kind: "yearCard"; card: YearCard }
  /** The realm's happiness below zero. */
  | { kind: "unrest"; status: UnrestStatus }
  /** A standing effect on the realm, hunger included. */
  | { kind: "effect"; effect: ActiveEffectDescriptor }
  /** The Assembly sits as next year opens. */
  | { kind: "assemblyNextYear"; year: number }
  /** Settlements that could raise a Port and claim a free luxury. */
  | { kind: "portClaim"; sites: ReturnType<typeof portClaimSites> };

/** The year card has its own disc, and standing Laws and Ideas are the constitution
 *  (the Agora and the realm list them), not something happening to the realm now. */
const NOT_ALARMS: ActiveEffectDescriptor["kind"][] = ["yearCard", "standingLaw", "standingIdea"];

export function realmAlarms(G: HegemonyState, playerID: PlayerId): RealmAlarm[] {
  const alarms: RealmAlarm[] = [];
  const threats = victoryThreats(G);
  if (threats.length) alarms.push({ kind: "victoryThreat", threats });
  const short = oneTitleShort(G).filter((holding) => holding.seat !== playerID);
  if (short.length) alarms.push({ kind: "oneTitleShort", seats: short });
  for (const offer of G.offers) alarms.push({ kind: "offer", offer });
  if (G.activeYearCard) alarms.push({ kind: "yearCard", card: G.activeYearCard });

  const unrest = unrestStatus(G, playerID);
  if (unrest.tier !== "calm") alarms.push({ kind: "unrest", status: unrest });
  for (const effect of getActiveEffects(G, playerID))
    if (!NOT_ALARMS.includes(effect.kind)) alarms.push({ kind: "effect", effect });

  if (G.phase === "gameplay" && !G.assembly && nextAssemblyYear(G) === G.year + 1)
    alarms.push({ kind: "assemblyNextYear", year: G.year + 1 });
  const sites = G.phase === "gameplay" ? portClaimSites(G, playerID) : [];
  if (sites.length) alarms.push({ kind: "portClaim", sites });
  return alarms;
}
