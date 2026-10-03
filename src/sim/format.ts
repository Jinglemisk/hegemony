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
import type { BatchReport } from "./telemetry";

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
        : "") +
      (projection.population.overCapacity > 0
        ? ` — ${projection.population.overCapacity} OVER capacity`
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
      ` · happiness ${formatNumber(unrest.happiness)}, ${unrest.tokens} Unrest ${unrest.tokens === 1 ? "token" : "tokens"}` +
      ` · ${unrest.tier}${unrest.riotAtRisk ? (unrest.tier === "revolt" ? " (revolt at next upkeep)" : " (riot table at next upkeep)") : ""}`,
    `  resources: ${Object.entries(player.resources)
      .map(([resource, amount]) => `${resource} ${formatNumber(amount)}`)
      .join(" · ")}`,
    `  income: ${formatResourceDelta(projection.income)}`,
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
      `over-capacity ${formatDelta(preview.populationDelta.overCapacity)}, in transit ${formatDelta(preview.populationDelta.inTransit)}`,
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

/** Terminal digest of a batch report — the full data lives in the JSON. */
export function renderBatchReport(report: BatchReport): string {
  const lines = [
    `Batch: ${report.meta.games} games × ${report.meta.turns} turns, ${report.meta.policy} policy, ${report.meta.mode} mode, ${report.meta.boardLayout} board (base seed ${report.meta.baseSeed})`,
    `Definition: ${report.meta.definition.id}`,
    `Final victory cards: mean ${formatNumber(report.finalCardsDistribution.mean)} · ` +
      `p10 ${formatNumber(report.finalCardsDistribution.p10)} · median ${formatNumber(report.finalCardsDistribution.median)} · ` +
      `p90 ${formatNumber(report.finalCardsDistribution.p90)}`,
    `Terminations: victoryRace ${report.terminations.victoryRace} · deckExhausted ${report.terminations.deckExhausted} · turnCap ${report.terminations.turnCap} (win rate is over finished games only)`,
    `Seats: ${Object.entries(report.perSeat)
      .map(
        ([seat, stats]) =>
          `P${seat} win ${(stats.winRate * 100).toFixed(0)}% · lead@cap ${(stats.capLeaderRate * 100).toFixed(0)}% (cards ${formatNumber(stats.meanFinalCards)})`,
      )
      .join(" · ")}`,
  ];

  if (report.meta.tunePatchHash) {
    lines.push(`Manual tuning patch: ${report.meta.tunePatchHash}`);
  }

  if (report.meta.tuningPresetId) {
    lines.push(
      `Tuning preset: ${report.meta.tuningPresetId} · content ${report.meta.resolvedContentHash}`,
    );
  }

  if (report.meta.seatPolicies) {
    lines.push(
      `Seat policies: ${Object.entries(report.meta.seatPolicies)
        .map(([seat, name]) => `P${seat} ${name}`)
        .join(" · ")}`,
    );
  }

  const byPolicy = Object.entries(report.winsByPolicy ?? {});
  if (byPolicy.length > 0) {
    lines.push(
      `Win by policy (finished games): ${byPolicy
        .map(
          ([name, stats]) =>
            `${name} ${(stats.winRate * 100).toFixed(0)}% (${stats.wins}/${stats.games})`,
        )
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

  if (report.hunger) {
    lines.push(
      `Food under work slots: ${Object.entries(report.hunger)
        .map(
          ([seat, stats]) =>
            `P${seat} hunger turns ${formatNumber(stats.hungerTurnsPerGame)}/game, ` +
            `pops lost ${formatNumber(stats.popsLostPerGame)}/game, ` +
            `idle slaves ${formatNumber(stats.idleSlavesMean)} (${(stats.idleSlaveShare * 100).toFixed(0)}%)`,
        )
        .join(" · ")}`,
    );
  }

  if (report.riots) {
    lines.push(
      `Riots: ${formatNumber(report.riots.perGame)}/game · the riot table opens ` +
        `${(report.riots.turnShare * 100).toFixed(1)}% of player-turns · ` +
        `revolts ${formatNumber(report.riots.revoltsPerGame)}/game`,
    );
  }

  const observedEffects = Object.entries(report.activeEffects)
    .filter(([, stats]) => stats.observations > 0)
    .map(([kind, stats]) => kind + " " + (stats.playerTurnShare * 100).toFixed(0) + "%")
    .join(" · ");
  if (observedEffects) {
    lines.push("Active effects (share of player-turns): " + observedEffects);
  }

  const buildings = Object.entries(report.buildings)
    .sort(([, a], [, b]) => b.built - a.built)
    .map(([buildingId, stats]) => `${buildingId} ${formatNumber(stats.perGame)}/game`)
    .join(" · ");

  if (buildings) {
    lines.push(`Buildings: ${buildings}`);
  }

  // The Phase 1 exit-gate line: a verb at 0/game is a dead currency talking.
  const verbs = Object.entries(report.currencyVerbs ?? {})
    .map(([verb, stats]) => `${verb} ${formatNumber(stats.perGame)}`)
    .join(" · ");

  if (verbs) {
    lines.push(`Currency verbs (per game): ${verbs}`);
  }

  if (report.upgrades) {
    lines.push(
      `Colony→city upgrades: ${formatNumber(report.upgrades.perGame)}/game (${report.upgrades.count} total)`,
    );
  }

  if (report.assembly) {
    const { assembly } = report;
    lines.push(
      `Assembly: ${formatNumber(assembly.held.perGame)} held/game · ` +
        `laws enacted ${formatNumber(assembly.lawsEnacted.perGame)}/game · ` +
        `removed ${formatNumber(assembly.lawsRemoved.perGame)}/game · ` +
        `standing at end ${formatNumber(assembly.lawsStanding)} · ` +
        `directives ${formatNumber(assembly.directivesPassed.perGame)}/game · ` +
        `authored passes ${formatNumber(assembly.authoredPassed.perGame)}/game · ` +
        `Voice claims ${formatNumber(assembly.voiceClaims.perGame)}/game · ` +
        `held at end ${(assembly.voiceHoldersAtEnd.perGame * 100).toFixed(0)}% · ` +
        `top authored share ${(assembly.authoredPassLeaderShare.mean * 100).toFixed(0)}% · ` +
        `influence sunk ${formatNumber(assembly.influenceSpent.perGame)}/game`,
    );

    for (const [id, { perGame: seat }] of Object.entries(assembly.perSeat)) {
      lines.push(
        `  Seat ${id}: Laws proposed ${formatNumber(seat.lawsProposed)}, passed ${formatNumber(seat.lawsPassed)}, standing ${formatNumber(seat.authoredLawsStanding)} · Directives ${formatNumber(seat.directivesPlayed)} · votes bought ${formatNumber(seat.votesBought)} · Voice claims ${formatNumber(seat.voiceClaims)}, held ${formatNumber(seat.voiceHeldTurns)} table-turns/game`,
      );
    }

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
  }

  if (report.forced && report.forced.actionCapHits > 0) {
    lines.push(
      `Force-ended turns: ${report.forced.actionCapHits} (${formatNumber(report.forced.perGame)}/game) · ` +
        `forced resolutions ${report.forced.forcedResolutions}`,
    );
  }

  return lines.join("\n");
}
