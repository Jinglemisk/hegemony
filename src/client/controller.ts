import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { DEV_ROTATION_SEEDS, GAME_CONFIG } from "../game/config";
import { mulberry32 } from "../game/core/rng";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import type { BoardLayout, HegemonyState, Phase, PlayerId } from "../game/types";
import { createGameFromDefinition, nextPlayer } from "../game/turn";
import { happinessLevel } from "../game/happiness";
import { ideaDraftOrder } from "../game/ideas";
import { calculateIncome } from "../game/economy/income";
import { getOwnedSettlement } from "../game/core/query";
import { totalPops } from "../game/core/pops";
import { settlementCapacity } from "../game/settlement";
import type { GameCommand } from "../game/legalMoves";
import { GAME_MODES, type GameModeId } from "../game/ruleset";
import { loadStartAtAssembly, loadTuningPresetId, resolveTunedDefinition } from "../dev/tuning";
import { createBrowserSeed } from "./seed";
import { choosePlacement, resolvePolicy } from "../sim/policies";
import { playTurn } from "../sim/runner";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { buildNewGame } from "../sim/setup";
import { createCommandEvents, createCommandMoves, reduceGameCommand } from "./commandAdapter";

export type { GameEvents, GameMoves } from "./commandAdapter";

export type { Phase } from "../game/types";

/**
 * URL-driven game options, so a browser session can pick the board and seed without a
 * lobby: `?board=shuffled&seed=42` for a quick game on a randomized layout,
 * `?mode=fastStart` for the richer treasury, `?setup=manual` to place the opening
 * towns by hand, `?setup=ideas` to auto-place but keep the Idea picker,
 * `?dev=preload` to replay the fixed scripted placements,
 * `?opening=random` for the old uniform draw instead of policy placement, and
 * `?dev=bots` to let the sim's bots play every seat (`&policy=` picks which, `master`
 * by default) — a whole game played through the shell, one turn per tick.
 * Step 13's moments have their own: `?dev=draft` (the last seat choosing in the Idea
 * draft), `?dev=draft-done` (the draft read back after its last pick), `?dev=hunger`
 * (the second seat's hunger card), `?dev=hunger-ahead` (the warning a turn ahead),
 * `?dev=toasts` (a rival's hunger and purchase, toasted to the third seat) and
 * `?dev=ideas` (the third seat's purchase list after that rival bought). Part B's:
 * `?dev=year` (Year II's card, Plague, before the Assembly), `?dev=year-back` (its
 * back, held), `?dev=year-term` (Year III's card, Drought), `?dev=riot-confirm` and
 * `?dev=revolt-confirm` (End turn's confirm at each line), `?dev=riot` (the riot
 * sheet), `?dev=riot-result`, `?dev=revolt` (the revolt card), `?dev=rival-unrest` (a
 * rival's riot and another's revolt, toasted), `?dev=threat` (a rival holding three
 * titles, with the title toasts), `?dev=race` and `?dev=age-end` (the two tablets) and
 * `?dev=pass` (the pass-the-seat cover).
 *
 * Default dev behavior: the opening is auto-played by the sim's placement policy (the
 * same brain the bots use, seeded from the game seed), and the seed rotates through
 * {@link DEV_ROTATION_SEEDS} on every reload — testing never starts at "place your
 * capital" unless asked to. Quick starts also score every seat's setup Idea.
 */
