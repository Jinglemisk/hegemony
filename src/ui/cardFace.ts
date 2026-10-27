import { POLITICIANS } from "../game/assembly/deck";
import type {
  DirectiveEffect,
  LawEffect,
  PoliticianId,
  ResolutionCard,
} from "../game/assembly/types";
import type { GameContent } from "../game/content";
import type { NationalIdeaDefinition } from "../game/ideaTypes";
import type { Ruleset } from "../game/ruleset";
import type {
  EventCard,
  EventEffect,
  HegemonyState,
  Resources,
  Stat,
  UnrestTokenChange,
  YearCard,
  YearTerm,
} from "../game/types";
import { presentEventEffect, presentLawEffect, presentYearCard } from "./effects";
import type { EffectTone } from "./effects";
import { toRoman } from "./formatters";
import {
  BUILDING_RASTERS,
  IDEA_RASTERS,
  POP_RASTERS,
  RESOURCE_RASTERS,
  YEAR_TERM_RASTERS,
  yearCardIcon,
} from "./iconRegistry";
import { RESOURCE_ORDER } from "./resourceVisuals";

/**
 * One face for every card (the card-face study, owner 2026-10-27): the deck's band,
 * four corner marks (kind, reach, timing, duration), a picture window, the name, the
 * card's own voice, and an effect panel that shows the effect as an icon equation and
 * then says it in the card's authored sentence. A presenter per deck builds the face
 * from the engine's typed card, so the equation cannot drift from the rules; the
 * sentence is the card's `text`, printed in full.
 *
 * How many cards are left is never on the face: it is the deck line's, under the card.
 */

export type CardDeck = "year" | "fate" | "law" | "directive" | "idea";
export type CardSize = "ceremony" | "hand" | "mini";

/** A corner: its bronze icon (or a short text where the vocabulary has none), and its
 *  word, which is its accessible name. */
export type CardMark = { label: string; icon?: string; text?: string };

/** One token of the equation's grammar (see the study): an icon, struck for "none" or
 *  "may not"; a numeral before what it counts; an operator; a small-caps condition. */
export type EqToken =
  { icon: string; struck?: true } | { n: string } | { op: "=" | "→" | "/" } | { cond: string };

/** A row is one effect. A gain row carries the leaf notch, a cost row the clay one. */
export type EqRow = { tone: "gain" | "cost" | null; tokens: EqToken[] };

export type CardFace = {
  deck: CardDeck;
  name: string;
  /** The band's word: the deck, or the politician on an Assembly card. */
  band: string;
  kind: CardMark;
  reach: CardMark;
  timing: CardMark;
  duration: CardMark;
  /** A painting where one exists, else the subject's icon on the deck's wash. */
  art: { painting: string } | { icon: string };
  voice?: string;
  /** Above the rule; `but` holds a Law's costs, under it. */
  equation: { rows: EqRow[]; but: EqRow[] };
  sentence: string;
};

// ── The corners: a closed vocabulary ─────────────────────────────────────────
// Five marks have no bronze icon yet (the study's "icons to draw"); each wears the
// closest existing one until it is drawn: the fate deck (events/die), a rival you pick
// (chrome/dossier), every realm (victory/demos), at once (unrest/alarm) and for good
// (unrest/locked).

const KIND = {
  fate: { icon: "events/die", label: "Kind: Fate" },
  law: { icon: "assembly/law", label: "Kind: Law" },
  directive: { icon: "assembly/directive", label: "Kind: Directive" },
  idea: { icon: "assembly/national-idea", label: "Kind: National Idea" },
} as const satisfies Record<Exclude<CardDeck, "year">, CardMark>;

const RIVAL = "chrome/dossier";
const EVERY = "victory/demos";

const REACH = {
  you: { icon: "settlements/seal", label: "Reach: You" },
  rival: { icon: RIVAL, label: "Reach: A rival you pick" },
  every: { icon: EVERY, label: "Reach: Every realm" },
} as const satisfies Record<string, CardMark>;

const TIMING = {
  now: { icon: "unrest/alarm", label: "Timing: At once" },
  sitting: { icon: "assembly/vote", label: "Timing: At the sitting, by vote" },
} as const satisfies Record<string, CardMark>;

