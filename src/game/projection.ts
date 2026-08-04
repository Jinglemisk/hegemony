import { produce } from "immer";

import { currentWorkflow, eligibleActors } from "./actors";
import type { WorkflowKind } from "./actors";
import type { GameDefinition } from "./definition";
import { assertStateDefinition } from "./definition";
import { PLAYER_IDS } from "./data";
import { enumerateLegalOptions } from "./legalMoves";
import type { LegalOption } from "./legalMoves";
import type { EventCard, HegemonyState, PlayerId } from "./types";

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
    draft.seasonalDrawPile = hiddenEventDeck(draft.seasonalDrawPile);
    draft.seasonalDiscardPile = canonicalEventDeck(draft.seasonalDiscardPile);
    draft.playerDrawPile = hiddenEventDeck(draft.playerDrawPile);
    draft.playerDiscardPile = canonicalEventDeck(draft.playerDiscardPile);

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
        }
      }
    }
  }) as ProjectedGameState;
}

function canonicalEventDeck(deck: EventCard[]): EventCard[] {
  return [...deck].sort((left, right) => left.id.localeCompare(right.id));
}

function hiddenEventDeck(deck: EventCard[]): EventCard[] {
  return deck.map((card) => ({
    id: "__hidden_event__",
    deck: card.deck,
    name: "Hidden card",
    count: 1,
    text: "",
    timing: "immediate",
    effects: [],
  }));
}
