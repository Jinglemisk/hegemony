import type { ReactNode } from "react";
import { POLITICIANS } from "../game/assembly/deck";
import { getAuthoredGameContent } from "../game/content";
import { capitalize } from "../game/core/format";
import type { BuildingId, PopType, Resource, SettlementKind } from "../game/types";
import { resourceCssVars } from "../ui/resourceVisuals";
import { useCodexLink, type CodexLink } from "./codexLink";
import {
  BUILDING_GLYPHS,
  POP_GLYPHS,
  RESOURCE_GLYPHS,
  SETTLEMENT_GLYPHS,
} from "../ui/iconRegistry";
import { Icon } from "../ui/icons/Icon";
import type { GlyphId } from "../ui/icons/glyphs";

/**
 * Renders free text with a small icon appended to every resource, pop, or
 * building it names — so "gain 3 Food" reads "gain 3 Food🌾" and "add 1 Freeman"
 * reads "add 1 Freeman👤". Used anywhere card/effect prose appears (event cards,
 * modals, the chronicle) so a glance carries the same information as a read.
 */

type Token =
  | { type: "resource"; key: Resource }
  | { type: "pop"; key: PopType }
  | { type: "building"; key: BuildingId }
  | { type: "settlement"; key: SettlementKind }
  // Concept terms have no glyph at all — they carry their rulebook chapter directly.
  | { type: "concept"; chapter: string };

const TOKEN_MAP: Record<string, Token> = {
  wood: { type: "resource", key: "wood" },
  stone: { type: "resource", key: "stone" },
  gold: { type: "resource", key: "gold" },
  food: { type: "resource", key: "food" },
  influence: { type: "resource", key: "influence" },
  happiness: { type: "resource", key: "happiness" },
  citizen: { type: "pop", key: "citizens" },
  citizens: { type: "pop", key: "citizens" },
  freeman: { type: "pop", key: "freemen" },
  freemen: { type: "pop", key: "freemen" },
  slave: { type: "pop", key: "slaves" },
  slaves: { type: "pop", key: "slaves" },
  // Generic pops get the roster's population glyph; a generic "building" reads as
  // the workshop (tools) — both so table rows and chronicle lines can be chip-only.
  pop: { type: "pop", key: "citizens" },
  pops: { type: "pop", key: "citizens" },
  building: { type: "building", key: "workshop" },
  buildings: { type: "building", key: "workshop" },
  marketplace: { type: "building", key: "marketplace" },
  marketplaces: { type: "building", key: "marketplace" },
  temple: { type: "building", key: "temple" },
  temples: { type: "building", key: "temple" },
  workshop: { type: "building", key: "workshop" },
  workshops: { type: "building", key: "workshop" },
  granary: { type: "building", key: "granary" },
  granaries: { type: "building", key: "granary" },
  forum: { type: "building", key: "forum" },
  forums: { type: "building", key: "forum" },
  aqueduct: { type: "building", key: "aqueduct" },
  aqueducts: { type: "building", key: "aqueduct" },
  odeon: { type: "building", key: "odeon" },
  odeons: { type: "building", key: "odeon" },
  villa: { type: "building", key: "villa" },
  villas: { type: "building", key: "villa" },
  gymnasion: { type: "building", key: "gymnasion" },
  gymnasions: { type: "building", key: "gymnasion" },
  // Settlements — their own glyph, link to the Settlements chapter.
  capital: { type: "settlement", key: "capital" },
  capitals: { type: "settlement", key: "capital" },
  metropolis: { type: "settlement", key: "capital" },
  city: { type: "settlement", key: "city" },
  cities: { type: "settlement", key: "city" },
  colony: { type: "settlement", key: "colony" },
  colonies: { type: "settlement", key: "colony" },
  settlement: { type: "settlement", key: "city" },
  settlements: { type: "settlement", key: "city" },
  // Concept terms — no glyph, just a clay keyword that opens its chapter.
  card: { type: "concept", chapter: "seasons" },
  cards: { type: "concept", chapter: "seasons" },
  event: { type: "concept", chapter: "seasons" },
  events: { type: "concept", chapter: "seasons" },
  season: { type: "concept", chapter: "seasons" },
  seasons: { type: "concept", chapter: "seasons" },
  omen: { type: "concept", chapter: "seasons" },
  omens: { type: "concept", chapter: "seasons" },
  venture: { type: "concept", chapter: "ventures" },
  ventures: { type: "concept", chapter: "ventures" },
  expedition: { type: "concept", chapter: "ventures" },
  expeditions: { type: "concept", chapter: "ventures" },
  riot: { type: "concept", chapter: "unrest" },
  riots: { type: "concept", chapter: "unrest" },
  revolt: { type: "concept", chapter: "unrest" },
  unrest: { type: "concept", chapter: "unrest" },
  victory: { type: "concept", chapter: "victory" },
  bank: { type: "concept", chapter: "bank" },
  // The Assembly's vocabulary. Card text, the chronicle and the Agora page all lean
  // on these nouns, and every one of them is a rule a player will want to look up
  // mid-vote — which is exactly when leaving the game to find it is worst.
  assembly: { type: "concept", chapter: "assembly" },
  politician: { type: "concept", chapter: "assembly" },
  politicians: { type: "concept", chapter: "assembly" },
  resolution: { type: "concept", chapter: "assembly" },
  resolutions: { type: "concept", chapter: "assembly" },
  law: { type: "concept", chapter: "assembly" },
  laws: { type: "concept", chapter: "assembly" },
  directive: { type: "concept", chapter: "assembly" },
  directives: { type: "concept", chapter: "assembly" },
  stele: { type: "concept", chapter: "assembly" },
  stelae: { type: "concept", chapter: "assembly" },
  patron: { type: "concept", chapter: "assembly" },
  patronage: { type: "concept", chapter: "assembly" },
  repeal: { type: "concept", chapter: "assembly" },
  veto: { type: "concept", chapter: "assembly" },
  agora: { type: "concept", chapter: "assembly" },
};

