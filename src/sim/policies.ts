import { calculateIncome } from "../game/economy/income";
import { getTile } from "../game/core/query";
import { canPlaceColonyOnTile, settlementBuildingSlots } from "../game/settlement";
import { enactForEval, politicianStandings } from "../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../game/assembly";
import type { LegalMove } from "../game/legalMoves";
import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import { playerStandings } from "../game/score";
import { victoryCardsHeld } from "../game/victory";
import type { HegemonyState, PlayerId } from "../game/types";
import type { SimRng } from "./rng";

export type PolicyId = "random" | "greedy" | "smart" | "beam" | "political" | "master";

export type Policy = {
  name: PolicyId;
  choose(G: HegemonyState, moves: LegalMove[], rng: SimRng): LegalMove;
};

/**
 * Uniform-by-type, then uniform within type. Grouping first stops the biggest
 * move families (movePops, foundColony) from swamping the draw, and gives
 * endTurn roughly 1-in-k odds per action so turns always self-terminate.
 */
export const randomPolicy: Policy = {
  name: "random",
  choose(G, moves, rng) {
    const byType = new Map<LegalMove["type"], LegalMove[]>();

    for (const move of moves) {
      const group = byType.get(move.type) ?? [];
      group.push(move);
      byType.set(move.type, group);
    }

    const types = [...byType.keys()];
    const group = byType.get(rng.pick(types));

    return rng.pick(group ?? moves);
  },
};

/** Move types whose resolution consumes the game's seeded RNG. A lookahead that cloned
 *  and applied one of these would "peek" the die/deck through the clone, so every search
 *  branches ONLY on the RNG-free complement and plays these by rule. If a future move type
 *  starts consuming G.rng, add it here (the beam asserts no branch advances the RNG). */
const STOCHASTIC_MOVE_TYPES: ReadonlySet<LegalMove["type"]> = new Set([
  "fundExpedition",
  "resolveRiot",
  "buyRiotInsurance",
]);

/**
 * The hard-coded rules for the stochastic move families (riot / venture / bank chains),
 * shared by the one-ply and beam searches so the anti-peek policy lives in one place.
 * Returns the move to play by rule, or null when none applies and the search proceeds.
 */
function resolveStochasticByRule(G: HegemonyState, moves: LegalMove[]): LegalMove | null {
  const playerID = G.currentPlayer;

  // A pending riot is a forced menu with a stochastic resolution — declare the
  // resource-priced insurances (cheap certainty), skip the concession, then roll.
  const resolveRiot = moves.find((move) => move.type === "resolveRiot");
  if (resolveRiot) {
    const insurance = moves.find(
      (move) => move.type === "buyRiotInsurance" && move.optionId !== "concession",
    );
    return insurance ?? resolveRiot;
  }

  // Ventures are stochastic too — a gold-rich bot funds one expedition a turn
  // (season-cycled so sims exercise all three tables), never peeking the roll.
  const goldVentures = moves.filter(
    (move): move is Extract<LegalMove, { type: "fundExpedition" }> =>
      move.type === "fundExpedition" && move.stake === "gold",
  );
  if (goldVentures.length > 0 && G.players[playerID].resources.gold >= 25) {
    return goldVentures[G.season % goldVentures.length];
  }

  // Bank chains (sell surplus → buy the missing colony wood) are invisible to one-ply
  // search: sell a hoard when the coffers run dry; buy wood when wood-starved, gold-rich.
  for (const material of ["stone", "wood", "food"] as const) {
    const sell = moves.find((move) => move.type === "bankSell" && move.material === material);
    if (
      sell &&
      G.players[playerID].resources[material] > 40 &&
      G.players[playerID].resources.gold < 10
    ) {
      return sell;
    }
  }

  const woodBuy = moves.find((move) => move.type === "bankBuy" && move.material === "wood");
  if (
    woodBuy &&
    G.players[playerID].resources.wood < 20 &&
    G.players[playerID].resources.gold >= 20
  ) {
    return woodBuy;
  }

  return null;
}

