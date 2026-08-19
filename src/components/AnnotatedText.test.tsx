import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnnotatedText } from "./AnnotatedText";
import { CodexLinkProvider } from "./codexLink";
import { POLITICIANS } from "../game/assembly/deck";
import { getAuthoredGameContent } from "../game/content";

/**
 * The annotator matches a WORD, and the chronicle hands it whole sentences with
 * card names sitting inside them — so "Theron resolved Granary Rats: -3 Food"
 * drew the granary BUILDING glyph beside a card about vermin.
 *
 * This walks every title the game ships, because that failure returns silently
 * the moment someone authors a card called "Temple Fire" or "Colony Levy". It
 * costs a few milliseconds and it holds forever.
 */

const content = getAuthoredGameContent();

const AUTHORED_NAMES = [
  ...content.buildings,
  ...content.seasonalEvents,
  ...content.playerEvents,
  ...content.resolutions,
  ...POLITICIANS,
  content.riotTable,
  content.omenTable,
  ...content.expeditionTables,
].map((authored) => authored.name);

/**
 * The titles that ARE the term they contain. "Ada built Granary." names the
 * granary and means the granary, so the glyph there is right — the annotation
 * only misleads in a compound like "Granary Rats", where the word has stopped
 * denoting the thing. A new single-word title matching a glossary word belongs
 * here; anything else failing below is a real mis-annotation.
 */
const NAME_IS_THE_TERM = new Set([
  "Marketplace",
  "Temple",
  "Workshop",
  "Granary",
  "Forum",
  "Aqueduct",
  "Odeon",
  "Villa",
  "Gymnasion",
  "Riot",
]);

/** React escapes the text it renders; "Colonists' Voyage" arrives as an entity. */
function escaped(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

describe("AnnotatedText", () => {
  it("annotates the vocabulary around a card name", () => {
    const markup = renderToStaticMarkup(
      <AnnotatedText links={false} text="Theron resolved Granary Rats: -3 food." />,
    );

    // The title survives whole — no glyph, no chip, no capitalisation of its words.
    expect(markup).toContain("Theron resolved Granary Rats");
    // The sentence's own noun is still annotated, right beside it.
    expect(markup).toContain("Food");
    expect(markup).toContain("richToken");
  });

  it("leaves every authored title unannotated", () => {
    const offenders: string[] = [];

    for (const name of AUTHORED_NAMES) {
      if (NAME_IS_THE_TERM.has(name)) {
        continue;
      }

      // A log line's shape: the title sits mid-sentence, with real vocabulary after it.
      const markup = renderToStaticMarkup(
        <AnnotatedText links={false} text={`Theron resolved ${name}: -3 food.`} />,
      );

      // Annotating a word inside the title would wrap it in a span and break the run.
      if (!markup.includes(`Theron resolved ${escaped(name)}`)) {
        offenders.push(name);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("renders no interactive control when links are off", () => {
    const markup = renderToStaticMarkup(
      <CodexLinkProvider value={{ openCodexTo: () => undefined }}>
        <AnnotatedText links={false} text="Damon resolved Warehouse Fire: -5 wood." />
      </CodexLinkProvider>,
    );

    // The ticker and the chronicle share this rendering; neither may add a tab stop.
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain("tabindex");
    expect(markup).toContain("Wood");
  });
});
