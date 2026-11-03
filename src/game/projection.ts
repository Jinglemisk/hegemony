import { produce } from "immer";

import { currentWorkflow, eligibleActors } from "./actors";
import type { WorkflowKind } from "./actors";
import type { GameDefinition } from "./definition";
import { assertStateDefinition } from "./definition";
import { PLAYER_IDS } from "./data";
import { enumerateLegalOptions } from "./legalMoves";
import type { LegalOption } from "./legalMoves";
import type { EventCard, HegemonyState, PlayerId, TradePlaces, YearCard } from "./types";
import { forecastYearCard } from "./year";

/**
 * A presentation-compatible state whose secret-bearing collections have been
 * canonicalized or redacted. Keeping the public state shape intact lets the existing
 * board and rule presenters consume a server-shaped view without duplicating selectors.
 * Only projection functions may construct this branded value.
 */
declare const projectedState: unique symbol;
export type ProjectedGameState = HegemonyState & { readonly [projectedState]: true };

type ViewBase = {
  state: ProjectedGameState;
  eligibleActors: PlayerId[];
  workflow: WorkflowKind;
};

export type PlayerView = ViewBase & {
  kind: "player";
  viewer: PlayerId;
  legalOptions: LegalOption[];
};

export type SpectatorView = ViewBase & {
  kind: "spectator";
  legalOptions: [];
};

/** Project authoritative state for one seat, preserving only that seat's private decisions. */
export function projectForPlayer(
  definition: GameDefinition,
  state: HegemonyState,
  viewer: PlayerId,
): PlayerView {
  assertProjectionDefinition(definition, state);
  return {
    kind: "player",
    viewer,
    state: redactState(state, viewer),
    legalOptions: enumerateLegalOptions(state, viewer),
    eligibleActors: eligibleActors(state),
    workflow: currentWorkflow(state),
  };
}

/** Project the public table only. Spectators can observe but never submit commands. */
export function projectForSpectator(
  definition: GameDefinition,
  state: HegemonyState,
): SpectatorView {
  assertProjectionDefinition(definition, state);
  return {
    kind: "spectator",
    state: redactState(state, null),
    legalOptions: [],
    eligibleActors: eligibleActors(state),
    workflow: currentWorkflow(state),
  };
}

function assertProjectionDefinition(definition: GameDefinition, state: HegemonyState): void {
  assertStateDefinition(state);
  if (definition.identity.id !== state.definitionId) {
    throw new Error(
      `game definition mismatch: state requires ${state.definitionId}, received ${definition.identity.id}`,
    );
  }
}

function redactState(state: HegemonyState, viewer: PlayerId | null): ProjectedGameState {
  return produce(state, (draft) => {
    // The seed can reconstruct initial shuffles and the RNG can reconstruct later ones,
    // so both stay authority-only. Draw piles expose counts, never identities or order.
    draft.seed = 0;
    draft.rng = 0;
    // Next year's card is public; the rest of the pile shows how many years are left
    // and nothing else. The discards are every card already revealed, so they are public.
    const forecast = forecastYearCard(draft);
    draft.yearDrawPile = draft.yearDrawPile.map((card, index) =>
      index === 0 && forecast ? card : HIDDEN_YEAR_CARD,
    );
    draft.yearDiscardPile = [...draft.yearDiscardPile].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    draft.playerDrawPile = hiddenEventDeck(draft.playerDrawPile);
    draft.playerDiscardPile = canonicalEventDeck(draft.playerDiscardPile);
    // The development deck: the order stays hidden and the discards are public. Each
    // seat sees its own hand; a rival's hand shows how many cards it holds, never which.
    draft.devDrawPile = draft.devDrawPile.map(() => HIDDEN_DEV_CARD);
    draft.devDiscardPile.sort();
    for (const playerID of PLAYER_IDS) {
      if (playerID === viewer) continue;
      draft.devHands[playerID] = draft.devHands[playerID].map((held) => ({
        ...held,
        id: HIDDEN_DEV_CARD,
      }));
    }
    // The cards a seat picked to give in trade are its own: an open offer or counter
    // shows every other seat how many, never which.
    for (const offer of draft.offers) {
      if (offer.from !== viewer) hidePick(offer.places);
      for (const [seat, reply] of Object.entries(offer.answers))
        if (reply?.kind === "counter" && seat !== viewer) hidePick(reply.places);
    }

    for (const politician of Object.keys(draft.politicianDecks) as Array<
      keyof typeof draft.politicianDecks
    >) {
      draft.politicianDecks[politician] = draft.politicianDecks[politician].map(
        () => "__hidden_resolution__",
      );
      draft.politicianDiscards[politician].sort();
    }

    if (draft.pendingPlayerEvent?.playerID !== viewer) {
      const pending = draft.pendingPlayerEvent;
      if (pending && draft.lastPlayerEvent?.id === pending.card.id) {
        draft.lastPlayerEvent = null;
      }
      if (pending) {
        const privateName = pending.card.name;
        const actorName = draft.players[pending.playerID].name;
        for (const entry of draft.log) {
          if (entry.message.includes(privateName)) {
            entry.message = `${actorName} is resolving a private Player Event.`;
          }
        }
      }
      draft.pendingPlayerEvent = null;
    }

    if (draft.assembly?.phase === "proposal") {
      for (const playerID of PLAYER_IDS) {
        if (playerID !== viewer) {
          draft.assembly.held[playerID] = null;
          draft.assembly.proposals[playerID] = null;
          draft.assembly.setAside[playerID] = null;
        }
      }
    }
  }) as ProjectedGameState;
}

/** Stands in for every development card the viewer may not see. */
const HIDDEN_DEV_CARD = "__hidden_dev__";

function hidePick(places: TradePlaces) {
  if (places.cards) places.cards = places.cards.map(() => HIDDEN_DEV_CARD);
}

/** Stands in for every undrawn year card. Its effect is a placeholder the type needs;
 *  nothing reads a hidden card's effect. */
const HIDDEN_YEAR_CARD: YearCard = {
  id: "__hidden_year__",
  name: "Hidden card",
  count: 1,
  text: "",
  effect: { type: "unrestTokens", change: "clearAll" },
};

function canonicalEventDeck(deck: EventCard[]): EventCard[] {
  return [...deck].sort((left, right) => left.id.localeCompare(right.id));
}

function hiddenEventDeck(deck: EventCard[]): EventCard[] {
  return deck.map(() => ({
    id: "__hidden_event__",
    name: "Hidden card",
    count: 1,
    text: "",
    timing: "immediate",
    effects: [],
  }));
}
