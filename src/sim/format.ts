import { seasonName, yearOf } from "../game/core/calendar";
import { totalPops } from "../game/core/pops";
import { calculateEconomyProjection } from "../game/economy/preview";
import type { EconomyPreview } from "../game/economy/preview";
import { describeMove, enumerateLegalMoves } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import { settlementPopCapacity } from "../game/settlement";
import { unrestStatus } from "../game/unrest";
import type { HegemonyState, PlayerId, Resources } from "../game/types";

/** Fractional values (happiness, VP) render with one decimal; integers stay bare. */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDelta(value: number): string {
  const rendered = formatNumber(Math.abs(value));
  return value < 0 ? `-${rendered}` : `+${rendered}`;
}

/** "wood 20, food 2" — skips zero entries. */
export function formatPartialResources(resources: Partial<Resources>): string {
  const parts = Object.entries(resources)
    .filter(([, amount]) => (amount ?? 0) !== 0)
    .map(([resource, amount]) => `${resource} ${formatNumber(amount ?? 0)}`);

  return parts.length > 0 ? parts.join(", ") : "free";
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
    `Turn ${G.turn} — ${seasonName(G.season)} of year ${yearOf(G.season)} (season ${G.season}) · phase ${G.phase} · ` +
      `current: player ${G.currentPlayer} (${G.players[G.currentPlayer].name})`,
  ];

  if (G.activeSeasonEvent) {
    lines.push(`Seasonal event: ${G.activeSeasonEvent.card.name} — ${G.activeSeasonEvent.card.text}`);
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
      (projection.population.inTransit > 0 ? ` (+${projection.population.inTransit} in transit)` : "") +
      (projection.population.overCapacity > 0 ? ` — ${projection.population.overCapacity} OVER capacity` : ""),
  );

  return lines.join("\n");
}

function renderPlayer(G: HegemonyState, playerID: PlayerId): string {
  const player = G.players[playerID];
  const standings = playerStandings(G, playerID);
  const unrest = unrestStatus(G, playerID);
  const projection = calculateEconomyProjection(G, playerID);
  const marker = G.currentPlayer === playerID ? " ◀ current" : "";

  const lines = [
    `Player ${playerID} ${player.name}${marker}`,
    `  VP ${formatNumber(standings.victoryPoints)} · ${standings.cities} cities, ${standings.colonies} colonies · ` +
      `pops ${projection.population.pops}/${projection.population.capacity}` +
      (projection.population.inTransit > 0 ? ` (+${projection.population.inTransit} in transit)` : "") +
      ` · ${unrest.tier}${unrest.popsAtRisk > 0 ? ` (${unrest.popsAtRisk} pops at risk)` : ""}`,
    `  resources: ${Object.entries(player.resources)
      .map(([resource, amount]) => `${resource} ${formatNumber(amount)}`)
      .join(" · ")}`,
    `  income: ${formatResourceDelta(projection.income)}`,
  ];

  for (const tileId of player.settlements) {
    const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const buildings = settlement.buildings.length > 0 ? ` · buildings: ${settlement.buildings.join(", ")}` : "";
    lines.push(
      `  ${tileId} ${settlement.kind} on ${tile.terrain} (${tile.resource.type} ${tile.resource.amount}) — ` +
        `pops ${totalPops(settlement.pops)}/${settlementPopCapacity(settlement.kind, G.ruleset)} ` +
        `(c${settlement.pops.citizens} f${settlement.pops.freemen} s${settlement.pops.slaves})${buildings}`,
    );
  }

  return lines.join("\n");
}

export function renderLegal(G: HegemonyState): string {
  const moves = enumerateLegalMoves(G, G.currentPlayer);

  if (moves.length === 0) {
    return "No legal moves (not this player's turn?).";
  }

  const lines = moves.map((move, index) => `[${index}] ${describeMove(move)}`);
  lines.push(`(${moves.length} moves — apply one with: move index <N>)`);
  return lines.join("\n");
}

export function renderLog(G: HegemonyState, tail: number): string {
  return G.log
    .slice(-tail)
    .map((entry) => `[s${entry.season}] ${entry.message}`)
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
      hasResourceDelta(settlement.incomeDelta) ? `income ${formatResourceDelta(settlement.incomeDelta)}` : "",
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
