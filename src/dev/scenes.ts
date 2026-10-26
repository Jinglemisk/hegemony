import { produce } from "immer";
import { mulberry32 } from "../game/core/rng";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import type { HegemonyState, PlayerId } from "../game/types";
import { PLAYER_IDS } from "../game/data";
import { nextPlayer } from "../game/turn";
import { happinessLevel } from "../game/happiness";
import { ideaDraftOrder } from "../game/ideas";
import { calculateIncome } from "../game/economy/income";
import { lastYear } from "../game/year";
import { getOwnedSettlement, isCapital } from "../game/core/query";
import { totalPops } from "../game/core/pops";
import { settlementCapacity } from "../game/settlement";
import { choosePlacement, resolvePolicy } from "../sim/policies";
import { playTurn } from "../sim/runner";
import { createSimRng, deriveBotSeed } from "../sim/rng";

/**
 * The DEV scenes: `?dev=<key>` shortcuts to Step 13's moments and the Assembly for the gate
 * script and the browser checks. The controller reads them only under
 * `import.meta.env.DEV`, so a production build carries none of this module.
 *
 * `?dev=draft` (the last seat choosing in the Idea draft), `?dev=draft-done` (the draft read
 * back after its last pick), `?dev=hunger` (the second seat's hunger card at End turn),
 * `?dev=hunger-short` (its turn, two short), `?dev=toasts` (a rival's hunger and purchase,
 * toasted to the third seat) and `?dev=ideas` (the third seat's purchase list after that
 * rival bought). Part B's: `?dev=year` (Year II's card, Plague, before the Assembly),
 * `?dev=year-back` (its back, held), `?dev=year-term` (Year III's card, Drought),
 * `?dev=riot-confirm` and `?dev=revolt-confirm` (End turn's confirm at each line),
 * `?dev=riot` (the riot sheet), `?dev=riot-result`, `?dev=revolt` (the revolt card),
 * `?dev=rival-unrest` (a rival's riot and another's revolt, toasted), `?dev=threat` (a rival
 * holding three titles, with the title toasts), `?dev=race` and `?dev=age-end` (the two
 * tablets), `?dev=turn-notice` (the turn notice), `?dev=alarms` (a rival one title short,
 * and the seat with gold and stone for a Port), `?dev=assembly-ballot`, `-vote` and
 * `-rises` (the fourth sitting's ballot), `?dev=trade` (the seat holding wood to offer,
 * each rival holding stone) and `?dev=assembly-trade` (the first sitting's preparation,
 * every seat sealed and none Ready). For the board: `?dev=mid-game` and `?dev=late-game`
 * (the sim's smart bots play every seat to the start of Year 6 or Year 12).
 */

/** What a scene asks of the board's first render, beside its state. */
export type DevShell = {
  draftSummary?: boolean;
  ideasOpen?: boolean;
  toastReplayFrom?: number;
  /** Show the current year's card as if it had just turned; hold its back. */
  yearReveal?: boolean;
  yearBack?: boolean;
  endTurnConfirm?: boolean;
  /** Open the hunger card as if End turn had just been held. */
  hungerAsk?: boolean;
  riotResult?: boolean;
  turnNotice?: boolean;
  /** Read the seat's own moments (the revolt card) from this log index. */
  momentsFrom?: number;
  /** Toast title changes since this state, with the threat panel open. */
  titlesFrom?: HegemonyState;
  viewer?: PlayerId | null;
};

export type DevScene = { G: HegemonyState; shell?: DevShell };

/** Each plays real commands from a quick start; `?dev=hunger` and `?dev=toasts` also empty
 *  one seat's granary. */