/**
 * One-ply lookahead shared by the greedy and smart bots: apply each candidate to a
 * clone and keep the best score delta under `score`. Ends the turn when nothing
 * improves the position. Deterministic — ties keep the first (enumeration-ordered)
 * candidate. The two bots differ ONLY in the `score` function, so a greedy-vs-smart
 * comparison isolates the evaluation, not the search.
 */
function onePlyLookahead(
  G: HegemonyState,
  moves: LegalMove[],
  score: (g: HegemonyState, p: PlayerId) => number,
): LegalMove {
  const playerID = G.currentPlayer;

  const byRule = resolveStochasticByRule(G, moves);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");
  const candidates = moves.filter(
    (move) => !STOCHASTIC_MOVE_TYPES.has(move.type) && move.type !== "endTurn",
  );

  if (candidates.length === 0 && endTurn) {
    return endTurn;
  }

  const before = score(G, playerID);
  let best: LegalMove | null = null;
  let bestDelta = -Infinity;

  for (const move of candidates) {
    const draft = structuredClone(G);

    if (!applyMove(draft, playerID, move).ok) {
      continue;
    }

    const delta = score(draft, playerID) - before;

    if (delta > bestDelta) {
      bestDelta = delta;
      best = move;
    }
  }

  // Forced situations (a pending event) have no endTurn — take the best resolution.
  if (!endTurn) {
    if (!best) {
      throw new Error("policy found no applicable move");
    }
    return best;
  }

  return best && bestDelta > 0 ? best : endTurn;
}

export const greedyPolicy: Policy = {
  name: "greedy",
  choose(G, moves) {
    return onePlyLookahead(G, moves, evaluate);
  },
};

/**
 * The slot- and promotion-aware bot (2026-07-18). Same search as greedy, but its
 * evaluation actually values Phase 2's strategic layer — so sims exercise the
 * mechanics greedy is blind to: it climbs the social ladder, builds the Villa and
 * Gymnasion, and prefers slot-rich cities. See {@link evaluateSmart}.
 */
export const smartPolicy: Policy = {
  name: "smart",
  choose(G, moves) {
    return onePlyLookahead(G, moves, evaluateSmart);
  },
};

/** How many turns of income the greedy score projects forward. The horizon is
 *  what lets one-ply search see delayed payoffs: a granary's +2 food/turn or a
 *  temple's +1 happiness/turn are invisible at the moment of purchase and only
 *  become worth their cost when multiplied out. */
const INCOME_HORIZON = 6;

/**
 * Positional score for the greedy bot, evaluated on resources projected
 * INCOME_HORIZON turns ahead.
 *
 * The old provisional-VP formula lives on here as the bot's private heuristic —
 * a smooth gradient (cities, colonies, pops, banked material) the one-ply search
 * can climb — now topped with a large victory-card term so the bot actually
 * chases the race (game/victory.ts), and a happiness term because the unrest
 * thresholds (-5/-10) delete pops nonlinearly.
 *
 * The projection runs through calculateIncome — the engine's own formula — so
 * the score sees food-shortage pressure, the stockpile happiness bonus,
 * building income, and seasonal modifiers without duplicating any of them.
 */
function evaluate(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const income = calculateIncome(G, playerID);
  // Project income forward on a COPY — the evaluator must never mutate G. onePlyLookahead
  // scores the raw G as its baseline, and that G may be the UI's immer-committed (frozen)
  // state where any write throws. The income-sensitive terms read `projected`; everything
  // else reads the player's live resources, exactly as before.
  const projected = { ...player.resources };
  for (const resource of Object.keys(income) as (keyof typeof income)[]) {
    projected[resource] += income[resource] * INCOME_HORIZON;
  }

  const standings = playerStandings(G, playerID);
  const material = projected.wood + projected.stone + projected.gold + projected.food;
  const heuristic =
    5 * standings.cities +
    3 * standings.colonies +
    standings.pops +
    Math.floor(material / 10) -
    Math.max(0, -projected.happiness);
  // Cap the happiness reward: below the cap it prices riot avoidance and the
  // Beloved card (min +10); past it, more calm is wasted coin — an uncapped term
  // had greedy bots pumping civic calm to +95 happiness.
  const projectedHappiness = Math.min(projected.happiness, 15);

  return (
    100 * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    2 * projectedHappiness +
    player.resources.influence
  );
}

