import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { POLITICIANS } from "../game/assembly/deck";
import { getAuthoredGameContent } from "../game/content";
import { capitalize } from "../game/core/format";
import type { Stat } from "../game/types";
import { VICTORY_CARDS } from "../game/victory";
import { resourceCssVars } from "../ui/resourceVisuals";
import { useCodexLink, type CodexLink } from "./codexLink";
import {
  BUILDING_RASTERS,
  IDEA_RASTERS,
  LUXURY_RASTER,
  POP_RASTERS,
  RESOURCE_RASTERS,
} from "../ui/iconRegistry";
import { rasterIcon } from "../ui/icons/placeholders";

/**
 * Renders free text with the icon of every game term it names leading the word —
 * "gain 3 Food" reads "gain 3 🌾Food", "Tyrian Dye" reads "💎Tyrian Dye". Every
 * sentence a player reads goes through here (`AnnotatedText` for a string, `Prose`
 * for a run of JSX), so a glance carries the same information as a read on every
 * surface, and a term that gets a picture gets it everywhere at once.
 */

type Term = {
  /** A raster path (`family/name`); null for a term that only links to its chapter. */
  icon: string | null;
  /** The rulebook chapter (rulebook.tsx id) the term opens. */
  chapter: string;
  /** A resource word takes its resource's colour. */
  resource?: Stat;
};

const term = (icon: string | null, chapter: string): Term => ({ icon, chapter });

/** The singular and plural spelling of one term. */
function both(singular: string, plural: string, value: Term): Record<string, Term> {
  return { [singular]: value, [plural]: value };
}

/**
 * The vocabulary, matched whatever its case and Title-Cased on screen. A word joins
 * only when it means the same thing in every sentence the game writes: "income" stays
 * out because it rides beside a resource in nearly every line, and "year", "card",
 * "event" and "settlement" only link (no one picture is right for them), so where links
 * are off they stay plain words.
 */