export const DEV_SCENES: Record<string, (G: HegemonyState) => DevScene> = {
  draft: (G) => {
    // Every seat but the last takes its Idea by the bots' scorer.
    const rng = createSimRng(deriveBotSeed(G.seed));
    while (G.phase === "setupIdeas" && G.currentPlayer !== ideaDraftOrder(G).at(-1))
      G = apply(G, choosePlacement(G, enumerateLegalCommands(G, G.currentPlayer), rng));
    return { G };
  },
  "draft-done": (G) => ({ G, shell: { draftSummary: true } }),
  hunger: (G) => ({ G: clearFate(starveNextSeat(G)), shell: { hungerAsk: true } }),
  "hunger-short": (G) => ({ G: clearFate(starveNextSeat(G)) }),
  toasts: (G) => {
    const start = starveNextSeat(G);
    return { G: rivalHungerAndPurchase(start), shell: { toastReplayFrom: start.log.length } };
  },
  ideas: (G) => {
    const seat = rivalHungerAndPurchase(starveNextSeat(G));
    const scene = produce(seat, (draft) => {
      draft.players[draft.currentPlayer].resources.influence = 9;
    });
    return { G: scene, shell: { ideasOpen: true } };
  },
  year: (G) => ({ G: toNextYear(G, "year-plague"), shell: { yearReveal: true } }),
  "year-back": (G) => ({
    G: toNextYear(G, "year-plague"),
    shell: { yearReveal: true, yearBack: true },
  }),
  "year-term": (G) => ({
    G: toNextYear(playOutAssembly(toNextYear(G, "year-plague")), "year-drought"),
    shell: { yearReveal: true },
  }),
  "riot-confirm": (G) => ({
    G: atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold),
    shell: { endTurnConfirm: true },
  }),
  "revolt-confirm": (G) => ({
    G: atLevel(clearFate(G), G.ruleset.economy.unrest.revoltThreshold),
    shell: { endTurnConfirm: true },
  }),
  riot: (G) => ({
    G: apply(atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold), END_TURN),
  }),
  "riot-result": (G) => {
    const seat = G.currentPlayer;
    const rioting = apply(atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold), END_TURN);
    return {
      G: apply(rioting, { type: "resolveRiot" }),
      shell: { riotResult: true, viewer: seat },
    };
  },
  revolt: (G) => {
    const start = atLevel(clearFate(G), G.ruleset.economy.unrest.revoltThreshold);
    return {
      G: apply(start, END_TURN),
      shell: { viewer: start.currentPlayer, momentsFrom: start.log.length },
    };
  },
  "rival-unrest": (G) => {
    const { riotThreshold, revoltThreshold } = G.ruleset.economy.unrest;
    const riot = apply(atLevel(clearFate(G), riotThreshold), END_TURN);
    const next = apply(riot, { type: "resolveRiot" });
    return {
      G: clearFate(apply(atLevel(clearFate(next), revoltThreshold), END_TURN)),
      shell: { toastReplayFrom: riot.log.length },
    };
  },
  threat: (G) => ({
    G: threaten(clearFate(G), nextPlayer(G.currentPlayer)),
    shell: { titlesFrom: G },
  }),
  alarms: (G) => {
    const seat = G.currentPlayer;
    const rival = nextPlayer(seat);
    const scene = produce(threaten(clearFate(G), rival), (draft) => {
      draft.players[rival].resources.gold = 0;
      Object.assign(draft.players[seat].resources, { gold: 9, stone: 9 });
    });
    return { G: scene };
  },
  race: (G) => ({
    G: endCurrentTurn(threaten(G, nextPlayer(G.currentPlayer))),
    shell: { viewer: G.currentPlayer },
  }),
  "age-end": (G) => {
    let last = produce(G, (draft) => {
      draft.year = lastYear(draft);
    });
    for (let guard = 0; last.phase === "gameplay" && guard < 8; guard++)
      last = endCurrentTurn(last);
    return { G: last, shell: { viewer: last.winner } };
  },
  "turn-notice": (G) => ({ G, shell: { turnNotice: true } }),
  // The fourth sitting, its proposals sealed: the ballot read, one item voted but for
  // its last seat, and the house risen.
  "assembly-ballot": (G) => ({ G: sealProposals(G) }),
  "assembly-vote": (G) => ({ G: castVotes(sealProposals(G), 1) }),
  "assembly-rises": (G) => ({ G: castVotes(sealProposals(G), 0) }),
  "assembly-trade": (G) => {
    let sitting = fastForwardToAssembly(G);
    for (
      let guard = 0;
      guard < 8 && !sitting.assembly?.proposalDone[sitting.currentPlayer];
      guard++
    )
      sitting = apply(sitting, { type: "assemblyPass" });
    return { G: sitting };
  },
  trade: (G) => ({
    G: produce(clearFate(G), (draft) => {
      for (const seat of PLAYER_IDS) {
        const mine = seat === draft.currentPlayer;
        Object.assign(draft.players[seat].resources, { wood: mine ? 8 : 0, stone: mine ? 0 : 4 });
      }
    }),
  }),
  "mid-game": (G) => ({ G: botsToYear(G, 6) }),
  "late-game": (G) => ({ G: botsToYear(G, 12) }),
};

/** A board as a real game leaves it: the sim's smart bots play every seat until the
 *  year opens (past any sitting), in a few seconds. */