// The smart bot values what greedy flattens away. Pops are weighted BY TIER (a
// citizen is worth far more than a slave — income + the Civic Elite card), so a
// promotion is score-positive and the one-ply search will climb the ladder. Materials
// are weighted by role (gold liquid, stone the scarce civic currency, food the
// consumed one) instead of greedy's flat material/10, so wood/stone boosters (the
// Villa) and stone civics register. And it prices building room + the Gymnasion's
// promotion synergy, so slot-rich cities and the ladder building get built.
const SMART_POP_WEIGHT = { citizens: 3, freemen: 2, slaves: 1.2 };
const SMART_MATERIAL_WEIGHT = { food: 0.4, wood: 0.6, stone: 0.85, gold: 1 };

function evaluateSmart(G: HegemonyState, playerID: PlayerId): number {
  const player = G.players[playerID];
  const income = calculateIncome(G, playerID);
  // Project onto a COPY — never mutate G (see evaluate). Income-sensitive terms read
  // `projected`; settlement counts and the influence term read the live state as before.
  const projected = { ...player.resources };
  for (const resource of Object.keys(income) as (keyof typeof income)[]) {
    projected[resource] += income[resource] * INCOME_HORIZON;
  }

  let cities = 0;
  let colonies = 0;
  let weightedPops = 0;
  let citySlots = 0;
  let gymSynergy = 0;

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
    if (!tile || !settlement) {
      continue;
    }

    weightedPops +=
      SMART_POP_WEIGHT.citizens * settlement.pops.citizens +
      SMART_POP_WEIGHT.freemen * settlement.pops.freemen +
      SMART_POP_WEIGHT.slaves * settlement.pops.slaves;

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
      // Latent build capacity — rewards upgrading colonies onto slot-rich tiles.
      citySlots += settlementBuildingSlots(tile, settlement, G.ruleset);
      // The Gymnasion only pays off if there are pops to promote; rewarding the
      // pairing is what makes one-ply build it (its discount is otherwise invisible).
      if (
        settlement.buildings.includes("gymnasion") &&
        settlement.pops.slaves + settlement.pops.freemen > 0
      ) {
        gymSynergy += 1;
      }
    }
  }

  const material =
    SMART_MATERIAL_WEIGHT.food * projected.food +
    SMART_MATERIAL_WEIGHT.wood * projected.wood +
    SMART_MATERIAL_WEIGHT.stone * projected.stone +
    SMART_MATERIAL_WEIGHT.gold * projected.gold;

  const heuristic =
    6 * cities +
    3 * colonies +
    weightedPops +
    material / 8 +
    0.4 * citySlots +
    3 * gymSynergy -
    Math.max(0, -projected.happiness);

  const projectedHappiness = Math.min(projected.happiness, 15);

  return (
    120 * victoryCardsHeld(G, playerID) +
    10 * heuristic +
    2 * projectedHappiness +
    2 * player.resources.influence
  );
}

/** Tunables for the within-turn beam search. Kept small so batch runtime stays sane; the
 *  top-W frontier + depth cap bound the clones per decision. */
const BEAM_WIDTH = 3;
const BEAM_DEPTH = 4;

/**
 * A cheap clone for search: deep-copies only what the RNG-free gameplay mutators touch
 * (players, board, transfers, and the rest of the small state) while SHARING the large
 * static structures — the ruleset and both event decks — by reference, and resetting the
 * log to a fresh array (mutators push to it; a shared array would be corrupted). Because
 * the beam never applies a stochastic or deck-drawing move, none of the shared structures
 * are mutated, so this is safe and roughly an order of magnitude lighter than cloning G.
 */
function cloneForSearch(G: HegemonyState): HegemonyState {
  // `log` is destructured only to omit it from `rest` (a fresh array is used below).
  const {
    ruleset,
    seasonalDrawPile,
    seasonalDiscardPile,
    playerDrawPile,
    playerDiscardPile,
    log: _log,
    ...rest
  } = G;
  return {
    ...structuredClone(rest),
    ruleset,
    seasonalDrawPile,
    seasonalDiscardPile,
    playerDrawPile,
    playerDiscardPile,
    log: [],
  };
}

