import { produce } from "immer";
import { effectiveRuleset } from "./assembly/laws";
import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { invalid } from "./core/results";
import type { MoveResult } from "./core/results";
import { commitTurn } from "./turn";
import type { HegemonyState, HungerLeave, HungerPop, PlayerId, Pops } from "./types";

/** The classes that eat under the standing Laws, freemen first. */
export function hungerMouths(G: HegemonyState): HungerPop[] {
  const rules = effectiveRuleset(G);
  return (["freemen", "citizens"] as const).filter(
    (pop) => (rules.popIncome[pop].flat.food ?? 0) < 0,
  );
}

type Stock = { tileId: string; pops: Pops };

function stocks(G: HegemonyState, playerID: PlayerId): Stock[] {
  return G.players[playerID].settlements.flatMap((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, playerID);
    return settlement ? [{ tileId, pops: { ...settlement.pops } }] : [];
  });
}

/** Take `count` of one class, each from the settlement holding the most of it
 *  (the earliest founded on a tie), the order riots and revolts also use. */
function takeFromFullest(from: Stock[], pop: HungerPop, count: number): HungerLeave[] {
  const leave: HungerLeave[] = [];
  for (let i = 0; i < count; i += 1) {
    const fullest = from.reduce<Stock | undefined>(
      (best, stock) => (stock.pops[pop] > (best?.pops[pop] ?? 0) ? stock : best),
      undefined,
    );
    if (!fullest) break;
    fullest.pops[pop] -= 1;
    leave.push({ tileId: fullest.tileId, pop });
  }
  return leave;
}

/**
 * The cheapest loss: freemen before citizens, each from the settlement holding the
 * most. The hunger card opens with it preselected, and any path with no chooser
 * (the bots' income projection) applies it.
 */
export function defaultHungerLeave(
  G: HegemonyState,
  playerID: PlayerId,
  unfed: number,
): HungerLeave[] {
  const from = stocks(G, playerID);
  const leave: HungerLeave[] = [];
  for (const pop of hungerMouths(G))
    leave.push(...takeFromFullest(from, pop, unfed - leave.length));
  return leave;
}

/**
 * The resolutions a bot weighs: every split of the loss between the eating classes,
 * each pop leaving the settlement that holds the most of its class. The freemen-first
 * default comes first, so it wins ties. The player's card may choose any settlement.
 */
export function hungerLeaveOptions(G: HegemonyState, playerID: PlayerId): HungerLeave[][] {
  const unfed = G.pendingHunger?.playerID === playerID ? G.pendingHunger.unfed : 0;
  const [first, second] = hungerMouths(G);
  if (!unfed || !first) return [];
  if (!second) return [defaultHungerLeave(G, playerID, unfed)];
  const options: HungerLeave[][] = [];
  for (let seconds = 0; seconds <= unfed; seconds += 1) {
    const from = stocks(G, playerID);
    const leave = [
      ...takeFromFullest(from, first, unfed - seconds),
      ...takeFromFullest(from, second, seconds),
    ];
    if (leave.length === unfed) options.push(leave);
  }
  return options;
}

export function getResolveHungerStatus(
  G: HegemonyState,
  playerID: PlayerId,
  leave: readonly HungerLeave[],
) {
  const pending = G.pendingHunger;
  const reasons: string[] = [];
  if (!pending || pending.playerID !== playerID) return { can: false, reasons: ["No hunger."] };
  if (leave.length !== pending.unfed)
    reasons.push(`Choose exactly ${pending.unfed} ${pending.unfed === 1 ? "pop" : "pops"}.`);
  const mouths = hungerMouths(G);
  const taken = new Map<string, number>();
  for (const { tileId, pop } of leave) {
    const key = `${tileId}:${pop}`;
    taken.set(key, (taken.get(key) ?? 0) + 1);
    const settlement = getOwnedSettlement(G, tileId, playerID);
    if (!mouths.includes(pop) || !settlement || settlement.pops[pop] < taken.get(key)!) {
      reasons.push("Choose freemen or citizens who eat, from your own settlements.");
      break;
    }
  }
  return { can: reasons.length === 0, reasons };
}

/** The chosen pops leave, food returns to zero, and the turn ends with its riot check. */
export function resolveHunger(
  G: HegemonyState,
  playerID: PlayerId,
  leave: readonly HungerLeave[],
): MoveResult {
  const status = getResolveHungerStatus(G, playerID, leave);
  if (!status.can) return invalid(...status.reasons);
  removeHungerLeave(G, playerID, leave);
  G.pendingHunger = null;
  addLog(
    G,
    `${getPlayerName(G, playerID)} could not feed ${leave.length} ${leave.length === 1 ? "mouth" : "mouths"}: ${describeLeave(leave)} left.`,
    playerID,
    { kind: "hunger", leave: [...leave] },
  );
  return commitTurn(G);
}

/** Score a hunger choice without the riot check and hand-off that follow it. */
export function hungerForEval(G: HegemonyState, playerID: PlayerId, leave: readonly HungerLeave[]) {
  return produce(G, (draft) => {
    removeHungerLeave(draft, playerID, leave);
    draft.pendingHunger = null;
  });
}

/** The no-chooser path: the freemen-first default leaves at once. */
export function applyHunger(G: HegemonyState, playerID: PlayerId, unfed: number): number {
  const leave = defaultHungerLeave(G, playerID, unfed);
  removeHungerLeave(G, playerID, leave);
  return leave.length;
}

function removeHungerLeave(G: HegemonyState, playerID: PlayerId, leave: readonly HungerLeave[]) {
  for (const { tileId, pop } of leave) getOwnedSettlement(G, tileId, playerID)!.pops[pop] -= 1;
  G.players[playerID].popsLostToHunger += leave.length;
  G.players[playerID].resources.food = 0;
}

function describeLeave(leave: readonly HungerLeave[]): string {
  return (["freemen", "citizens"] as const)
    .map((pop) => [pop, leave.filter((l) => l.pop === pop).length] as const)
    .filter(([, n]) => n > 0)
    .map(([pop, n]) => `${n} ${formatPopName(pop, n)}`)
    .join(", ");
}
