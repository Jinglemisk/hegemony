import { playerNationalIdeas } from "../game/ideas";
import { getActiveEffects } from "../game/activeEffects";
import { getTile } from "../game/rules";
import { totalPops } from "../game/core/pops";
import { calculateEconomyProjection } from "../game/economy/preview";
import type { EconomyPreview } from "../game/economy/preview";
import { describeCommand, enumerateLegalOptions } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import { settlementSlaveResource, settlementCapacity, settlementSlots } from "../game/settlement";
import { unrestStatus } from "../game/unrest";
import type { HegemonyState, PlayerId, Resources } from "../game/types";
import { presentActiveEffects } from "../ui/effects";
import type {
  BatchReport,
  BelovedLuxury,
  FoodPurchases,
  RiotYearRow,
  TradeUnit,
} from "./telemetry";

/** Fractional values (happiness, VP) render with one decimal; integers stay bare. */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDelta(value: number): string {
  const rendered = formatNumber(Math.abs(value));
  return value < 0 ? `-${rendered}` : `+${rendered}`;
}

/** "wood +2, food -1" — skips zero entries. */
export function formatResourceDelta(resources: Resources): string {
  const parts = Object.entries(resources)
    .filter(([, amount]) => amount !== 0)
    .map(([resource, amount]) => `${resource} ${formatDelta(amount)}`);

  return parts.length > 0 ? parts.join(", ") : "no change";
}

export function renderHeader(G: HegemonyState): string {
  const lines = [
    `Turn ${G.turn} — year ${G.year} · phase ${G.phase} · ` +
      `current: player ${G.currentPlayer} (${G.players[G.currentPlayer].name})`,
  ];

  if (G.activeYearCard) {
    lines.push(`Year card: ${G.activeYearCard.name} — ${G.activeYearCard.text}`);
  }

  if (G.pendingHunger) {
    lines.push(
      `PENDING: player ${G.pendingHunger.playerID} must choose ${G.pendingHunger.unfed} unfed ${G.pendingHunger.unfed === 1 ? "pop" : "pops"} to leave (see: legal)`,
    );
  }

  if (G.pendingPlayerEvent) {
    lines.push(
      `PENDING: player ${G.pendingPlayerEvent.playerID} must resolve ${G.pendingPlayerEvent.card.name} — ${G.pendingPlayerEvent.card.text}`,
    );
  }

  return lines.join("\n");
}

export function renderShow(G: HegemonyState, onlyPlayer?: PlayerId): string {
  const sections = [renderHeader(G)];

  for (const player of Object.values(G.players)) {
    if (onlyPlayer && player.id !== onlyPlayer) {
      continue;
    }
    sections.push(renderPlayer(G, player.id));
  }

  return sections.join("\n\n");
}

/** The `preview` command with no arguments: this player's economy at a glance. */
export function renderProjection(G: HegemonyState, playerID: PlayerId): string {
  const projection = calculateEconomyProjection(G, playerID);

  const lines = [
    `Economy projection — player ${playerID} (${G.players[playerID].name})`,
    `  income: ${formatResourceDelta(projection.income)}`,
    `  Ideas: ${
      playerNationalIdeas(G, playerID)
        .map((i) => `${i.name} (${i.acquired})`)
        .join(" · ") || "none"
    }`,
  ];

  const bySource = new Map<string, string[]>();
  for (const entry of projection.breakdown) {
    const parts = bySource.get(entry.source) ?? [];
    parts.push(`${entry.resource} ${formatDelta(entry.amount)} (${entry.detail})`);
    bySource.set(entry.source, parts);
  }
  for (const [source, parts] of bySource) {
    lines.push(`    ${source}: ${parts.join(", ")}`);
  }

  lines.push(
    `  after next income: ${Object.entries(projection.projectedResources)
      .map(([resource, amount]) => `${resource} ${formatNumber(amount)}`)
      .join(" · ")}`,
    `  population: ${projection.population.pops}/${projection.population.capacity}` +
      (projection.population.inTransit > 0
        ? ` (+${projection.population.inTransit} in transit)`
        : ""),
  );

  return lines.join("\n");
}