/**
 * Within-turn beam search over the current player's RNG-free action sequence. Expands each
 * frontier node by every branchable move, scores the resulting state with `score`, keeps the
 * best W nodes per depth, and tracks the highest-scoring state reachable within BEAM_DEPTH
 * actions. Commits the FIRST action of the best sequence (the bot re-plans next ply), or ends
 * the turn when nothing beats the current position. Deterministic: no game RNG is read — the
 * anti-peek invariant is asserted per branch — and ties break on enumeration order via a
 * stable score sort.
 */
function beamPlan(
  G: HegemonyState,
  moves: LegalMove[],
  score: (g: HegemonyState, p: PlayerId) => number,
): LegalMove {
  const playerID = G.currentPlayer;

  // Stochastic families are played by rule (shared with one-ply), never searched.
  const byRule = resolveStochasticByRule(G, moves);
  if (byRule) {
    return byRule;
  }

  const endTurn = moves.find((move) => move.type === "endTurn");

  // A forced position (a pending event: no endTurn) is a single required choice — fall back
  // to one-ply rather than beam-plan past a resolution whose effects may be stochastic.
  if (!endTurn) {
    return onePlyLookahead(G, moves, score);
  }

  const branchable = (list: LegalMove[]) =>
    list.filter((move) => !STOCHASTIC_MOVE_TYPES.has(move.type) && move.type !== "endTurn");

  const rootMoves = branchable(moves);
  if (rootMoves.length === 0) {
    return endTurn;
  }

  const rootScore = score(G, playerID);
  const rngBefore = G.rng;

  type Node = { state: HegemonyState; firstMove: LegalMove | null; score: number };
  let frontier: Node[] = [{ state: G, firstMove: null, score: rootScore }];
  // The best terminal reachable so far; the baseline is "end the turn now" (do nothing).
  let best: { firstMove: LegalMove | null; score: number } = { firstMove: null, score: rootScore };

  for (let depth = 0; depth < BEAM_DEPTH; depth += 1) {
    const children: Node[] = [];

    for (const node of frontier) {
      const candidateMoves =
        depth === 0 ? rootMoves : branchable(enumerateLegalMoves(node.state, playerID));

      for (const move of candidateMoves) {
        const draft = cloneForSearch(node.state);
        if (!applyMove(draft, playerID, move).ok) {
          continue;
        }
        // Anti-peek invariant: an RNG-free branch must never advance the seeded stream.
        if (draft.rng !== rngBefore) {
          throw new Error(
            `beam branched on a stochastic move "${move.type}" — add it to STOCHASTIC_MOVE_TYPES`,
          );
        }

        const firstMove = node.firstMove ?? move;
        const nextScore = score(draft, playerID);
        children.push({ state: draft, firstMove, score: nextScore });
        if (nextScore > best.score) {
          best = { firstMove, score: nextScore };
        }
      }
    }

    if (children.length === 0) {
      break;
    }

    // Stable sort by score desc keeps enumeration order on ties → deterministic plans.
    children.sort((a, b) => b.score - a.score);
    frontier = children.slice(0, BEAM_WIDTH);
  }

  return best.firstMove && best.score > rootScore ? best.firstMove : endTurn;
}

/**
 * The turn-planning bot: a within-turn beam search over {@link evaluateSmart}, so it values
 * the multi-step plays one-ply misses (build-then-promote, save-then-upgrade, bank chains).
 * Same scoring as `smart`, deeper search — so a smart-vs-beam A/B isolates search depth.
 */
export const beamPolicy: Policy = {
  name: "beam",
  choose(G, moves) {
    return beamPlan(G, moves, evaluateSmart);
  },
};

// ── Phase 3-C: the influence-aware "political" bot ────────────────────────────────────
//
// Every other bot reaches the Assembly and passes: its scorer values influence only as a
// small hoard weight, and a Law's payoff sits beyond any affordable search (draw now →
// propose → rivals vote across the round → reap it over many turns). `political` closes
// that with two explicit ideas — a DIFFERENTIAL lens (my gain minus the STRONGEST rival's,
// so "does this hurt me, help me, or help a rival more?") and a political-position term —
// and plays the agora by heuristic rather than blind search. Same `evaluateSmart` spine,
// so a political-vs-smart A/B isolates the political layer. See docs/feat/influence-aware-ai.md.