const DURATION = {
  once: { text: "1×", label: "Duration: Once" },
  year: { icon: "events/year", label: "Duration: This year" },
  turn: { icon: "events/end-turn", label: "Duration: Next turn" },
  sitting: { icon: "assembly/agora", label: "Duration: Till the next sitting" },
  repeal: { icon: "assembly/stele", label: "Duration: Until repealed" },
  good: { icon: "unrest/locked", label: "Duration: For good" },
} as const satisfies Record<string, CardMark>;

/** Every icon a face can name, for the test that each resolves to a file. */
export function faceIcons(face: CardFace): string[] {
  const marks = [face.kind, face.reach, face.timing, face.duration];
  const tokens = [...face.equation.rows, ...face.equation.but].flatMap((row) => row.tokens);
  return [
    ...marks.flatMap((mark) => (mark.icon ? [mark.icon] : [])),
    ...("icon" in face.art ? [face.art.icon] : []),
    ...tokens.flatMap((token) => ("icon" in token ? [token.icon] : [])),
  ];
}

// ── The equation's grammar ──────────────────────────────────────────────────

const ic = (icon: string): EqToken => ({ icon });
const struck = (icon: string): EqToken => ({ icon, struck: true });
const n = (value: number | string): EqToken => ({ n: String(value) });
const signed = (value: number): EqToken => n(value > 0 ? `+${value}` : `−${Math.abs(value)}`);
const eq: EqToken = { op: "=" };
const to: EqToken = { op: "→" };
const or: EqToken = { op: "/" };
const cond = (text: string): EqToken => ({ cond: text });

/** A price after `=`: each resource's amount before its icon, in the frame's order; a
 *  free action reads `= 0`. */
function price(cost: Partial<Resources>): EqToken[] {
  const parts = RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0).flatMap(
    (resource) => [n(cost[resource]!), ic(RESOURCE_RASTERS[resource])],
  );
  return parts.length ? parts : [n(0)];
}

const SCOPE_ICONS = {
  city: ["settlements/city"],
  capital: ["settlements/capital"],
  colony: ["settlements/colony"],
  all: ["settlements/city", "settlements/colony"],
} as const;

/** What each zeroed term yields, beside the land or class that yields it. */
const YEAR_TERM_YIELDS: Record<YearTerm, Stat> = {
  plainsFood: "food",
  forestWood: "wood",
  mountainStone: "stone",
  freemenGold: "gold",
  citizenInfluence: "influence",
  luxuryHappiness: "happiness",
};

function unrestTokens(change: UnrestTokenChange): EqToken[] {
  return change === "placeOne"
    ? [n("+1"), ic("unrest/unrest")]
    : change === "clearOne"
      ? [n("−1"), ic("unrest/unrest")]
      : [ic("unrest/unrest"), eq, n(0)];
}

function toneOf(tone: EffectTone): EqRow["tone"] {
  return tone === "positive" ? "gain" : tone === "negative" ? "cost" : null;
}

const units = (cost: Partial<Resources>) =>
  Object.values(cost).reduce((sum, amount) => sum + (amount ?? 0), 0);

/** Whether a Law's price is dearer or cheaper than the action's own, read from the
 *  ruleset and the content: the one Law effect the shared presenter leaves neutral. */
function actionCostTone(
  effect: Extract<LawEffect, { type: "actionCost" }>,
  ruleset: Ruleset,
  content: GameContent,
): EqRow["tone"] {
  const base =
    effect.action === "buildBuilding"
      ? content.buildings.find((building) => building.id === effect.buildingIds?.[0])?.cost
      : effect.action === "growPop"
        ? effect.pop && effect.pop !== "citizens"
          ? ruleset.growPopCosts[effect.pop]
          : undefined
        : effect.action === "promotePop"
          ? effect.pop && effect.pop !== "citizens"
            ? ruleset.ladder.promoteCosts[effect.pop]
            : undefined
          : effect.action === "demotePop"
            ? effect.pop && effect.pop !== "slaves"
              ? ruleset.ladder.demoteCosts[effect.pop]
              : undefined
            : ruleset.actionCosts[effect.action];
  if (!base) return null;
  const change = units(effect.cost) - units(base);
  return change < 0 ? "gain" : change > 0 ? "cost" : null;
}

const ACTION_ICONS = {
  foundColony: "settlements/found",
  upgradeColonyToCity: "settlements/upgrade",
  buildBuilding: "buildings/build",
  growPop: "pops/pop-gain",
  promotePop: "pops/promote",
  demotePop: "pops/demote",
} as const;