// Longer words first so "citizens" wins over "citizen", etc.
const TOKEN_PATTERN = new RegExp(
  `\\b(${Object.keys(TOKEN_MAP)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi",
);

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
 * Two filters keep the list honest, and both matter:
 *
 * · Only titles that a term can actually collide with are listed — a name the
 *   tokeniser never matches has nothing to protect.
 * · A title that IS the term is left alone. "Ada built Granary." names the
 *   granary and means the granary, so the glyph there is right; only a compound
 *   like "Granary Rats", where the word no longer denotes the thing, is muted.
 *
 * Derived at module load, so authoring a new card extends the list for free —
 * and `AnnotatedText.test.tsx` walks every authored name to prove it.
 */
const PROPER_NAMES: string[] = (() => {
  const content = getAuthoredGameContent();

  return [
    ...content.buildings,
    ...content.seasonalEvents,
    ...content.playerEvents,
    ...content.resolutions,
    ...POLITICIANS,
    content.riotTable,
    content.omenTable,
    ...content.expeditionTables,
  ]
    .map((authored) => authored.name)
    .filter((name) => {
      TOKEN_PATTERN.lastIndex = 0;
      return TOKEN_PATTERN.test(name) && !(name.toLowerCase() in TOKEN_MAP);
    })
    .sort((a, b) => b.length - a.length);
})();

function escapeRegExp(literal: string) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest title first, so "Granary Surplus" is not shadowed by a shorter name. */
const PROPER_NAME_PATTERN = PROPER_NAMES.length
  ? new RegExp(`\\b(?:${PROPER_NAMES.map(escapeRegExp).join("|")})\\b`, "g")
  : null;

function tokenGlyph(token: Token): GlyphId | null {
  switch (token.type) {
    case "concept":
      return null;
    case "resource":
      return RESOURCE_GLYPHS[token.key];
    case "pop":
      return POP_GLYPHS[token.key];
    case "building":
      return BUILDING_GLYPHS[token.key];
    case "settlement":
      return SETTLEMENT_GLYPHS[token.key];
  }
}

function tokenIcon(token: Token) {
  const glyph = tokenGlyph(token);

  return glyph ? <Icon glyph={glyph} className="richIcon" /> : null;
}

/** The rulebook chapter (rulebook.tsx id) a token deep-links to. */
function tokenChapter(token: Token): string {
  switch (token.type) {
    case "resource":
      return "resources";
    case "pop":
      return "population";
    case "building":
      return "buildings";
    case "settlement":
      return "settlements";
    case "concept":
      return token.chapter;
  }
}

export function AnnotatedText({
  text,
  className,
  links = true,
}: {
  text: string;
  className?: string;
  links?: boolean;
}) {
  const contextCodexLink = useCodexLink();
  const codexLink = links ? contextCodexLink : null;
  const nodes: ReactNode[] = [];

  // Titles are lifted out FIRST and passed through untouched; only what is left
  // between them is vocabulary the tokeniser may annotate.
  let cursor = 0;

  if (PROPER_NAME_PATTERN) {
    PROPER_NAME_PATTERN.lastIndex = 0;
    let name: RegExpExecArray | null;

    while ((name = PROPER_NAME_PATTERN.exec(text)) !== null) {
      annotateInto(nodes, text.slice(cursor, name.index), cursor, codexLink);
      nodes.push(name[0]);
      cursor = name.index + name[0].length;
    }
  }

  annotateInto(nodes, text.slice(cursor), cursor, codexLink);

  return <span className={className}>{nodes.map(signPlainText)}</span>;
}

/** The tokenising pass, run over one stretch of text that holds no title. */
function annotateInto(
  nodes: ReactNode[],
  text: string,
  offset: number,
  codexLink: CodexLink | null,
) {
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_PATTERN.lastIndex = 0;

  while ((match = TOKEN_PATTERN.exec(text)) !== null) {
    const word = match[0];
    const token = TOKEN_MAP[word.toLowerCase()];

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const style = token.type === "resource" ? resourceCssVars(token.key) : undefined;
    const key = `${offset + match.index}-${word}`;
    // Terminology is a proper noun (RPG style): Title-Case it however the source
    // wrote it — "gain 3 freemen" reads "gain 3 Freemen".
    const label = capitalize(word);

    // With a Codex link in context, the term IS the link — one shared keyword colour
    // (CSS) invites the click, and it opens the rulebook at the term's chapter. Rendered
    // as a role=button SPAN, not a <button>: prose often sits INSIDE a button (a build
    // candidate's benefit text), and a nested <button> is invalid HTML. stopPropagation
    // keeps the term's click from also firing that outer button. Without a link it stays
    // a plain (still Title-Cased) chip — isolation / tests.
    nodes.push(
      codexLink ? (
        <span
          className="richToken richTokenLink"
          key={key}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            codexLink.openCodexTo(tokenChapter(token));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              codexLink.openCodexTo(tokenChapter(token));
            }
          }}
          style={style}
          title={`Open the rulebook: ${label}`}
        >
          {label}
          {tokenIcon(token)}
        </span>
      ) : (
        <span className="richToken" key={key} style={style}>
          {label}
          {tokenIcon(token)}
        </span>
      ),
    );

    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
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
const SIGNED_NUMBER = /([+\u2212-]\d+(?:\.\d+)?)/g;
/** The same pattern, anchored and NOT global: `test` on a /g regex advances its
 *  own lastIndex, so reusing SIGNED_NUMBER for the per-part check would match
 *  every other number and silently drop the rest. */
const IS_SIGNED_NUMBER = /^[+\u2212-]\d+(?:\.\d+)?$/;

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