function renderPlayer(G: HegemonyState, playerID: PlayerId): string {
  const player = G.players[playerID];
  const standings = playerStandings(G, playerID);
  const unrest = unrestStatus(G, playerID);
  const projection = calculateEconomyProjection(G, playerID);
  const activeEffects = presentActiveEffects(
    getActiveEffects(G, playerID, { income: projection.income }),
    G.ruleset,
    G.definition.content,
  );
  const marker = G.currentPlayer === playerID ? " ◀ current" : "";

  const lines = [
    `Player ${playerID} ${player.name}${marker}`,
    `  victory cards ${formatNumber(standings.victoryCards)}/${G.ruleset.victory.cardsToWin} · ${standings.cities} cities, ${standings.colonies} colonies · ` +
      `pops ${projection.population.pops}/${projection.population.capacity}` +
      (projection.population.inTransit > 0
        ? ` (+${projection.population.inTransit} in transit)`
        : "") +
      ` · happiness ${formatNumber(unrest.happiness)}, ${unrest.outcome.tokens} Unrest ${unrest.outcome.tokens === 1 ? "token" : "tokens"}` +
      ` · ${unrest.tier}${unrest.outcome.tier !== "none" ? (unrest.tier === "revolt" ? " (revolt at turn end)" : " (riot table at turn end)") : ""}`,
    `  resources: ${Object.entries(player.resources)
      .map(([resource, amount]) => `${resource} ${formatNumber(amount)}`)
      .join(" · ")}`,
    `  income: ${formatResourceDelta(projection.income)}`,
    `  Ideas: ${
      playerNationalIdeas(G, playerID)
        .map((i) => `${i.name} (${i.acquired})`)
        .join(" · ") || "none"
    }`,
  ];

  if (activeEffects.length > 0) {
    lines.push(...activeEffects.map((effect) => "  effect: " + effect.accessibleText));
  }

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const buildings =
      settlement.buildings.length > 0 ? ` · buildings: ${settlement.buildings.join(", ")}` : "";
    lines.push(
      `  ${tileId} ${settlement.kind} on ${tile.terrain} (${settlementSlaveResource(tile, G) ?? "no resource"}, ${settlementSlots(tile, settlement, G)} slots) — ` +
        `pops ${totalPops(settlement.pops)}/${settlementCapacity(settlement, G)} ` +
        `(c${settlement.pops.citizens} f${settlement.pops.freemen} s${settlement.pops.slaves})${buildings}`,
    );
  }

  return lines.join("\n");
}

export function renderLegal(G: HegemonyState): string {
  const options = enumerateLegalOptions(G, G.currentPlayer);

  if (options.length === 0) {
    return "No legal commands (not an eligible actor?).";
  }

  const lines = options.map(
    (option, index) =>
      `[${index}] ${describeCommand(option.command, G.definition.content, option.cost)}`,
  );
  lines.push(`(${options.length} commands — apply one with: move index <N>)`);
  return lines.join("\n");
}

export function renderLog(G: HegemonyState, tail: number): string {
  return G.log
    .slice(-tail)
    .map((entry) => `[y${entry.year}] ${entry.message}`)
    .join("\n");
}

