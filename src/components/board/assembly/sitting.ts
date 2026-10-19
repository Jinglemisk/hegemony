import { useState } from "react";
import { getResolutionCard, restCanTurn, voteOutlook, wouldPass } from "../../../game/assembly";
import type { AssemblyResult, AssemblySession } from "../../../game/assembly";
import { voiceHolder } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { tieRule } from "../../../ui/effects";

/**
 * The Assembly sitting as the shell walks it. The engine has three phases; the modal
 * reads them as six stages, two of which are beats the engine does not wait for: the
 * ballot read before the first vote opens, and each item's result before the next.
 */
export type SittingStage = "proposal" | "drawn" | "ballot" | "vote" | "result" | "rises";

type Local = {
  year: number;
  read: boolean;
  /** Results already shown as a beat. */
  seen: number;
  minimised: boolean;
  /** Voice before and after the latest result, for that result's beat. */
  voice: { count: number; before: PlayerId | null; after: PlayerId | null };
};

export type Sitting = {
  session: AssemblySession;
  stage: SittingStage;
  /** The result the beat shows; set only on the result stage. */
  resultIndex: number;
  voiceBefore: PlayerId | null;
  minimised: boolean;
  setMinimised: (minimised: boolean) => void;
  openVote: () => void;
  nextResult: () => void;
};

export function stageOf(
  session: AssemblySession,
  viewer: PlayerId,
  read: boolean,
  seen: number,
): SittingStage {
  if (session.phase === "proposal") return session.held[viewer] ? "drawn" : "proposal";
  if (seen < session.results.length) return "result";
  if (session.phase === "closing") return "rises";
  const untouched = session.ballotIndex === 0 && session.votes.length === 0;
  return untouched && !read ? "ballot" : "vote";
}

/** The sitting's shell state. A new sitting starts open, unread, with nothing seen; a
 *  game opened mid-sitting does not replay results already decided. */
export function useSitting(G: HegemonyState, viewer: PlayerId): Sitting | null {
  const session = G.assembly;
  const [local, setLocal] = useState<Local | null>(null);
  let current = local;

  if (session && current?.year !== session.year) {
    const holder = voiceHolder(G);
    current = {
      year: session.year,
      read: false,
      seen: session.results.length,
      minimised: false,
      voice: { count: session.results.length, before: holder, after: holder },
    };
    setLocal(current);
  } else if (session && current && current.voice.count !== session.results.length) {
    current = {
      ...current,
      voice: {
        count: session.results.length,
        before: current.voice.after,
        after: voiceHolder(G),
      },
    };
    setLocal(current);
  }

  if (!session || !current) return null;
  const state = current;
  const stage = stageOf(session, viewer, state.read, state.seen);

  return {
    session,
    stage,
    resultIndex: state.seen,
    voiceBefore: state.voice.before,
    minimised: state.minimised,
    setMinimised: (minimised) => setLocal({ ...state, minimised }),
    openVote: () => setLocal({ ...state, read: true }),
    nextResult: () => setLocal({ ...state, seen: state.seen + 1 }),
  };
}

/** A seat as the viewer reads it: "you" for their own ("You" to open a sentence),
 *  otherwise the seat's name. */
export function seatName(G: HegemonyState, id: PlayerId, viewer: PlayerId, capital = false) {
  return id === viewer ? (capital ? "You" : "you") : G.players[id].name;
}

/**
 * A ballot item's result in words, from the engine's outcome kind: the verdict with its
 * tally, the recap's short verdict, their tone, the headline, and the recap's line.
 */
export function presentResult(G: HegemonyState, result: AssemblyResult, viewer: PlayerId) {
  const { item, outcome, yea, nay } = result;
  const carried = outcome === "carried";
  const name =
    item.kind === "repeal"
      ? (getResolutionCard(G.definition.content, item.cardId)?.name ?? item.cardId)
      : item.card.name;
  const blocked = "carried, but could not take effect";
  const against =
    item.kind === "enact" && item.target
      ? `carries against ${seatName(G, item.target, viewer)}`
      : "";
  const [headline, line] =
    item.kind === "repeal"
      ? carried
        ? [`${name} is struck from the record`, "struck from the record"]
        : [`${name} still stands`, outcome === "blocked" ? blocked : "the Law still stands"]
      : outcome === "blocked"
        ? [`${name} cannot take effect`, blocked]
        : outcome === "fell"
          ? [`${name} is voted down`, "voted down"]
          : item.card.kind === "law"
            ? [`${name} is enacted`, "enacted · a new stele stands"]
            : [`${name} ${against}`, against];

  return {
    verdict: carried
      ? `Carried ${yea} to ${nay}`
      : outcome === "blocked"
        ? `Carried ${yea} to ${nay}, without effect`
        : yea === nay
          ? `Tied ${yea} to ${nay}: it fails`
          : `Fails ${yea} to ${nay}`,
    short: `${carried ? "Carried" : "Fails"} ${yea}–${nay}`,
    tone: carried ? "is-yea" : "is-nay",
    headline,
    line,
  };
}

const list = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/**
 * "What your vote does": both choices as a tally, and whether the seats still to cast
 * can turn it. Public numbers only. `you` phrases it for the caster; otherwise it
 * names them, for the seats watching.
 */
export function voteLine(
  G: HegemonyState,
  viewer: PlayerId,
): { lead: string; rest: string } | null {
  const outlook = voteOutlook(G);
  if (!outlook) return null;
  const { yea, nay, caster, rest } = outlook;
  const w = caster.weight;
  const you = caster.playerID === viewer;
  const lead = you
    ? `Yea with ${w} makes it ${yea + w} to ${nay}; nay makes it ${yea} to ${nay + w}.`
    : `${seatName(G, caster.playerID, viewer)} casts ${w}: yea makes it ${yea + w} to ${nay}, nay ${yea} to ${nay + w}.`;

  if (rest.length === 0) {
    const yeaCarries = wouldPass(G, yea + w, nay);
    const nayCarries = wouldPass(G, yea, nay + w);
    return {
      lead,
      rest:
        yeaCarries && nayCarries
          ? "It carries either way."
          : !yeaCarries && !nayCarries
            ? !G.ruleset.assembly.tiesPass && yea + w === nay
              ? `It fails either way: ${tieRule(G.ruleset)}.`
              : "It fails either way."
            : `${you ? "You cast" : `${seatName(G, caster.playerID, viewer)} casts`} last and decide${you ? "" : "s"} it.`,
    };
  }

  const now = rest.reduce((sum, seat) => sum + seat.weight, 0);
  const most = rest.reduce((sum, seat) => sum + seat.most, 0);
  const who = list(rest.map((seat) => seatName(G, seat.playerID, viewer)));
  const after =
    rest.length === 1
      ? `${who} casts last with ${now}${most > now ? `, up to ${most} with bought votes` : ""}`
      : `${who} still cast ${now}${most > now ? `, up to ${most} with bought votes` : ""}`;
  const turnYea = restCanTurn(G, yea + w, nay, most);
  const turnNay = restCanTurn(G, yea, nay + w, most);
  const they = rest.length === 1 ? who : "they";
  const verdict =
    turnYea && turnNay
      ? `${they} can still decide it`
      : !turnYea && !turnNay
        ? "nothing after can change it"
        : `${they} can still turn a ${turnYea ? "yea" : "nay"}, not a ${turnYea ? "nay" : "yea"}`;
  return { lead, rest: `${after}: ${verdict}.` };
}
