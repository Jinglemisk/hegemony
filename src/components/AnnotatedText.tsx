import type { ReactNode } from "react";
import type { BuildingId, PopType, Resource, SettlementKind } from "../game/types";
import { resourceCssVars } from "../ui/resourceVisuals";
import { useCodexLink } from "./codexLink";
import { AtlasIcon, ResourceIcon } from "./Sprites";

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
  // Concept terms have no glyph in the atlas — they carry their rulebook chapter directly.
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
  // Settlements — their own atlas glyph, link to the Settlements chapter.
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
  agora: { type: "concept", chapter: "assembly" }
};

// Longer words first so "citizens" wins over "citizen", etc.
const TOKEN_PATTERN = new RegExp(
  `\\b(${Object.keys(TOKEN_MAP)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi"
);

function tokenIcon(token: Token) {
  if (token.type === "concept") {
    return null;
  }

  if (token.type === "resource") {
    return <ResourceIcon resource={token.key} className="richIcon" />;
  }

  // AtlasIcon's key space covers pops, buildings and settlement kinds.
  return <AtlasIcon icon={token.key} className="richIcon" />;
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

export function AnnotatedText({ text, className }: { text: string; className?: string }) {
  const codexLink = useCodexLink();
  const nodes: ReactNode[] = [];
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
    const key = `${match.index}-${word}`;
    // Terminology is a proper noun (RPG style): Title-Case it however the source
    // wrote it — "gain 3 freemen" reads "gain 3 Freemen".
    const label = word.charAt(0).toUpperCase() + word.slice(1);

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
      )
    );

    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
}