const VOCABULARY: Record<string, Term> = {
  ...Object.fromEntries(
    Object.entries(RESOURCE_RASTERS).map(([resource, icon]) => [
      resource,
      { icon, chapter: "resources", resource: resource as Stat },
    ]),
  ),
  ...both("citizen", "citizens", term(POP_RASTERS.citizens, "population")),
  ...both("freeman", "freemen", term(POP_RASTERS.freemen, "population")),
  ...both("slave", "slaves", term(POP_RASTERS.slaves, "population")),
  ...both("pop", "pops", term("pops/crowd", "population")),
  promote: term("pops/promote", "ladder"),
  demote: term("pops/demote", "ladder"),
  ...both("building", "buildings", term("buildings/build", "buildings")),
  ...both("marketplace", "marketplaces", term(BUILDING_RASTERS.marketplace, "buildings")),
  ...both("temple", "temples", term(BUILDING_RASTERS.temple, "buildings")),
  ...both("estate", "estates", term(BUILDING_RASTERS.estate, "buildings")),
  ...both("granary", "granaries", term(BUILDING_RASTERS.granary, "buildings")),
  ...both("forum", "forums", term(BUILDING_RASTERS.forum, "buildings")),
  ...both("port", "ports", term(BUILDING_RASTERS.port, "buildings")),
  ...both("capital", "capitals", term("settlements/capital", "settlements")),
  metropolis: term("settlements/capital", "settlements"),
  ...both("city", "cities", term("settlements/city", "settlements")),
  ...both("colony", "colonies", term("settlements/colony", "settlements")),
  ...both("settlement", "settlements", term(null, "settlements")),
  ...both("slot", "slots", term("settlements/slot", "settlements")),
  plains: term("terrain/plains", "board"),
  ...both("forest", "forests", term("terrain/forest", "board")),
  ...both("hill", "hills", term("terrain/hill", "board")),
  ...both("mountain", "mountains", term("terrain/mountain", "board")),
  oracle: term("terrain/oracle", "board"),
  ...both("luxury", "luxuries", term(LUXURY_RASTER, "luxuries")),
  unrest: term("unrest/unrest", "unrest"),
  ...both("unrest token", "unrest tokens", term("unrest/unrest", "unrest")),
  discontent: term("unrest/discontent", "unrest"),
  ...both("riot", "riots", term("unrest/riot", "unrest")),
  ...both("revolt", "revolts", term("unrest/revolt", "unrest")),
  calm: term("unrest/calm-verb", "unrest"),
  hunger: term("unrest/starvation", "resources"),
  ...both("title", "titles", term("victory/laurel", "victory")),
  victory: term("victory/laurel", "victory"),
  ...both("idea", "ideas", term("assembly/national-idea", "ideas")),
  ...both("national idea", "national ideas", term("assembly/national-idea", "ideas")),
  trade: term("market/handshake", "trade"),
  dole: term("unrest/bread-dole", "trade"),
  bank: term(null, "trade"),
  ...both("card", "cards", term(null, "years")),
  ...both("event", "events", term(null, "years")),
  ...both("year", "years", term(null, "years")),
  ...both("venture", "ventures", term("events/venture", "ventures")),
  ...both("expedition", "expeditions", term("events/venture", "ventures")),
  // The Assembly's vocabulary. Card text, the chronicle and the Agora page all lean
  // on these nouns, and every one of them is a rule a player will want to look up
  // mid-vote — which is exactly when leaving the game to find it is worst.
  assembly: term("assembly/agora", "assembly"),
  agora: term("assembly/agora", "assembly"),
  ...both("politician", "politicians", term("assembly/politician", "assembly")),
  ...both("resolution", "resolutions", term(null, "assembly")),
  ...both("law", "laws", term("assembly/law", "assembly")),
  ...both("directive", "directives", term("assembly/directive", "assembly")),
  ...both("stele", "stelae", term("assembly/stele", "assembly")),
  ...both("vote", "votes", term("assembly/vote", "assembly")),
  repeal: term("assembly/repeal", "assembly"),
  patron: term(null, "assembly"),
  patronage: term(null, "assembly"),
};

