import { PLAYER_IDS } from "../data";
import type { HegemonyState, PlayerId } from "../types";
import { POLITICIANS, RESOLUTION_CARDS } from "./deck";
import type { PoliticianId, PoliticianStanding } from "./types";

/**
 * Power, patrons and the coup — all READ OFF THE BOARD (design §1.6).
 *
 * There is no power counter, no decay timer and no hidden state anywhere in this
 * module: a politician's power *is* the height of their stele stack, and their patron
 * *is* whoever authored the most of those stelae. That is deliberate — it means the
 * one visualization the panel draws (a stack of author-coloured tiles under each
 * figure) is simultaneously the power track, the patronage race, the Voice-of-the-
 * Assembly standings and Stratokles's doomsday clock, and none of them can ever
 * disagree with each other or with the board.
 *
 * Repeal therefore replaces decay: a Law leaving the board lowers its politician
 * naturally. Stratokles is the exception — his tally monuments are permanent, so his
 * track only ever rises and the only brake is voting his Directives down.
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

/** Built once from the deck — a card's author politician never changes, so this is static. */
const POLITICIAN_BY_CARD: Map<string, PoliticianId> = new Map(
  RESOLUTION_CARDS.map((card) => [card.id, card.politician])
);

function cardPolitician(cardId: string): PoliticianId | null {
  return POLITICIAN_BY_CARD.get(cardId) ?? null;
}

/**
 * Every politician's current standing. The single source for the colonnade, the
 * patron buffs in `laws.ts`, the Voice victory card and the coup check — so all four
 * are guaranteed to agree.
 */
export function politicianStandings(G: HegemonyState): PoliticianStanding[] {
  const threshold = G.ruleset.assembly.dominanceThreshold;

  return POLITICIANS.map((politician) => {
    // `authors` may contain nulls (the house resolution). Those count toward POWER —
    // the stele is standing — but toward nobody's patronage.
    const authors = steleAuthors(G, politician.id);
    const authored = PLAYER_IDS.reduce(
      (all, playerID) => ({ ...all, [playerID]: authors.filter((author) => author === playerID).length }),
      {} as Record<PlayerId, number>
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
      dominant: authors.length >= threshold
    };
  });
}

/** How many politicians a player is patron of — the Voice of the Assembly's metric. */
export function patronCount(G: HegemonyState, playerID: PlayerId): number {
  return politicianStandings(G).filter((standing) => standing.patron === playerID).length;
}

/** Total stelae a player has authored across every politician — the Voice card's
 *  tie-break, so two seats patronising two politicians each are separated by how much
 *  of the agora they actually built. */
export function authoredSteleCount(G: HegemonyState, playerID: PlayerId): number {
  return (
    G.activeLaws.filter((law) => law.author === playerID).length +
    G.tallyMonuments.filter((monument) => monument.author === playerID).length
  );
}

/** Stratokles's standing, which several call sites want directly. */
export function stratoklesStanding(G: HegemonyState): PoliticianStanding {
  const standing = politicianStandings(G).find((candidate) => candidate.politician.id === "stratokles");

  if (!standing) {
    throw new Error("Stratokles is missing from the politician registry.");
  }

  return standing;
}

/**
 * The coup (§1.8): when Stratokles holds the MOST stelae *and* has reached the tally
 * threshold, the demagogue seizes the city and **his patron wins outright**.
 *
 * Resolved as a win rather than a mutual loss on purpose — an everybody-loses cap is a
 * dead rule nobody would ever trigger, whereas crowning the patron gives a trailing
 * player a real comeback line (feed the chaos) and gives everyone else a reason to
 * vote his Directives down. Unpatroned (a tie on his stack) means no one is crowned
 * and the clock simply keeps running.
 */
export function stratoklesCoupStatus(G: HegemonyState): {
  tallies: number;
  threshold: number;
  leads: boolean;
  patron: PlayerId | null;
  triggered: boolean;
} {
  const standings = politicianStandings(G);
  const stratokles = standings.find((standing) => standing.politician.id === "stratokles")!;
  const threshold = G.ruleset.assembly.coupThreshold;
  const leads = standings.every(
    (standing) => standing.politician.id === "stratokles" || standing.power < stratokles.power
  );

  return {
    tallies: stratokles.power,
    threshold,
    leads,
    patron: stratokles.patron,
    triggered: leads && stratokles.power >= threshold && stratokles.patron !== null
  };
}