/** How heavily the agora weighs against the ordinary economy — modest, the economy is the
 *  spine. Only shapes the bot's NON-assembly turns (valuing building toward Voice); the
 *  Assembly decisions themselves are made by the heuristics below. Sim-tuned. */
const POLITICS_WEIGHT = 8;

function playerIds(G: HegemonyState): PlayerId[] {
  return Object.keys(G.players) as PlayerId[];
}

/**
 * A seat's standing in the agora, on the smart-score scale, read entirely off the board:
 * progress toward the Voice victory card (patron of politicians, and leading their stacks)
 * and the Stratokles clock priced as a prize if it would crown me or a threat otherwise.
 */
function politicalStanding(G: HegemonyState, me: PlayerId): number {
  const standings = politicianStandings(G);
  const rivals = playerIds(G).filter((player) => player !== me);
  const patronsHeld = standings.filter((standing) => standing.patron === me).length;
  // Voice (the 6th victory card) is already priced at 120× in evaluateSmart the moment it
  // is HELD; this prices PROGRESS toward it. Rivals that pass (smart) never contest
  // patronage, so patronage is a cheap, near-solo path to a card — value it richly.
  let value = 4 * patronsHeld;

  const stratokles = standings.find((standing) => standing.politician.id === "stratokles");
  for (const standing of standings) {
    if (standing.politician.id === "stratokles") {
      continue; // the coup is priced separately, below
    }
    const mine = standing.authored[me] ?? 0;
    const rivalBest = Math.max(0, ...rivals.map((rival) => standing.authored[rival] ?? 0));
    value += Math.max(0, mine - rivalBest); // leading a stack is progress to that patronage
  }

  if (stratokles && stratokles.power > 0) {
    const proximity = stratokles.power / G.ruleset.assembly.coupThreshold;
    // If his coup would crown me, a rising clock is a comeback line; otherwise a threat.
    value += (stratokles.patron === me ? 6 : -4) * proximity;
  }

  return value;
}

/** The political bot's positional score: the smart economy plus its agora standing. */
function scorePolitical(G: HegemonyState, playerID: PlayerId): number {
  return evaluateSmart(G, playerID) + POLITICS_WEIGHT * politicalStanding(G, playerID);
}

type Scores = Record<PlayerId, number>;

function scoreEveryone(G: HegemonyState): Scores {
  const scores = {} as Scores;
  for (const playerID of playerIds(G)) {
    scores[playerID] = scorePolitical(G, playerID);
  }
  return scores;
}

/**
 * The differential lens: my gain over a hypothetical change minus the STRONGEST rival's
 * (guard the front-runner, not the field). > 0 wants it, < 0 opposes it, ≈ 0 neutral.
 */
function competitiveDelta(before: Scores, after: HegemonyState, me: PlayerId): number {
  const rivals = playerIds(after).filter((player) => player !== me);
  const myGain = scorePolitical(after, me) - before[me];
  const bestRivalGain = Math.max(
    ...rivals.map((rival) => scorePolitical(after, rival) - before[rival]),
  );
  return myGain - bestRivalGain;
}

/** Score "what if this ballot item carried" as a competitive delta, on a full clone —
 *  reusing the engine's own enactment so the prediction can never drift from the rules. */
function deltaIfEnacted(G: HegemonyState, before: Scores, item: BallotItem, me: PlayerId): number {
  const clone = structuredClone(G);
  enactForEval(clone, item);
  return competitiveDelta(before, clone, me);
}

// Assembly heuristic tunables — sim-tuned to the smart-score scale, where a single
// income Law shifts a beneficiary's score by ~tens (10 × the projected income delta / 8).
// Bribes (10 inf) and vetoes (5 inf) are the real influence drains, so their bars sit high:
// the bot spends only when a resolution genuinely swings the race, not on every signal.
const PROPOSE_THRESHOLD = 12; // propose iff it helps me clearly more than my strongest rival
const REPEAL_THRESHOLD = 25; // repeal (6 inf) only a standing Law that is clearly hostile
const BRIBE_MAGNITUDE = 45; // buy votes only when the outcome genuinely swings the race
const VETO_MAGNITUDE = 90; // veto only a resolution that is catastrophic for me
const DRAW_BUFFER = 8; // keep a real influence reserve above the draw cost — don't drain
const MAX_DRAWS = 1; // draw once and commit — fishing (redraw-after-discard) just burns influence