function createGameFromUrl(): HegemonyState {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const boardParam = params?.get("board");
  const boardLayout: BoardLayout =
    boardParam === "shuffled" || boardParam === "classic" ? boardParam : GAME_CONFIG.boardLayout;
  const seedParam = Number(params?.get("seed"));
  const pinnedSeed =
    Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const matchSeed = pinnedSeed ?? createBrowserSeed();
  const manualSetup = params?.get("setup") === "manual";
  const keepIdeaPicker = params?.get("setup") === "ideas";
  const modeParam = params?.get("mode");
  const mode: GameModeId =
    modeParam === "standard" || modeParam === "fastStart" || modeParam === "deathmatch"
      ? modeParam
      : GAME_CONFIG.mode;
  const dev = params?.get("dev") ?? "";
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;
  const startAtAssembly = import.meta.env.DEV && loadStartAtAssembly();
  const devAutoOpening = import.meta.env.DEV && GAME_CONFIG.autoOpeningForDev;
  const autoOpening =
    !manualSetup &&
    (keepIdeaPicker ||
      pinnedSeed !== undefined ||
      mode === "fastStart" ||
      preload ||
      dev === "bots" ||
      Object.hasOwn(MOMENT_QUERIES, dev) ||
      /^assembly([2-7])?$/.test(dev) ||
      startAtAssembly ||
      (import.meta.env.DEV && loadTuningPresetId() !== null) ||
      devAutoOpening);

  // Resolve one immutable definition before state creation. Existing matches keep their
  // pinned package even if the tuning controls are changed for the next reset.
  const definition = resolveTunedDefinition(GAME_MODES[mode].ruleset);

  if (preload && autoOpening && !keepIdeaPicker) {
    // Fix placement only; Ideas use the same scorer as other quick starts.
    return buildNewGame({
      definition,
      seed: matchSeed,
      mode,
      boardLayout: "classic",
      opening: "fixed",
      simRng: createSimRng(deriveBotSeed(matchSeed)),
    });
  }

  const seed = pinnedSeed ?? (autoOpening && devAutoOpening ? nextRotationSeed() : matchSeed);
  let G = createGameFromDefinition(definition, seed, boardLayout, false);

  if (autoOpening) {
    G = autoPlayOpening(G, params?.get("opening") === "random", !keepIdeaPicker && dev !== "draft");
  }

  if (!manualSetup && Object.hasOwn(MOMENT_QUERIES, dev)) {
    G = MOMENT_QUERIES[dev](G);
  }

  // `?dev=assembly` fast-forwards to the first Assembly. The agora sits at the start
  // of Year 2 — four turns in — and neither a playtest nor a browser check should
  // have to click through a whole year to reach the feature under test. The TUNE panel's
  // "Start at Assembly" toggle sets the same fast-forward as a sticky dev flag, so a plain
  // map regen (reload or Apply) lands there too — no URL param, no sixteen End Turn clicks.
  if (!manualSetup && !keepIdeaPicker && (dev === "assembly" || startAtAssembly)) {
    G = fastForwardToAssembly(G);
  }

  // Later sittings expose standing Laws; Year 8 includes eligible Year 4 repeals.
  const laterSitting =
    !manualSetup && !keepIdeaPicker ? Number(dev.match(/^assembly([2-7])$/)?.[1] ?? 0) : 0;
  if (laterSitting) {
    G = fastForwardToAssembly(G);
    for (let sitting = 1; sitting < laterSitting; sitting++) {
      G = playOutAssembly(G);
      G = fastForwardToAssembly(G);
    }
  }

  return G;
}

/** Dev shortcuts to Step 13's moments for the gate script. Each plays real commands
 *  from a quick start; `?dev=hunger` and `?dev=toasts` also empty one seat's granary. */
