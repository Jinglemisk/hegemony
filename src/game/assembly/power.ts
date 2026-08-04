import { PLAYER_IDS } from "../data";
import type { HegemonyState, PlayerId } from "../types";
import { getResolutionCard } from "../content";
import { POLITICIANS } from "./deck";
import type { PoliticianId, PoliticianStanding } from "./types";

/**
 * Politician power and descriptive patrons — all read off the board.
 *
 * There is no power counter, no decay timer and no hidden state anywhere in this
 * module: a politician's power *is* the height of their stele stack, and their patron
 * *is* whoever authored the most of those stelae. That is deliberate — it means the
 * one visualization the panel draws (a stack of author-coloured tiles under each
 * figure) remains an honest record of standing Laws and resolved Directives.
 *
 * Repeal therefore replaces decay: a Law leaving the board lowers its politician
 * naturally. Stratokles is the exception — his tally monuments are permanent, so his
 * track only ever rises.
 */

/** Stelae standing for one politician: active Laws for the three regulars, permanent
 *  tally monuments for Stratokles. */
function steleAuthors(G: HegemonyState, politician: PoliticianId): Array<PlayerId | null> {
  if (politician === "stratokles") {
    return G.tallyMonuments.map((monument) => monument.author);
  }

  return G.activeLaws
    .filter((law) => cardPolitician(law.cardId) === politician)
    .map((law) => law.author);
}

function cardPolitician(cardId: string): PoliticianId | null {
  return getResolutionCard(cardId)?.politician ?? null;
}

/**
 * Every politician's current descriptive standing. This feeds the colonnade and
 * permanent agora record, but no longer grants buffs or controls Voice.
 */
export function politicianStandings(G: HegemonyState): PoliticianStanding[] {
  return POLITICIANS.map((politician) => {
    // `authors` may contain nulls (the house resolution). Those count toward POWER —
    // the stele is standing — but toward nobody's patronage.
    const authors = steleAuthors(G, politician.id);
    const authored = PLAYER_IDS.reduce(
      (all, playerID) => ({
        ...all,
        [playerID]: authors.filter((author) => author === playerID).length,
      }),
      {} as Record<PlayerId, number>,
    );

    // The sole author of the most stelae is the patron; a tie leaves the politician
    // unpatroned, the same tie→null rule the five victory cards already use.
    let patron: PlayerId | null = null;
    let best = 0;

    for (const playerID of PLAYER_IDS) {
      if (authored[playerID] > best) {
        best = authored[playerID];
        patron = playerID;
      } else if (authored[playerID] === best && best > 0) {
        patron = null;
      }
    }

    return {
      politician,
      power: authors.length,
      patron,
      authored,
    };
  });
}

/** How many descriptive patron labels a player currently holds. */
export function patronCount(G: HegemonyState, playerID: PlayerId): number {
  return politicianStandings(G).filter((standing) => standing.patron === playerID).length;
}

/** Total stelae currently visible for a player. Descriptive only: Voice uses the
 * permanent authored-and-passed ledger on state. */
export function authoredSteleCount(G: HegemonyState, playerID: PlayerId): number {
  return (
    G.activeLaws.filter((law) => law.author === playerID).length +
    G.tallyMonuments.filter((monument) => monument.author === playerID).length
  );
}