/** A Law's or an Idea's effect as one row: the same typed effect the tooltip presents. */
function lawRow(effect: LawEffect, ruleset: Ruleset, content: GameContent): EqRow {
  const tone =
    effect.type === "actionCost"
      ? actionCostTone(effect, ruleset, content)
      : toneOf(presentLawEffect(effect, ruleset, content).tone);
  return { tone, tokens: lawTokens(effect, ruleset) };
}

function lawTokens(effect: LawEffect, ruleset: Ruleset): EqToken[] {
  switch (effect.type) {
    case "actionCost":
      return [
        ic(ACTION_ICONS[effect.action]),
        ...(effect.pop ? [ic(POP_RASTERS[effect.pop])] : []),
        ...(effect.buildingIds ?? []).map((id) => ic(BUILDING_RASTERS[id])),
        eq,
        ...price(effect.cost),
      ];
    case "calmPayment":
      return [
        ic("unrest/calm-verb"),
        eq,
        ...price({ [effect.resource]: effect.amount }),
        or,
        ...price({ influence: ruleset.civicCalm.influenceCost }),
      ];
    case "colonyCapacity":
      return [ic("settlements/colony"), ic("pops/capacity"), eq, n(effect.amount)];
    case "buildingFood":
      return [ic(BUILDING_RASTERS[effect.building]), signed(effect.amount), ic("resources/food")];
    case "happiness":
      return [signed(effect.amount), ic("resources/happiness")];
    case "settlementIncome":
      return [
        ...SCOPE_ICONS[effect.scope].map(ic),
        signed(effect.amount),
        ic(RESOURCE_RASTERS[effect.resource]),
        cond("a year"),
      ];
    case "onFoundColony":
      return [
        ic("settlements/found"),
        signed(effect.amount ?? 1),
        ic(POP_RASTERS[effect.grantPop]),
      ];
    case "realmIncome":
      return [signed(effect.amount), ic(RESOURCE_RASTERS[effect.resource]), cond("a year")];
    case "extraSlots":
      return [ic(SCOPE_ICONS[effect.scope][0]), signed(effect.amount), ic("settlements/slot")];
    case "colonyPieces":
      return [signed(effect.amount), ic("settlements/colony"), cond("piece")];
    case "acquirePop":
      return [
        n("+1"),
        ic(POP_RASTERS.slaves),
        or,
        ic(POP_RASTERS.freemen),
        to,
        ic("pops/capacity"),
        cond("once"),
      ];
    case "acquireResource":
      return [signed(effect.amount), ic(RESOURCE_RASTERS[effect.resource]), cond("once")];
    case "onUpgradeCity":
      return [ic("settlements/upgrade"), n("+1"), ic(POP_RASTERS[effect.grantPop])];
    case "dolePrice":
      return [
        ic("unrest/bread-dole"),
        n(ruleset.dole.food),
        ic("resources/food"),
        eq,
        n(effect.amount),
        ic("resources/influence"),
      ];
    case "slotExempt":
      return [ic(BUILDING_RASTERS[effect.building]), struck("settlements/slot")];
    case "votePurchaseLimit":
      return [ic("assembly/bribe"), eq, n(effect.amount), cond("a sitting")];
    case "popIncome":
      return [
        ic(POP_RASTERS[effect.pop]),
        ic(RESOURCE_RASTERS[effect.resource]),
        eq,
        n(effect.amount),
        ...(effect.scope ? [cond(effect.scope === "colony" ? "in colonies" : "in cities")] : []),
      ];
    case "slaveResource":
      return [
        ic(POP_RASTERS.slaves),
        eq,
        ic(RESOURCE_RASTERS[effect.resource]),
        cond("any terrain"),
      ];
    case "slaveUnrestWeight":
      return [ic(POP_RASTERS.slaves), n(`×${effect.amount}`), ic("unrest/unrest")];
    case "buildingForbidden":
      return [ic("buildings/build"), struck(BUILDING_RASTERS[effect.building])];
    case "buildingIdle":
      return [struck(BUILDING_RASTERS[effect.building]), cond("does nothing")];
    case "colonyBuildings":
      return [ic("settlements/colony"), signed(effect.amount), ic("settlements/slot")];
    case "colonyLimit":
      return [signed(effect.amount), ic("settlements/colony"), cond("piece")];
    case "growLimit":
      return effect.amount === 0
        ? [ic(SCOPE_ICONS[effect.scope][0]), struck("pops/pop-gain")]
        : [
            ic(SCOPE_ICONS[effect.scope][0]),
            ic("pops/pop-gain"),
            n(`×${effect.amount}`),
            cond("a turn"),
          ];
    case "settlementVotes":
      return [ic(SCOPE_ICONS[effect.scope][0]), signed(effect.amount), ic("assembly/vote")];
  }
}