const MOMENT_QUERIES: Record<string, (G: HegemonyState) => HegemonyState> = {
  draft: (G) => {
    // Every seat but the last takes its Idea by the bots' scorer.
    const rng = createSimRng(deriveBotSeed(G.seed));
    while (G.phase === "setupIdeas" && G.currentPlayer !== ideaDraftOrder(G).at(-1))
      G = apply(G, choosePlacement(G, enumerateLegalCommands(G, G.currentPlayer), rng));
    return G;
  },
  "draft-done": (G) => {
    DEV_SHELL.draftSummary = true;
    return G;
  },
  hunger: (G) => starveNextSeat(G),
  "hunger-ahead": (G) => starve(clearFate(G), G.currentPlayer),
  toasts: (G) => {
    const start = starveNextSeat(G);
    DEV_SHELL.toastReplayFrom = start.log.length;
    return rivalHungerAndPurchase(start);
  },
  ideas: (G) => {
    DEV_SHELL.ideasOpen = true;
    const seat = rivalHungerAndPurchase(starveNextSeat(G));
    return produce(seat, (draft) => {
      draft.players[draft.currentPlayer].resources.influence = 9;
    });
  },
  year: (G) => {
    DEV_SHELL.yearReveal = true;
    return toNextYear(G, "year-plague");
  },
  "year-back": (G) => {
    DEV_SHELL.yearReveal = true;
    DEV_SHELL.yearBack = true;
    return toNextYear(G, "year-plague");
  },
  "year-term": (G) => {
    DEV_SHELL.yearReveal = true;
    return toNextYear(playOutAssembly(toNextYear(G, "year-plague")), "year-drought");
  },
  "riot-confirm": (G) => {
    DEV_SHELL.endTurnConfirm = true;
    return atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold);
  },
  "revolt-confirm": (G) => {
    DEV_SHELL.endTurnConfirm = true;
    return atLevel(clearFate(G), G.ruleset.economy.unrest.revoltThreshold);
  },
  riot: (G) => apply(atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold), END_TURN),
  "riot-result": (G) => {
    const seat = G.currentPlayer;
    const rioting = apply(atLevel(clearFate(G), G.ruleset.economy.unrest.riotThreshold), END_TURN);
    DEV_SHELL.riotResult = true;
    DEV_SHELL.viewer = seat;
    return apply(rioting, { type: "resolveRiot" });
  },
  revolt: (G) => {
    const start = atLevel(clearFate(G), G.ruleset.economy.unrest.revoltThreshold);
    DEV_SHELL.viewer = start.currentPlayer;
    DEV_SHELL.momentsFrom = start.log.length;
    return apply(start, END_TURN);
  },
  "rival-unrest": (G) => {
    const { riotThreshold, revoltThreshold } = G.ruleset.economy.unrest;
    const riot = apply(atLevel(clearFate(G), riotThreshold), END_TURN);
    DEV_SHELL.toastReplayFrom = riot.log.length;
    const next = apply(riot, { type: "resolveRiot" });
    return clearFate(apply(atLevel(clearFate(next), revoltThreshold), END_TURN));
  },
  threat: (G) => {
    DEV_SHELL.titlesFrom = G;
    return threaten(clearFate(G), nextPlayer(G.currentPlayer));
  },
  race: (G) => {
    DEV_SHELL.viewer = G.currentPlayer;
    return endCurrentTurn(threaten(G, nextPlayer(G.currentPlayer)));
  },
  "age-end": (G) => {
    let last = produce(G, (draft) => {
      draft.year = draft.yearDrawPile.length + 1;
      draft.yearDrawPile = [];
    });
    for (let guard = 0; last.phase === "gameplay" && guard < 8; guard++)
      last = endCurrentTurn(last);
    DEV_SHELL.viewer = last.winner;
    return last;
  },
  pass: (G) => {
    DEV_SHELL.passCover = true;
    return G;
  },
  // The fourth sitting, its proposals sealed: the ballot read, one item voted but for
  // its last seat, and the house risen.
  "assembly-ballot": (G) => sealProposals(G),
  "assembly-vote": (G) => castVotes(sealProposals(G), 1),
  "assembly-rises": (G) => castVotes(sealProposals(G), 0),
};

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
      pick("assemblyPass");
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
    const capital = getOwnedSettlement(draft, player.settlements[0], seat)!;
    const pops = () =>
      player.settlements.reduce(
        (sum, tileId) => sum + totalPops(getOwnedSettlement(draft, tileId, seat)!.pops),
        0,
      );
    while (pops() < minimums.pops + 1 || capital.pops.citizens < minimums.citizens + 1)
      capital.pops.citizens += 1;
  });
}

/** The starved second seat takes the default hunger choice and buys an Idea, then
 *  the third seat's turn opens with its own fate card cleared. */
function rivalHungerAndPurchase(start: HegemonyState): HegemonyState {
  let next = clearFate(apply(start, enumerateLegalCommands(start, start.currentPlayer)[0]));
  const buy = enumerateLegalCommands(next, next.currentPlayer).find((c) => c.type === "buyIdea");
  if (buy) next = apply(next, buy);
  return clearFate(endCurrentTurn(next));
}