function botsToYear(initial: HegemonyState, year: number): HegemonyState {
  const rng = createSimRng(deriveBotSeed(initial.seed));
  const smart = resolvePolicy("smart");
  let G = initial;
  for (let turn = 0; turn < 400; turn++) {
    if (G.phase !== "gameplay" || (G.year >= year && !G.assembly)) break;
    G = playTurn(G, smart, rng);
  }
  return G;
}

/** Reach the fourth sitting and seal a Directive, a repeal, a Law and a silence, so the
 *  ballot carries every kind of item. */
function sealProposals(initial: HegemonyState): HegemonyState {
  let G = fastForwardToAssembly(initial);
  for (let sitting = 1; sitting < 4; sitting++) G = fastForwardToAssembly(playOutAssembly(G));
  G = produce(G, (draft) => {
    for (const player of Object.values(draft.players))
      player.resources.influence = Math.max(player.resources.influence, 6);
  });
  const plan = ["stratokles", "repeal", "perdiccas", "pass"];
  for (let guard = 0; G.assembly?.phase === "proposal" && guard < 12; guard++) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);
    const pick = (type: GameCommand["type"]) => commands.find((c) => c.type === type);
    const step = plan[G.assembly.voteOrder.indexOf(G.currentPlayer)];
    const draw = commands.find((c) => c.type === "assemblyDraw" && c.politician === step);
    const command =
      pick("assemblyPropose") ??
      draw ??
      (step === "repeal" ? pick("assemblyProposeRepeal") : undefined) ??
      pick("assemblyPass") ??
      pick("assemblyReady");
    if (!command) break;
    G = apply(G, command);
  }
  return G;
}

/** Cast votes, yea and nay in turn, until `left` votes remain in the sitting's first
 *  item, or until the house rises when `left` is 0. */
function castVotes(initial: HegemonyState, left: number): HegemonyState {
  let G = initial;
  for (let guard = 0; G.assembly?.phase === "voting" && guard < 40; guard++) {
    const { voteIndex, voteOrder } = G.assembly;
    if (left && voteOrder.length - voteIndex <= left) break;
    G = apply(G, { type: "assemblyVote", yea: voteIndex % 2 === 0 });
  }
  return G;
}

const END_TURN: GameCommand = { type: "endTurn" };

/** Put the named card on top of the year deck and play the year out to it. */
function toNextYear(initial: HegemonyState, cardId: string): HegemonyState {
  let G = produce(initial, (draft) => {
    const index = draft.yearDrawPile.findIndex((card) => card.id === cardId);
    if (index > 0) draft.yearDrawPile.unshift(...draft.yearDrawPile.splice(index, 1));
  });
  const year = G.year;
  for (let guard = 0; G.year === year && G.phase === "gameplay" && guard < 8; guard++)
    G = endCurrentTurn(G);
  return G;
}

/** Set the current seat's Unrest tokens so its level sits exactly on `level`. */
function atLevel(G: HegemonyState, level: number): HegemonyState {
  return produce(G, (draft) => {
    const seat = draft.players[draft.currentPlayer];
    seat.unrestTokens = Math.max(
      0,
      seat.unrestTokens + happinessLevel(draft, draft.currentPlayer) - level,
    );
  });
}

/** Give a seat 31 gold and enough citizens in its capital to lead the pops and the
 *  citizens past their minimums: Treasurer, Demos and Civic Elite. */
function threaten(G: HegemonyState, seat: PlayerId): HegemonyState {
  return produce(G, (draft) => {
    const { minimums } = draft.ruleset.victory;
    const player = draft.players[seat];
    player.resources.gold = minimums.gold + 1;
    const capitalId = player.settlements.find((tileId) => isCapital(draft, seat, tileId))!;
    const capital = getOwnedSettlement(draft, capitalId, seat)!;
    const pops = () =>
      player.settlements.reduce(
        (sum, tileId) => sum + totalPops(getOwnedSettlement(draft, tileId, seat)!.pops),
        0,
      );
    while (pops() < minimums.pops + 1 || capital.pops.citizens < minimums.citizens + 1)
      capital.pops.citizens += 1;
  });
}

/** The starved second seat buys an Idea and ends its turn short, taking the default
 *  hunger choice; then the third seat's turn opens with its own fate card cleared. */
function rivalHungerAndPurchase(start: HegemonyState): HegemonyState {
  let next = clearFate(start);
  const buy = enumerateLegalCommands(next, next.currentPlayer).find((c) => c.type === "buyIdea");
  if (buy) next = apply(next, buy);
  return clearFate(endCurrentTurn(next));
}

function apply(G: HegemonyState, command: GameCommand): HegemonyState {
  const result = transition(G.definition, G, G.currentPlayer, command);
  return result.ok ? result.state : G;
}