/** A Directive's effect, aimed after `→` at the rival its author picks. Every row is
 *  the author's gain. */
function directiveTokens(effect: DirectiveEffect): EqToken[] {
  switch (effect.type) {
    case "resourceDelta":
      return [signed(effect.amount), ic(RESOURCE_RASTERS[effect.resource]), to, ic(RIVAL)];
    case "unrestTokens":
      return [...unrestTokens(effect.change), to, ic(RIVAL)];
    case "losePopFromLargest":
      return [signed(-effect.count), ic("pops/crowd"), to, ic(RIVAL), cond("largest settlement")];
    case "suppressIncome":
      return [
        ic("market/income-suppressed"),
        ...(effect.turns > 1 ? [n(`×${effect.turns}`)] : []),
        to,
        ic(RIVAL),
      ];
    case "repealNewestTargetLaw":
      return [ic("assembly/repeal"), ic("assembly/law"), to, ic(RIVAL), cond("newest")];
    case "equalVotesNextAssembly":
      return [ic("assembly/vote"), eq, n(1), to, ic(RIVAL)];
  }
}

/** Rows under the rule: a Law's costs sit under "but" when it also gives something. */
function split(rows: EqRow[]): CardFace["equation"] {
  const costs = rows.filter((row) => row.tone === "cost");
  const rest = rows.filter((row) => row.tone !== "cost");
  return costs.length && rest.some((row) => row.tone === "gain")
    ? { rows: rest, but: costs }
    : { rows, but: [] };
}

/** The first icon a reader meets: the subject on the plate until a painting exists. */
function subject(rows: EqRow[]): string {
  for (const token of rows[0]?.tokens ?? [])
    if ("icon" in token && !token.struck) return token.icon;
  return "assembly/law";
}

// ── A presenter per deck ────────────────────────────────────────────────────

/** A year card, its numeral in the kind corner. */
export function yearCardFace(card: YearCard, year: number, painting?: string): CardFace {
  const { effect } = card;
  const tone = toneOf(presentYearCard(card).tone);
  const row: EqRow =
    effect.type === "zeroTerm"
      ? {
          tone,
          tokens: [
            ic(YEAR_TERM_RASTERS[effect.term]),
            ic(RESOURCE_RASTERS[YEAR_TERM_YIELDS[effect.term]]),
            eq,
            n(0),
          ],
        }
      : { tone, tokens: [...unrestTokens(effect.change), to, ic(EVERY)] };
  return {
    deck: "year",
    name: card.name,
    band: "Year",
    kind: { text: toRoman(year), label: `Year deck: Year ${toRoman(year)}` },
    reach: REACH.every,
    timing: TIMING.now,
    duration: effect.type === "zeroTerm" ? DURATION.year : DURATION.once,
    art: painting ? { painting } : { icon: yearCardIcon(card) },
    voice: card.flavor,
    equation: { rows: [row], but: [] },
    sentence: card.text,
  };
}

function fateRow(effect: EventEffect): EqRow {
  const tone = toneOf(presentEventEffect(effect).tone);
  switch (effect.type) {
    case "resourceDelta":
      return { tone, tokens: [signed(effect.amount), ic(RESOURCE_RASTERS[effect.resource])] };
    case "addPops":
      return {
        tone,
        tokens: [signed(effect.amount), ic(POP_RASTERS[effect.pop]), to, ic("pops/capacity")],
      };
    case "unrestTokens":
      return { tone, tokens: unrestTokens(effect.change) };
  }
}