/** Play the agora by heuristic instead of blind search. `moves` is always the current
 *  seat's ({@link G.currentPlayer}) options for the live phase. */
function resolveAssemblyByHeuristic(
  G: HegemonyState,
  session: AssemblySession,
  moves: LegalMove[],
): LegalMove {
  const me = G.currentPlayer;

  if (session.phase === "closing") {
    return moves.find((move) => move.type === "assemblyClose") ?? moves[0];
  }

  if (session.phase === "voting") {
    return chooseVote(G, session, moves, me);
  }

  // Proposal (async): fish/repeal/pass while empty-handed, then propose or discard.
  const held = session.held[me];
  if (held) {
    return chooseProposeOrDiscard(G, held.card, moves, me);
  }
  return chooseDrawRepealOrPass(G, session, moves, me);
}

function chooseVote(
  G: HegemonyState,
  session: AssemblySession,
  moves: LegalMove[],
  me: PlayerId,
): LegalMove {
  const item = session.ballot[session.ballotIndex];
  const before = scoreEveryone(G);
  const delta = deltaIfEnacted(G, before, item, me);

  // A resolution that is catastrophic for me relative to rivals — kill it outright.
  const veto = moves.find((move) => move.type === "assemblyVeto");
  if (veto && delta <= -VETO_MAGNITUDE) {
    return veto;
  }

  // Buy weight when the outcome matters; the seat is asked again and eventually casts
  // (bribe leaves the move list once the per-assembly cap or the coffers run out).
  const bribe = moves.find((move) => move.type === "assemblyBribe");
  if (bribe && Math.abs(delta) >= BRIBE_MAGNITUDE) {
    return bribe;
  }

  const yea = delta > 0;
  return (
    moves.find((move) => move.type === "assemblyVote" && move.yea === yea) ??
    moves.find((move) => move.type === "assemblyVote") ??
    moves[0]
  );
}

function chooseProposeOrDiscard(
  G: HegemonyState,
  card: ResolutionCard,
  moves: LegalMove[],
  me: PlayerId,
): LegalMove {
  const before = scoreEveryone(G);

  let best: LegalMove | null = null;
  let bestDelta = -Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyPropose") {
      continue;
    }
    const item: BallotItem = move.replaces
      ? { kind: "enact", card, proposer: me, replaces: move.replaces }
      : { kind: "enact", card, proposer: me };
    const delta = deltaIfEnacted(G, before, item, me);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = move;
    }
  }

  if (best && bestDelta > PROPOSE_THRESHOLD) {
    return best;
  }
  // Not worth it (would help a rival more, or nothing to gain) — never gift the agora.
  return (
    moves.find((move) => move.type === "assemblyDiscardHeld") ??
    moves.find((move) => move.type === "assemblyPass") ??
    moves[0]
  );
}