/** Resolve the current seat's drawn fate card, if any. */
function clearFate(G: HegemonyState): HegemonyState {
  const fate = enumerateLegalCommands(G, G.currentPlayer).find((c) => c.type === "resolveEvent");
  return fate ? apply(G, fate) : G;
}

/** Resolve whatever the current seat owes, then hold its End turn. */
function endCurrentTurn(initial: HegemonyState): HegemonyState {
  let G = initial;
  const seat = G.currentPlayer;
  for (let guard = 0; G.currentPlayer === seat && G.phase === "gameplay" && guard < 12; guard++) {
    const commands = enumerateLegalCommands(G, seat);
    const command = commands.find((c) => c.type === "endTurn") ?? commands[0];
    if (!command) break;
    G = apply(G, command);
  }
  return G;
}

/** Give a seat more mouths than its next income feeds, two short, with the
 *  influence to buy an Idea. */
function starve(initial: HegemonyState, seat: PlayerId): HegemonyState {
  return produce(initial, (draft) => {
    const capitalId = draft.players[seat].settlements.find((tileId) =>
      isCapital(draft, seat, tileId),
    )!;
    const capital = getOwnedSettlement(draft, capitalId, seat)!;
    while (
      calculateIncome(draft, seat).food > -2 &&
      totalPops(capital.pops) < settlementCapacity(capital, draft)
    )
      capital.pops.freemen += 1;
    draft.players[seat].resources.food = 0;
    draft.players[seat].resources.influence = draft.ruleset.ideas.influenceCost;
  });
}

/** Starve the next seat and pass the turn to it: its income leaves it two food short. */
function starveNextSeat(G: HegemonyState): HegemonyState {
  return endCurrentTurn(starve(G, nextPlayer(G.currentPlayer)));
}

/** Resolve the sitting that is open, biased toward landing Laws on the board: draw,
 *  propose what you drew, and vote yea. A sitting that passes nothing leaves the
 *  next Assembly looking exactly like the first, which is the state this exists to
 *  get past. */
export function playOutAssembly(initial: HegemonyState): HegemonyState {
  let G = initial;
  let rngState = G.seed ^ 0x1d872b41;
  let guard = 0;

  const preferred = new Set(["assemblyDraw", "assemblyPropose", "assemblyClose"]);

  while (G.assembly && G.phase === "gameplay" && guard++ < 400) {
    const player =
      G.assembly.phase === "voting" ? G.assembly.voteOrder[G.assembly.voteIndex] : null;
    const actor = player ?? G.assembly.activePlayer ?? G.currentPlayer;
    const commands = enumerateLegalCommands(G, actor);

    if (commands.length === 0) {
      return G;
    }

    const step = mulberry32(rngState);
    rngState = step.state;
    const yea = commands.find((command) => command.type === "assemblyVote" && command.yea);
    const wanted = commands.find((command) => preferred.has(command.type));
    const command = yea ?? wanted ?? commands[Math.floor(step.value * commands.length)];

    const result = transition(G.definition, G, actor, command);

    if (!result.ok) {
      // Fall back to whatever the engine will accept rather than spinning: this is
      // a dev shortcut, and a stuck one is worse than an imperfect one.
      const any = commands.find(
        (candidate) => transition(G.definition, G, actor, candidate).ok === true,
      );

      if (!any) {
        return G;
      }

      const forced = transition(G.definition, G, actor, any);
      G = forced.ok ? forced.state : G;
      continue;
    }

    G = result.state;
  }

  return G;
}

/** Play seed-driven legal commands until the Assembly convenes (or the game ends). Uses
 *  the same enumerate→transition path the sim does, so events and riots along the way
 *  resolve through the real engine rather than being skipped. */
export function fastForwardToAssembly(initial: HegemonyState): HegemonyState {
  let G = initial;
  let rngState = G.seed ^ 0x5bf03635;
  let guard = 0;

  while (!G.assembly && G.phase === "gameplay" && guard++ < 4000) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G;
    }

    const step = mulberry32(rngState);
    rngState = step.state;
    // Bias hard toward ending the turn: the point is to reach Year 2, not
    // to play a good game on the way there.
    const endTurnCommand = commands.find((command) => command.type === "endTurn");
    const command =
      endTurnCommand && step.value < 0.7
        ? endTurnCommand
        : commands[Math.floor(step.value * commands.length)];

    const result = transition(G.definition, G, G.currentPlayer, command);
    if (!result.ok) {
      return G;
    }
    G = result.state;
  }

  return G;
}