/** One-shot shell flags the moment queries set for the board's first render. */
export const DEV_SHELL: {
  draftSummary: boolean;
  ideasOpen: boolean;
  toastReplayFrom: number | null;
  /** Show the current year's card as if it had just turned; hold its back. */
  yearReveal: boolean;
  yearBack: boolean;
  endTurnConfirm: boolean;
  riotResult: boolean;
  passCover: boolean;
  /** Read the seat's own moments (the revolt card) from this log index. */
  momentsFrom: number | null;
  /** Toast title changes since this state. */
  titlesFrom: HegemonyState | null;
  viewer: PlayerId | null;
} = {
  draftSummary: false,
  ideasOpen: false,
  toastReplayFrom: null,
  yearReveal: false,
  yearBack: false,
  endTurnConfirm: false,
  riotResult: false,
  passCover: false,
  momentsFrom: null,
  titlesFrom: null,
  viewer: null,
};

/** Whether the shell seats two or more people at one screen: every game but `?dev=bots`. */
const HOTSEAT =
  typeof window === "undefined" ||
  new URLSearchParams(window.location.search).get("dev") !== "bots";

/**
 * The private moment the screen is about to belong to, as a key that changes with each
 * one: a seat's turn, or a seat's Assembly proposal. Null in a public phase (setup, the
 * Idea draft, the vote, the house rising, the game's end). In hotseat each new key is
 * handed over behind the pass-the-seat cover.
 */