export function renderPreview(preview: EconomyPreview): string {
  const lines = [
    `${preview.title}`,
    `  immediate: ${formatResourceDelta(preview.immediateResourceDelta)}`,
    `  income: ${formatResourceDelta(preview.incomeDelta)}`,
    `  projected next-income resources: ${formatResourceDelta(preview.projectedResourceDelta)}`,
    `  population: pops ${formatDelta(preview.populationDelta.pops)}, capacity ${formatDelta(preview.populationDelta.capacity)}, ` +
      `in transit ${formatDelta(preview.populationDelta.inTransit)}`,
  ];

  for (const settlement of preview.settlements) {
    const changes = [
      hasResourceDelta(settlement.incomeDelta)
        ? `income ${formatResourceDelta(settlement.incomeDelta)}`
        : "",
      settlement.popsDelta !== 0 ? `pops ${formatDelta(settlement.popsDelta)}` : "",
      settlement.capacityDelta !== 0 ? `capacity ${formatDelta(settlement.capacityDelta)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (changes) {
      lines.push(`  ${settlement.tileId} ${settlement.kind}: ${changes}`);
    }
  }

  return lines.join("\n");
}

function hasResourceDelta(resources: Resources): boolean {
  return Object.values(resources).some((amount) => amount !== 0);
}

function pct(share: number, digits = 0): string {
  return (share * 100).toFixed(digits) + "%";
}

/** A per seat-game figure with its sign. */
function signed(value: number): string {
  return (value < 0 ? "" : "+") + value.toFixed(2);
}

/** Riots and revolts over the player-turns of the late years. */
function lateRiots(byYear: RiotYearRow[], from: number): string {
  const late = byYear.filter((row) => row.year >= from);
  const sum = (pick: (row: (typeof late)[number]) => number) =>
    late.reduce((total, row) => total + (pick(row) ?? 0), 0);
  const turns = sum((row) => row.playerTurns);
  const riots = sum((row) => row.riots);
  return `riots ${riots}/${turns} turns (${pct(turns ? riots / turns : 0, 1)}), revolts ${sum((row) => row.revolts)}`;
}

/** Turns begun short of food and the food bought, in each state of the stock. */
function foodLine(food: FoodPurchases): string {
  return (
    `turns begun short ${food.turnsBegunShort} · food bought to cover a shortfall ` +
    `${food.coveringShortfall.food} (${food.coveringShortfall.gold} gold, ${food.coveringShortfall.influence} influence), ` +
    `ahead ${food.buyingAhead.food} (${food.buyingAhead.gold} gold, ${food.buyingAhead.influence} influence)`
  );
}

/** Player trade: the offers and what they moved, the prices, and who exports what. */
function renderTrade(trade: BatchReport["trade"]): string[] {
  const { offers, answers, given } = trade.total;
  const lines = [
    `Trade (per game): ${formatNumber(offers.settled.perGame)} settled ` +
      `(${formatNumber(trade.total.settledInSitting.perGame)} in a sitting), ` +
      `${formatNumber(offers.withdrawn.perGame)} withdrawn, ` +
      `${formatNumber(offers.closed.perGame)} closed with the turn or the preparation · ` +
      `answers: accept ${formatNumber(answers.accept.perGame)}, counter ${formatNumber(answers.counter.perGame)}, ` +
      `decline ${formatNumber(answers.decline.perGame)} · ` +
      `a title changed holder after ${formatNumber(trade.total.titleChanges.perGame)}`,
    // Every unit one seat gives another receives, so the table's given are its received.
    `  Units given (per game): ${Object.entries(given)
      .map(([unit, count]) => `${unit} ${formatNumber(count.perGame)}`)
      .join(" · ")}`,
  ];

  const prices = Object.entries(trade.total.prices).flatMap(([material, stocks]) =>
    Object.entries(stocks ?? {}).map(
      ([stock, { trades, price }]) =>
        `${material} in ${stock} ${formatNumber(price.median)} ` +
        `(${formatNumber(price.p10)}–${formatNumber(price.p90)}, ${trades})`,
    ),
  );
  if (prices.length > 0) {
    lines.push(`  Prices, a unit in the other (median, p10–p90, trades): ${prices.join(" · ")}`);
  }

  lines.push(
    `  Who exports, units sent a game by the seat whose land makes the most / the least: ` +
      Object.entries(trade.total.exports)
        .map(
          ([material, { most, least }]) =>
            `${material} ${formatDelta(most.netSent)} / ${formatDelta(least.netSent)} (${most.games} games)`,
        )
        .join(" · "),
  );

  for (const [name, stats] of Object.entries(trade.perPolicy)) {
    const net = Object.keys(stats.exports)
      .map((material) => {
        const unit = material as TradeUnit;
        return `${material} ${signed(stats.given[unit].perGame - stats.received[unit].perGame)}`;
      })
      .join(", ");
    lines.push(
      `  ${name} (per seat-game): settled ${stats.offers.settled.perGame.toFixed(2)}, ` +
        `withdrawn ${stats.offers.withdrawn.perGame.toFixed(2)}, closed ${stats.offers.closed.perGame.toFixed(2)} · ` +
        `answers accept ${stats.answers.accept.perGame.toFixed(2)}, counter ${stats.answers.counter.perGame.toFixed(2)}, ` +
        `decline ${stats.answers.decline.perGame.toFixed(2)} · net sent ${net}`,
    );
  }
  return lines;
}

/** Terminal digest of a batch report — the full data lives in the JSON. `years` is the
 *  year deck's size, and Step 11's windows are read off it: riots are judged in the second
 *  half (from year 8 of 14), influence over the last five years (from 10). */
export function renderBatchReport(report: BatchReport, years: number): string {
  const lateFrom = Math.floor(years / 2) + 1;
  const influenceFrom = years - 4;
  const { results } = report;
  const lines = [
    `Batch: ${report.meta.games} games × ${report.meta.turns} turns, ${report.meta.policy} policy, ${report.meta.mode} mode, ${report.meta.boardLayout} board (base seed ${report.meta.baseSeed})`,
    `Definition: ${report.meta.definition.id}`,
  ];

  // Cards and titles are read over finished games: a capped game was not played out.
  if (results.total.finishedSeatGames > 0) {
    const cards = results.total.finalCards;
    lines.push(
      `Final victory cards (finished seat-games): mean ${formatNumber(cards.mean)} · ` +
        `p10 ${formatNumber(cards.p10)} · median ${formatNumber(cards.median)} · ` +
        `p90 ${formatNumber(cards.p90)}`,
    );
  }

  lines.push(
    `Terminations: victoryRace ${report.terminations.victoryRace} · deckExhausted ${report.terminations.deckExhausted} · turnCap ${report.terminations.turnCap} (win rate is over finished games only)`,
    `Seats: ${Object.entries(results.perSeat)
      .map(
        ([seat, stats]) =>
          `P${seat} win ${(stats.winRate * 100).toFixed(0)}% · lead@cap ${(stats.capLeaderRate * 100).toFixed(0)}% (cards ${formatNumber(stats.finalCards.mean)})`,
      )
      .join(" · ")}`,
  );

  if (report.meta.withoutIdeas) {
    lines.push(`Played without these National Ideas: ${report.meta.withoutIdeas.join(", ")}`);
  }

  if (report.meta.tunePatchHash) {
    lines.push(`Manual tuning patch: ${report.meta.tunePatchHash}`);
  }

  if (report.meta.tuningPresetId) {
    lines.push(
      `Tuning preset: ${report.meta.tuningPresetId} · content ${report.meta.resolvedContentHash}`,
    );
  }

  if (report.meta.seatPolicies) {
    // Rotated, a seat is every personality in turn: the P0..P3 lines mix them.
    const rotated = (report.meta.rotations ?? 1) > 1;
    lines.push(
      `${rotated ? `Base seating (rotated through ${report.meta.rotations} seatings a seed, so per-seat lines mix personalities)` : "Seat policies"}: ${Object.entries(
        report.meta.seatPolicies,
      )
        .map(([seat, name]) => `P${seat} ${name}`)
        .join(" · ")}`,
    );
  }

  lines.push(
    `Win by policy (finished games): ${Object.entries(results.perPolicy)
      .map(
        ([name, stats]) =>
          `${name} ${(stats.winRate * 100).toFixed(0)}% (${stats.wins}/${stats.finishedSeatGames})`,
      )
      .join(" · ")}`,
  );

  for (const [name, stats] of Object.entries(results.perPolicy)) {
    const by = stats.winsDecidedBy;
    lines.push(
      `${name}: ${stats.wins}/${stats.finishedSeatGames} seat wins (${(100 * stats.winRate).toFixed(1)}%); ` +
        `final cards mean ${formatNumber(stats.finalCards.mean)}; capped seats ${stats.cappedSeatGames}`,
      `  Wins by: the title race ${by.race} · titles at the deck's end ${by.titles} · ` +
        `the tiebreak ${by.happiness + by.pops + by.seat} ` +
        `(happiness ${by.happiness}, pops ${by.pops}, seat ${by.seat})`,
      `  Final titles: ${Object.entries(stats.finalTitles)
        .map(([title, count]) => `${title} ${count}`)
        .join(" · ")}`,
    );
  }

  const lastYear = report.perYear[report.perYear.length - 1];
  if (lastYear) {
    lines.push(
      `Year ${lastYear.year}: ` +
        `pops mean ${formatNumber(lastYear.pops.mean)} · food mean ${formatNumber(lastYear.food.mean)} · ` +
        `happiness mean ${formatNumber(lastYear.happiness.mean)} · ` +
        `unrest shares calm ${(lastYear.unrestTierShares.calm * 100).toFixed(0)}% / ` +
        `discontent ${(lastYear.unrestTierShares.discontent * 100).toFixed(0)}% / ` +
        `unrest ${(lastYear.unrestTierShares.unrest * 100).toFixed(0)}% / ` +
        `revolt ${(lastYear.unrestTierShares.revolt * 100).toFixed(0)}%`,
    );
  }

  lines.push(
    `Food under work slots: ${Object.entries(report.hunger.perSeat)
      .map(
        ([seat, stats]) =>
          `P${seat} hunger turns ${formatNumber(stats.hungerTurns.perGame)}/game, ` +
          `pops lost ${formatNumber(stats.popsLost.perGame)}/game, ` +
          `idle slaves ${formatNumber(stats.idleSlavesMean)} (${(stats.idleSlaveShare * 100).toFixed(0)}%)`,
      )
      .join(" · ")}`,
    `  table: ${foodLine(report.foodPurchases.total)}`,
  );
  for (const [name, stats] of Object.entries(report.hunger.perPolicy)) {
    const left = report.reach.perPolicy[name].counts;
    lines.push(
      `  ${name}: hunger turns ${stats.hungerTurns.perGame.toFixed(2)}/seat-game, ` +
        `pops lost ${stats.popsLost.perGame.toFixed(2)}/seat-game ` +
        `(freemen ${left["hunger:freemen"] ?? 0}, citizens ${left["hunger:citizens"] ?? 0})` +
        `, idle slaves ${formatNumber(stats.idleSlavesMean)} (${pct(stats.idleSlaveShare)})` +
        ` · ${foodLine(report.foodPurchases.perPolicy[name])}`,
    );
  }

  const riots = report.riots.total;
  lines.push(
    `Riots: ${formatNumber(riots.riots.perGame)}/game · the riot table opens ` +
      `${(riots.turnShare * 100).toFixed(1)}% of player-turns · ` +
      `revolts ${formatNumber(riots.revolts.perGame)}/game` +
      ` · from year ${lateFrom}: ${lateRiots(riots.byYear, lateFrom)}`,
  );
  for (const [name, stats] of Object.entries(report.riots.perPolicy)) {
    lines.push(
      `  ${name}: riots ${stats.riots.perGame.toFixed(2)}/seat-game, ` +
        `revolts ${stats.revolts.perGame.toFixed(2)}/seat-game · ` +
        `from year ${lateFrom}: ${lateRiots(stats.byYear, lateFrom)}`,
    );
  }

  const beloved = (stats: BelovedLuxury) =>
    `${stats.turnsHeld} turns held, the holder the sole luxury leader in ` +
    `${pct(stats.soleLuxuryLeaderShare)}, leader or tied in ${pct(stats.luxuryLeaderOrTiedShare)}`;
  lines.push(`Beloved against the luxury leader: ${beloved(report.beloved.total)}`);
  for (const [name, stats] of Object.entries(report.beloved.perPolicy)) {
    if (stats.turnsHeld > 0) lines.push(`  held by ${name}: ${beloved(stats)}`);
  }

  const influenceYears = report.perYear.filter((row) => row.year >= influenceFrom);
  if (influenceYears.length > 0) {
    const medians = (pick: (row: (typeof influenceYears)[number]) => number | undefined) =>
      influenceYears.map((row) => `y${row.year} ${formatNumber(pick(row) ?? 0)}`).join(" · ");
    lines.push(
      `Influence stock, median at the year's last turn: ${medians((row) => row.influence.total.median)}`,
    );
    for (const name of Object.keys(influenceYears[0].influence.perPolicy)) {
      lines.push(`  ${name}: ${medians((row) => row.influence.perPolicy[name]?.median)}`);
    }
  }

  lines.push(
    `Influence spent (per game): ${Object.entries(report.influenceSpent.total)
      .map(([sink, stats]) => `${sink} ${formatNumber(stats.perGame)}`)
      .join(" · ")}`,
  );
  for (const [name, sinks] of Object.entries(report.influenceSpent.perPolicy)) {
    lines.push(
      `  ${name} (per seat-game): ${Object.entries(sinks)
        .map(([sink, stats]) => `${sink} ${formatNumber(stats.perGame)}`)
        .join(" · ")}`,
    );
  }

  const draws = report.drawSwingSummary.total;
  lines.push(
    `Draw swings: ${draws.draws} draws · ${draws.resourceCards} moved a resource, ` +
      `against the income collected that turn median ${draws.collectedRatio.median.toFixed(2)}, ` +
      `p90 ${draws.collectedRatio.p90.toFixed(2)}, max ${draws.collectedRatio.max.toFixed(2)} · ` +
      `${draws.popCards} moved ${draws.popsMoved} pops · ` +
      `${draws.tokenCards} moved ${draws.tokensMoved} Unrest tokens · ` +
      `${draws.unchanged} changed nothing · ${draws.discarded} discarded for no room`,
  );

  // The `hunger` effect is the food warning (food income or stock below zero), not a
  // hunger turn, and the share is over every seat in every snapshot.
  const observedEffects = Object.entries(report.activeEffects)
    .filter(([, stats]) => stats.observations > 0)
    .map(
      ([kind, stats]) =>
        (kind === "hunger" ? "food warning" : kind) +
        " " +
        (stats.playerTurnShare * 100).toFixed(0) +
        "%",
    )
    .join(" · ");
  if (observedEffects) {
    lines.push("Active effects (share of seat snapshots): " + observedEffects);
  }

  lines.push(
    "National Ideas (setup / bought / holder win rate, then by the holder's personality):",
  );
  for (const [id, { total, perPolicy }] of Object.entries(report.nationalIdeas))
    lines.push(
      `  ${id}: ${total.setupPicks} / ${total.purchases} / ${(total.winRate * 100).toFixed(1)}% (${total.wins}/${total.holders})` +
        Object.entries(perPolicy)
          .filter(([, held]) => held.holders > 0)
          .map(([name, held]) => ` · ${name} ${held.wins}/${held.holders}`)
          .join(""),
    );

  // The reach audit: an action or content ID no seat uses is a bot bug, a weak
  // option or a rule hole until a fixture says which.
  const games = report.perGame.length || 1;
  const policies = Object.keys(report.reach.perPolicy);
  const low = Object.entries(report.reach.total.counts).filter(([, n]) => n / games < 0.2);
  lines.push(`Low reach (under 0.2/game; ${policies.join(" / ")}): ${low.length} items`);
  for (const [id, n] of low)
    lines.push(
      `  ${id}: ${n} total (` +
        policies.map((p) => report.reach.perPolicy[p].counts[id] ?? 0).join(" / ") +
        ")",
    );

  const buildings = Object.entries(report.buildings)
    .sort(([, a], [, b]) => b.built - a.built)
    .map(([buildingId, stats]) => `${buildingId} ${formatNumber(stats.perGame)}/game`)
    .join(" · ");

  if (buildings) {
    lines.push(`Buildings: ${buildings}`);
  }

  // The Phase 1 exit-gate line: a verb at 0/game is a dead currency talking.
  const verbs = Object.entries(report.currencyVerbs)
    .map(([verb, stats]) => `${verb} ${formatNumber(stats.perGame)}`)
    .join(" · ");

  if (verbs) {
    lines.push(`Currency verbs (per game): ${verbs}`);
  }

  lines.push(
    `Colony→city upgrades: ${formatNumber(report.upgrades.perGame)}/game (${report.upgrades.count} total)`,
  );

  // Gifts and swaps between seats exist only where trade is on and someone offered.
  if (report.movesByType.tradeOffer.count > 0) {
    lines.push(...renderTrade(report.trade));
  }

  const { assembly } = report;
  const table = assembly.seats.total;
  lines.push(
    `Assembly: ${formatNumber(assembly.held.perGame)} held/game · ` +
      `laws enacted ${formatNumber(table.lawsPassed.perGame)}/game · ` +
      `removed ${formatNumber(assembly.lawsRemoved.perGame)}/game · ` +
      `standing at end ${formatNumber(table.authoredLawsStanding.perGame)} · ` +
      `directives ${formatNumber(table.directivesPassed.perGame)}/game · ` +
      `authored passes ${formatNumber(table.authoredPasses.perGame)}/game · ` +
      `Voice claims ${formatNumber(table.voiceClaims.perGame)}/game · ` +
      `held at end ${(assembly.voiceHoldersAtEnd.perGame * 100).toFixed(0)}% · ` +
      `top authored share ${(assembly.authoredPassLeaderShare.mean * 100).toFixed(0)}% · ` +
      `influence sunk ${formatNumber(assembly.influenceSpent.perGame)}/game`,
  );

  for (const [id, seat] of Object.entries(assembly.seats.perSeat)) {
    lines.push(
      `  Seat ${id}: Laws proposed ${formatNumber(seat.lawsProposed.perGame)}, passed ${formatNumber(seat.lawsPassed.perGame)}, standing ${formatNumber(seat.authoredLawsStanding.perGame)} · Directives ${formatNumber(seat.directivesPassed.perGame)} · votes bought ${formatNumber(seat.votesBought.perGame)} · Voice claims ${formatNumber(seat.voiceClaims.perGame)}, held ${formatNumber(seat.voiceHeldTurns.perGame)} table-turns/game`,
    );
  }

  for (const [name, seat] of Object.entries(assembly.seats.perPolicy)) {
    lines.push(
      `  ${name} (per seat-game): Laws proposed ${seat.lawsProposed.perGame.toFixed(2)}, passed ${seat.lawsPassed.perGame.toFixed(2)}, standing ${seat.authoredLawsStanding.perGame.toFixed(2)} · Directives ${seat.directivesPassed.perGame.toFixed(2)} · repeals filed ${seat.repealsProposed.perGame.toFixed(2)}, passed ${seat.repealsPassed.perGame.toFixed(2)} · votes bought ${seat.votesBought.perGame.toFixed(2)} · Voice claims ${seat.voiceClaims.perGame.toFixed(2)}, held ${seat.voiceHeldTurns.perGame.toFixed(2)} table-turns · Directives aimed at it ${seat.directivesAimedAt.count}`,
    );
  }

  lines.push(
    `Repeals: ${table.repealsProposed.count} filed · ${table.repealsPassed.count} passed · ${table.repealsFailed.count} failed`,
  );

  const assemblyVerbs = Object.entries(assembly.verbs)
    .filter(([, value]) => value.count > 0)
    .map(
      ([verb, value]) =>
        `${verb.replace("assembly", "").toLowerCase()} ${formatNumber(value.perGame)}`,
    )
    .join(" · ");

  if (assemblyVerbs) {
    lines.push(`Assembly verbs (per game): ${assemblyVerbs}`);
  }

  if (report.forced.actionCapHits > 0) {
    lines.push(
      `Force-ended turns: ${report.forced.actionCapHits} (${formatNumber(report.forced.perGame)}/game) · ` +
        `forced resolutions ${report.forced.forcedResolutions}`,
    );
  }

  return lines.join("\n");
}