/** A fate: a seat's own card at the start of its turn. */
export function fateCardFace(card: EventCard, painting?: string): CardFace {
  const rows = card.effects.map(fateRow);
  return {
    deck: "fate",
    name: card.name,
    band: "Fate",
    kind: KIND.fate,
    reach: REACH.you,
    timing: TIMING.now,
    duration: DURATION.once,
    art: painting ? { painting } : { icon: subject(rows) },
    voice: card.flavor,
    equation: split(rows),
    sentence: card.text,
  };
}

/** A Law or a Directive, its politician on the band. */
export function resolutionCardFace(
  card: ResolutionCard,
  ruleset: Ruleset,
  content: GameContent,
): CardFace {
  const rows =
    card.kind === "law"
      ? card.effects.map((effect) => lawRow(effect, ruleset, content))
      : card.effects.map((effect) => ({ tone: "gain" as const, tokens: directiveTokens(effect) }));
  const lasts =
    card.kind === "law"
      ? DURATION.repeal
      : card.effects.some((effect) => effect.type === "suppressIncome")
        ? DURATION.turn
        : card.effects.some((effect) => effect.type === "equalVotesNextAssembly")
          ? DURATION.sitting
          : DURATION.once;
  return {
    deck: card.kind,
    name: card.name,
    band: POLITICIANS.find((politician) => politician.id === card.politician)?.name ?? card.kind,
    kind: KIND[card.kind],
    reach: card.kind === "law" ? REACH.every : REACH.rival,
    timing: TIMING.sitting,
    duration: lasts,
    art: { icon: subject(rows) },
    equation: split(rows),
    sentence: card.text,
  };
}

/** A National Idea: yours, at once, for good. */
export function ideaCardFace(
  idea: NationalIdeaDefinition,
  ruleset: Ruleset,
  content: GameContent,
): CardFace {
  return {
    deck: "idea",
    name: idea.name,
    band: "Idea",
    kind: KIND.idea,
    reach: REACH.you,
    timing: TIMING.now,
    duration: DURATION.good,
    art: { icon: IDEA_RASTERS[idea.id] },
    equation: split(idea.effects.map((effect) => lawRow(effect, ruleset, content))),
    sentence: idea.text,
  };
}

// ── The deck line ───────────────────────────────────────────────────────────

/** What the table may know of a deck, said under its drawn card. */
export type DeckLine = {
  /** The deck's name for the accessible line: "Year deck", "Fates". */
  name: string;
  left: number;
  total: number;
  /** What is left of each kind: the year deck on the line, the fates on hover. */
  kinds: Array<{ id: string; name: string; icon: string; left: number }>;
};

/**
 * The one selector that knows what each deck makes public. The year deck's and the
 * fates' make-up is public and every card turns face up, so what is left of each kind
 * is the authored count less the cards turned (the discards, the year's card, a fate
 * still in hand). The order and the next card stay hidden, as the projection keeps
 * them. An Assembly draw's deck is its politician's; its make-up is public, its draw
 * private until the ballot, so the line says only how many are left.
 */
export function deckLine(
  G: HegemonyState,
  deck: { kind: "year" } | { kind: "fate" } | { kind: "politician"; politician: PoliticianId },
): DeckLine {
  const content = G.definition.content;
  if (deck.kind === "politician") {
    const { politician } = deck;
    const total = content.resolutions.filter((card) => card.politician === politician).length;
    const name = POLITICIANS.find((candidate) => candidate.id === politician)?.name;
    return {
      name: `${name ?? "The politician"}’s deck`,
      left: G.politicianDecks[politician].length,
      total,
      kinds: [],
    };
  }
  const year = deck.kind === "year";
  const cards: Array<YearCard | EventCard> = year ? content.yearCards : content.playerEvents;
  const turned: Array<{ id: string }> = year
    ? [...G.yearDiscardPile, ...(G.activeYearCard ? [G.activeYearCard] : [])]
    : [...G.playerDiscardPile, ...(G.pendingPlayerEvent ? [G.pendingPlayerEvent.card] : [])];
  const kinds = cards.map((card) => ({
    id: card.id,
    name: card.name,
    icon: "effect" in card ? yearCardIcon(card) : subject(card.effects.map(fateRow)),
    left: card.count - turned.filter((seen) => seen.id === card.id).length,
  }));
  return {
    name: year ? "Year deck" : "Fates",
    left: year ? G.yearDrawPile.length : G.playerDrawPile.length,
    total: cards.reduce((sum, card) => sum + card.count, 0),
    kinds,
  };
}