export function privateMoment(G: HegemonyState): string | null {
  if (G.phase !== "gameplay") return null;
  if (!G.assembly) return `turn:${G.turn}`;
  return G.assembly.phase === "proposal" ? `proposal:${G.assembly.year}:${G.currentPlayer}` : null;
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

/** Give a seat more mouths than its next income feeds, two short, with 6 influence
 *  to buy an Idea. */
function starve(initial: HegemonyState, seat: PlayerId): HegemonyState {
  return produce(initial, (draft) => {
    const capital = getOwnedSettlement(draft, draft.players[seat].settlements[0], seat)!;
    while (
      calculateIncome(draft, seat).food > -2 &&
      totalPops(capital.pops) < settlementCapacity(capital, draft)
    )
      capital.pops.freemen += 1;
    draft.players[seat].resources.food = 0;
    draft.players[seat].resources.influence = 6;
  });
}

/** Starve the next seat and pass the turn to it: its income leaves two mouths unfed. */
function starveNextSeat(G: HegemonyState): HegemonyState {
  return endCurrentTurn(starve(G, nextPlayer(G.currentPlayer)));
}

/** Resolve the sitting that is open, biased toward landing Laws on the board: draw,
 *  propose what you drew, and vote yea. A sitting that passes nothing leaves the
 *  next Assembly looking exactly like the first, which is the state this exists to
 *  get past. */
function playOutAssembly(initial: HegemonyState): HegemonyState {
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
function fastForwardToAssembly(initial: HegemonyState): HegemonyState {
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

/** Next seed from the dev rotation — a localStorage cursor advances it once per page
 *  load (memoized so StrictMode's double state-initialization doesn't skip seeds). */
let rotationSeedThisLoad: number | null = null;

function nextRotationSeed(): number {
  if (rotationSeedThisLoad !== null) {
    return rotationSeedThisLoad;
  }

  const key = "hegemony-dev-opening-index";
  let index = 0;

  try {
    index = Number(window.localStorage.getItem(key) ?? 0) || 0;
    window.localStorage.setItem(key, String((index + 1) % DEV_ROTATION_SEEDS.length));
  } catch {
    // Storage unavailable (private mode etc.) — a fixed first seed is fine.
  }

  rotationSeedThisLoad = DEV_ROTATION_SEEDS[index % DEV_ROTATION_SEEDS.length];
  return rotationSeedThisLoad;
}

/** Play the opening the sim way — the shared placement policy, or a uniform draw when
 *  asked — with a bot stream derived from the game seed exactly as `runGame` does, so
 *  the browser and the headless sim place identically for a seed. Only an explicit
 *  picker preview stops before Ideas; quick starts score every seat, including the human. */
function autoPlayOpening(
  initial: HegemonyState,
  uniform: boolean,
  chooseIdeas: boolean,
): HegemonyState {
  let G = initial;
  const rng = createSimRng(deriveBotSeed(G.seed));
  let guard = 0;

  while (G.phase !== "gameplay" && (chooseIdeas || G.phase !== "setupIdeas") && guard++ < 64) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G; // leave whatever remains to manual play rather than crash
    }

    const command =
      uniform && G.phase !== "setupIdeas" ? rng.pick(commands) : choosePlacement(G, commands, rng);
    const result = transition(G.definition, G, G.currentPlayer, command);
    if (!result.ok) {
      return G;
    }
    G = result.state;
  }

  return G;
}

const BOT_TICK_MS = 250;

/** `?dev=bots`: the sim's policy plays every seat, one whole turn per tick, through the
 *  same `playTurn` the headless batch uses, so the shell renders a real bot game. */
function useBotTable(G: HegemonyState, setG: (next: HegemonyState) => void) {
  const [policy] = useState(() => {
    const params =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    return params?.get("dev") === "bots" ? resolvePolicy(params.get("policy") ?? "master") : null;
  });
  // One bot stream per game seed, as `runGame` derives it.
  const rng = useMemo(() => createSimRng(deriveBotSeed(G.seed)), [G.seed]);

  useEffect(() => {
    if (!policy || G.phase === "gameOver") {
      return;
    }

    // The turn is played here, not in a state updater: StrictMode runs updaters
    // twice, which would spend the bot stream twice per tick.
    const tick = window.setTimeout(() => {
      try {
        setG(playTurn(G, policy, rng));
      } catch (error) {
        console.error("dev bots stopped:", error);
      }
    }, BOT_TICK_MS);
    return () => window.clearTimeout(tick);
  }, [G, policy, rng, setG]);
}

/** Read-only projection of the turn fields now living on {@link HegemonyState}, kept for the UI's convenience. */
export type LocalContext = {
  currentPlayer: PlayerId;
  phase: Phase;
  turn: number;
};

function deriveContext(G: HegemonyState): LocalContext {
  return { currentPlayer: G.currentPlayer, phase: G.phase, turn: G.turn };
}

export function useHegemonyGame() {
  const [G, setG] = useState<HegemonyState>(createGameFromUrl);
  const [playerID, setPlayerID] = useState<PlayerId>(() => DEV_SHELL.viewer ?? G.currentPlayer);

  const moment = privateMoment(G);
  useEffect(() => {
    // The viewer follows the seat the game waits on. In hotseat a private moment (a
    // turn, an Assembly proposal) is handed over by the pass-the-seat cover instead,
    // and the game's end stays with whoever was looking.
    if (G.phase === "gameOver" || (HOTSEAT && moment)) return;
    setPlayerID(G.currentPlayer);
  }, [G.currentPlayer, G.phase, moment]);

  const moves = useMemo(
    () =>
      createCommandMoves((command, actor) => {
        setG((previous) => reduceGameCommand(previous, actor ?? previous.currentPlayer, command));
      }),
    [],
  );
  const events = useMemo(
    () =>
      createCommandEvents((command, actor) => {
        setG((previous) => reduceGameCommand(previous, actor ?? previous.currentPlayer, command));
      }),
    [],
  );
  useBotTable(G, setG);
  const view = useMemo(() => projectForPlayer(G.definition, G, playerID), [G, playerID]);
  // Rebuild the whole game from URL + current dev tuning overrides. Reuses this page
  // load's rotation seed, so a re-tune re-rolls the SAME board with new params (clean A/B).
  const resetGame = useMemo(() => () => setG(createGameFromUrl()), []);
  // Stable while G is unchanged, so memoized panels that read the turn context don't re-render on unrelated UI state.
  const ctx = useMemo(() => deriveContext(view.state), [view.state]);

  return {
    game: { G: view.state, ctx },
    view,
    playerID,
    setPlayerID,
    moves,
    events,
    resetGame,
    hotseat: HOTSEAT,
    isActive: view.eligibleActors.includes(playerID),
  };
}

/**
 * UI convenience methods construct intent-only commands and pass them to the same
 * atomic transition used by simulation and replay. Rejections preserve the previous
 * state reference, so React does not render a partial or invalid command result.
 */