function chooseDrawRepealOrPass(
  G: HegemonyState,
  session: AssemblySession,
  moves: LegalMove[],
  me: PlayerId,
): LegalMove {
  const before = scoreEveryone(G);
  const influence = G.players[me].resources.influence;

  // The most valuable hostile-Law repeal on offer.
  let bestRepeal: LegalMove | null = null;
  let bestRepealDelta = -Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyProposeRepeal") {
      continue;
    }
    const delta = deltaIfEnacted(
      G,
      before,
      { kind: "repeal", cardId: move.cardId, proposer: me },
      me,
    );
    if (delta > bestRepealDelta) {
      bestRepealDelta = delta;
      bestRepeal = move;
    }
  }

  // Draw target: the regular politician I'm nearest to being patron of — patronage is the
  // one thing a random, secret draw reliably advances (the card itself is a gamble).
  const standings = politicianStandings(G);
  const rivals = playerIds(G).filter((player) => player !== me);
  let bestDraw: LegalMove | null = null;
  let bestCloseness = -Infinity;
  let drawCost = Infinity;
  for (const move of moves) {
    if (move.type !== "assemblyDraw" || move.politician === "stratokles") {
      continue; // never feed the demagogue by fishing his deck
    }
    const standing = standings.find((entry) => entry.politician.id === move.politician);
    const mine = standing?.authored[me] ?? 0;
    const rivalBest = standing
      ? Math.max(0, ...rivals.map((rival) => standing.authored[rival] ?? 0))
      : 0;
    const closeness = mine - rivalBest;
    if (closeness > bestCloseness) {
      bestCloseness = closeness;
      bestDraw = move;
      drawCost = move.cost.influence ?? 0;
    }
  }

  const canDraw =
    bestDraw !== null &&
    (session.draws[me] ?? 0) < MAX_DRAWS &&
    influence >= drawCost + DRAW_BUFFER &&
    (bestCloseness >= 0 || G.activeLaws.length < 2); // take a lead, or seed an empty agora

  // A strong repeal is a concrete gain and beats a gamble; else fish if it's worth it; else pass.
  if (bestRepeal && bestRepealDelta > REPEAL_THRESHOLD) {
    return bestRepeal;
  }
  if (canDraw && bestDraw) {
    return bestDraw;
  }
  return moves.find((move) => move.type === "assemblyPass") ?? moves[0];
}

export const politicalPolicy: Policy = {
  name: "political",
  choose(G, moves) {
    if (G.assembly) {
      return resolveAssemblyByHeuristic(G, G.assembly, moves);
    }
    return onePlyLookahead(G, moves, scorePolitical);
  },
};

// ── The cumulative policy — every shipped specialist in one bot ──────────────────────
//
// The earlier policies are controlled experiments: `beam` isolates search depth,
// `political` isolates Assembly judgment, and PR #41's `settler` isolated a one-step map
// signal. `master` is the play-strength composition rather than another isolated arm:
// smart economy + political standing + frontier value, searched with the beam during
// normal play, while the dedicated political heuristic runs the Assembly.

/** Total yield on the player's next legally reachable settlement frontier. This is the
 * measured-low-weight signal from PR #41: it nudges WHICH direction to expand without
 * overpowering the income model into founding unsustainable extra colonies. */
function frontierValue(G: HegemonyState, playerID: PlayerId): number {
  let value = 0;

  for (const tile of G.board.tiles) {
    if (canPlaceColonyOnTile(G, playerID, tile).can) {
      value += tile.resource?.amount ?? 0;
    }
  }

  return value;
}

/** PR #41's measured-neutral setting. Larger values made the prototype over-expand. */
const FRONTIER_WEIGHT = 2;

function scoreMaster(G: HegemonyState, playerID: PlayerId): number {
  return scorePolitical(G, playerID) + FRONTIER_WEIGHT * frontierValue(G, playerID);
}

/**
 * The strongest cumulative sim policy currently available:
 *
 * - `smart` economic / population / building evaluation;
 * - `beam` within-turn sequencing (W=3, D=4);
 * - `political` Assembly decisions and political standing;
 * - `settler` one-step expansion-frontier signal.
 *
 * This deliberately does NOT claim capabilities that no specialist has built yet:
 * cross-turn saving, general opponent replies, multi-hop route search, or chance EV.
 */
export const masterPolicy: Policy = {
  name: "master",
  choose(G, moves) {
    if (G.assembly) {
      return resolveAssemblyByHeuristic(G, G.assembly, moves);
    }

    return beamPlan(G, moves, scoreMaster);
  },
};

export const POLICIES: Record<PolicyId, Policy> = {
  random: randomPolicy,
  greedy: greedyPolicy,
  smart: smartPolicy,
  beam: beamPolicy,
  political: politicalPolicy,
  master: masterPolicy,
};

export function resolvePolicy(id: string): Policy {
  const policy = POLICIES[id as PolicyId];

  if (!policy) {
    throw new Error(
      `unknown policy "${id}" — expected one of: ${Object.keys(POLICIES).join(", ")}`,
    );
  }

  return policy;
}