/** Longer words first so "citizens" wins over "citizen", "unrest tokens" over "unrest". */
const VOCABULARY_PATTERN = new RegExp(
  `\\b(${Object.keys(VOCABULARY)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi",
);

const content = getAuthoredGameContent();

/**
 * Names that ARE game terms, matched verbatim (case included) and shown as written:
 * the luxury goods, the titles (full and short) and the National Ideas.
 */
const NAMED_TERMS: Record<string, Term> = {
  ...Object.fromEntries(
    content.luxuryGoods.map((good) => [good.name, term(LUXURY_RASTER, "luxuries")]),
  ),
  ...Object.fromEntries(
    VICTORY_CARDS.flatMap((card) =>
      [card.name, card.shortName]
        .filter((name): name is string => Boolean(name))
        .map((name) => [name, term(`victory/${card.id}`, "victory")]),
    ),
  ),
  ...Object.fromEntries(
    content.nationalIdeas.map((idea) => [idea.name, term(IDEA_RASTERS[idea.id], "ideas")]),
  ),
};

/**
 * Titles the annotator must read as names, not as vocabulary.
 *
 * The tokeniser matches a WORD. It has no idea whether that word is doing its
 * own job or standing inside somebody's name, so the chronicle line "Theron
 * resolved Granary Rats: -3 Food" drew the **granary building** glyph beside a
 * card about vermin — a structure you can build, pictured next to a misfortune
 * that has nothing to do with it. Wrong information, not noise.
 *
 * The fix is a closed list rather than a guess. Every title the game ships is
 * authored right here in the content package, so the exact strings are known;
 * matching them verbatim (case included) needs no capitalisation heuristic,
 * which would have misfired on every sentence start and every player name.
 *
 * Card titles are protected even when a title is also a glossary term, such as
 * Patronage. Buildings that name the glossary term itself still get their glyph.
 *
 * Derived at module load, so authoring a new card extends the list for free —
 * and `AnnotatedText.test.tsx` walks every authored name to prove it.
 */
const PROPER_NAMES: string[] = [
  ...content.buildings,
  ...content.yearCards,
  ...content.playerEvents,
  ...content.resolutions,
  ...POLITICIANS,
  content.riotTable,
  ...content.expeditionTables,
]
  .map((authored) => authored.name)
  .filter((name) => {
    VOCABULARY_PATTERN.lastIndex = 0;
    return (
      VOCABULARY_PATTERN.test(name) &&
      (!(name.toLowerCase() in VOCABULARY) ||
        content.playerEvents.some((card) => card.name === name))
    );
  });

function escapeRegExp(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest name first, so "Granary Surplus" is not shadowed by a shorter one. */
const NAME_PATTERN = new RegExp(
  `\\b(?:${[...PROPER_NAMES, ...Object.keys(NAMED_TERMS)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})\\b`,
  "g",
);

/**
 * The icon leads, the word follows: "-1 ⬮ Gold", not "-1 Gold ⬮".
 *
 * It used to trail, and the effect of that was that the fastest thing to read —
 * the picture — sat on the far side of the slowest. Reading a cost meant taking
 * the numeral, then the word, then the glyph that had already said what the word
 * said. Leading puts the glyph next to the digits it belongs to, which is the
 * order the eye wants and the order every strategy game in this genre uses.
 */
function termIcon(term: Term) {
  const src = term.icon ? rasterIcon(term.icon) : undefined;

  return src ? (
    <img alt="" aria-hidden className="icon icon-inline richIcon" draggable={false} src={src} />
  ) : null;
}

export function AnnotatedText({
  text,
  className,
  links = true,
  linkContext,
}: {
  text: string;
  className?: string;
  links?: boolean;
  /** Identifies repeated glossary controls when several cards share a term. */
  linkContext?: string;
}) {
  const contextCodexLink = useCodexLink();
  const codexLink = links ? contextCodexLink : null;

  return <span className={className}>{annotate(text, codexLink, linkContext)}</span>;
}

/**
 * The annotator over a run of JSX: every string inside it, however deep in plain
 * elements (`<b>`, `<em>`, a fragment), is annotated in place. Components are left
 * whole — they draw their own text.
 */
export function Prose({ children, links = true }: { children: ReactNode; links?: boolean }) {
  const contextCodexLink = useCodexLink();
  const codexLink = links ? contextCodexLink : null;

  return <>{annotateNode(children, codexLink)}</>;
}

function annotateNode(node: ReactNode, codexLink: CodexLink | null): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === "string") return annotate(child, codexLink);
    if (!isValidElement(child) || typeof child.type !== "string") return child;
    const element = child as ReactElement<{ children?: ReactNode }>;
    return element.props.children === undefined
      ? element
      : cloneElement(element, undefined, annotateNode(element.props.children, codexLink));
  });
}

function annotate(text: string, codexLink: CodexLink | null, linkContext?: string): ReactNode[] {
  const nodes: ReactNode[] = [];

  // Names are lifted out FIRST: a card's title passes through untouched, a named
  // term (a luxury good, a title, an Idea) takes its icon as written. Only what is
  // left between them is vocabulary the tokeniser may annotate.
  let cursor = 0;
  let name: RegExpExecArray | null;

  NAME_PATTERN.lastIndex = 0;
  while ((name = NAME_PATTERN.exec(text)) !== null) {
    annotateInto(nodes, text.slice(cursor, name.index), cursor, codexLink, linkContext);
    const named = NAMED_TERMS[name[0]];
    nodes.push(
      named
        ? termNode(named, name[0], `${name.index}-${name[0]}`, codexLink, linkContext)
        : name[0],
    );
    cursor = name.index + name[0].length;
  }

  annotateInto(nodes, text.slice(cursor), cursor, codexLink, linkContext);

  return nodes.map(signPlainText);
}

/** The tokenising pass, run over one stretch of text that holds no name. */
function annotateInto(
  nodes: ReactNode[],
  text: string,
  offset: number,
  codexLink: CodexLink | null,
  linkContext?: string,
) {
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  VOCABULARY_PATTERN.lastIndex = 0;

  while ((match = VOCABULARY_PATTERN.exec(text)) !== null) {
    const word = match[0];
    const term = VOCABULARY[word.toLowerCase()];

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    // A term with neither a picture nor a link to give is just its word.
    if (!term.icon && !codexLink) {
      nodes.push(word);
      lastIndex = match.index + word.length;
      continue;
    }

    // Terminology is a proper noun (RPG style): Title-Case it however the source
    // wrote it — "gain 3 freemen" reads "gain 3 Freemen".
    nodes.push(
      termNode(
        term,
        word.replace(/\S+/g, capitalize),
        `${offset + match.index}-${word}`,
        codexLink,
        linkContext,
      ),
    );

    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
}

function termNode(
  term: Term,
  label: string,
  key: string,
  codexLink: CodexLink | null,
  linkContext?: string,
) {
  const style = term.resource ? resourceCssVars(term.resource) : undefined;

  // With a Codex link in context, the term IS the link — one shared keyword colour
  // (CSS) invites the click, and it opens the rulebook at the term's chapter. Rendered
  // as a role=button SPAN, not a <button>: prose often sits INSIDE a button (a build
  // candidate's benefit text), and a nested <button> is invalid HTML. stopPropagation
  // keeps the term's click from also firing that outer button. Without a link it stays
  // a plain (still Title-Cased) chip — tooltips, isolation, tests.
  return codexLink ? (
    <span
      className="richToken richTokenLink"
      key={key}
      role="button"
      aria-label={linkContext ? `${label} rules for ${linkContext}` : undefined}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        codexLink.openCodexTo(term.chapter);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          codexLink.openCodexTo(term.chapter);
        }
      }}
      style={style}
      title={`Open the rulebook: ${label}`}
    >
      {termIcon(term)}
      {label}
    </span>
  ) : (
    <span className="richToken" key={key} style={style}>
      {termIcon(term)}
      {label}
    </span>
  );
}

/**
 * A signed number, coloured by its sign.
 *
 * The chronicle's whole job is telling you whether the last thing that happened
 * was good or bad, and it was printing "+9 gold" and "-5 wood" in identical ink.
 * This is the last step of the same tokenising pass, applied only to the PLAIN
 * text between tokens — the resource chips keep their own colour, which says
 * WHAT, while the sign says whether.
 *
 * The sign always travels with the colour. `+9` in olive and `-5` in oxblood are
 * legible to a colour-blind player because the glyph in front of the digits
 * already carries the whole meaning; the colour is a second, faster channel.
 */
const SIGNED_NUMBER = /([+−-]\d+(?:\.\d+)?)/g;
/** The same pattern, anchored and NOT global: `test` on a /g regex advances its
 *  own lastIndex, so reusing SIGNED_NUMBER for the per-part check would match
 *  every other number and silently drop the rest. */
const IS_SIGNED_NUMBER = /^[+−-]\d+(?:\.\d+)?$/;

function signPlainText(node: ReactNode, index: number): ReactNode {
  if (typeof node !== "string") {
    return node;
  }

  const parts = node.split(SIGNED_NUMBER);

  if (parts.length === 1) {
    return node;
  }

  return (
    <span key={`signed-${index}`}>
      {parts.map((part, partIndex) =>
        IS_SIGNED_NUMBER.test(part) ? (
          <b className={part.startsWith("+") ? "pos num" : "neg num"} key={partIndex}>
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </span>
  );
}
