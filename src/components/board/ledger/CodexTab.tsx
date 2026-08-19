import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HegemonyState } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { Icon } from "../../../ui/icons/Icon";
import { RULEBOOK } from "./rulebook";

/**
 * The Codex — the whole of Hegemony's rules, in the game, in the order you learn it.
 * It is a ledger page like any other (reached from its rail disc, not a modal), so
 * reading the rules never takes the board away from you.
 *
 * Three navigations, and each answers a different question:
 *  - a SEARCH that matches on 2+ letters and lists the topics it hits — "where is
 *    the rule about X?" (the owner's ask, 2026-07-19);
 *  - a CONTENTS sheet naming every chapter and what it covers — "what is in this
 *    book?";
 *  - a jump strip for the open chapter's sub-headings, kept in step with a
 *    scroll-spy — "where am I inside it?".
 *
 * The contents replaced a row of chapter pills (2026-08-15). A tab bar is a
 * container for three or four peers you flip between; this is a thirteen-chapter
 * table of contents in a 220px tablet, and as a row it put ten of the thirteen
 * past the right edge at every width — two thirds of the rulebook unreachable.
 * A book's answer to that problem is a contents page, so this is one: closed it
 * costs one line and says which chapter you are in, open it lists every chapter
 * with its subject.
 *
 * The one law: every number renders FROM `G.ruleset` / the content tables (see
 * rulebook.tsx), so the Codex can never disagree with the engine.
 */

const SECTIONS = RULEBOOK.map((chapter) => ({
  id: chapter.id,
  label: chapter.title,
  blurb: chapter.blurb,
}));
type SectionId = string;

type NavEntry = { id: string; label: string };

/** The active chapter's jumpable sub-headings (empty for single-entry chapters). */
function sectionEntries(section: SectionId): NavEntry[] {
  const chapter = RULEBOOK.find((candidate) => candidate.id === section);
  return chapter && chapter.entries.length > 1 ? chapter.entries : [];
}

// ── search index ──────────────────────────────────────────────────────────────

type SearchHit = { chapterId: string; entryId: string | null; label: string; context: string };

/** One flat, lowercased haystack per topic: the chapter itself, then each sub-heading.
 *  Built once — chapters are static content, so this never needs to change. */
const SEARCH_INDEX: Array<SearchHit & { hay: string }> = RULEBOOK.flatMap((chapter) => {
  const chapterHit = {
    chapterId: chapter.id,
    entryId: null,
    label: chapter.title,
    context: chapter.blurb,
    hay: [chapter.title, chapter.blurb, ...chapter.keywords].join(" ").toLowerCase(),
  };
  const entryHits = chapter.entries.map((entry) => ({
    chapterId: chapter.id,
    entryId: entry.id,
    label: entry.label,
    context: chapter.title,
    hay: `${entry.label} ${chapter.title} ${chapter.keywords.join(" ")}`.toLowerCase(),
  }));
  return [chapterHit, ...entryHits];
});

function searchRulebook(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  // Prefix/word-start matches rank above mid-word matches, so typing "un" surfaces
  // "Unrest" before "Population".
  return SEARCH_INDEX.map((hit) => {
    const index = hit.hay.indexOf(needle);
    if (index < 0) {
      return null;
    }
    const wordStart = index === 0 || hit.hay[index - 1] === " ";
    return { hit, rank: (wordStart ? 0 : 1) + (hit.entryId ? 0.5 : 0) };
  })
    .filter(
      (scored): scored is { hit: SearchHit & { hay: string }; rank: number } => scored !== null,
    )
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map(({ hit }) => ({
      chapterId: hit.chapterId,
      entryId: hit.entryId,
      label: hit.label,
      context: hit.context,
    }));
}

// ── scroll-spy + jump (scoped to the consult panel's own scroll) ────────────────

function useCodexNav(section: SectionId, entries: NavEntry[]) {
  const navRef = useRef<HTMLDivElement>(null);
  const jumpingRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollParent = () => navRef.current?.closest(".intelBody") as HTMLElement | null;

  useEffect(() => {
    setActiveId(entries[0]?.id ?? null);
  }, [section, entries]);

  useEffect(() => {
    const root = scrollParent();
    if (!root || entries.length < 2) {
      return;
    }

    const sync = () => {
      const nav = navRef.current;
      if (jumpingRef.current || !nav) {
        return;
      }
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) {
        setActiveId(entries[entries.length - 1].id);
        return;
      }
      const navBottom = nav.getBoundingClientRect().bottom;
      let current = entries[0].id;
      for (const entry of entries) {
        const element = document.getElementById(entry.id);
        if (!element) {
          continue;
        }
        if (element.getBoundingClientRect().top - navBottom <= 4) {
          current = entry.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    const releaseJump = () => {
      jumpingRef.current = false;
    };

    sync();
    root.addEventListener("scroll", sync, { passive: true });
    root.addEventListener("wheel", releaseJump, { passive: true });
    root.addEventListener("touchmove", releaseJump, { passive: true });
    return () => {
      root.removeEventListener("scroll", sync);
      root.removeEventListener("wheel", releaseJump);
      root.removeEventListener("touchmove", releaseJump);
    };
  }, [section, entries]);

  const jumpTo = (id: string, behavior: ScrollBehavior = "smooth") => {
    const root = scrollParent();
    const target = document.getElementById(id);
    if (!root || !target) {
      return false;
    }
    jumpingRef.current = true;
    setActiveId(id);
    // scrollIntoView (not hand-computed scrollTop) so the browser re-resolves the
    // target even as a section's tables finish rendering; the sticky nav is cleared
    // by the entries' scroll-margin-top in CSS.
    target.scrollIntoView({ block: "start", behavior });
    window.setTimeout(() => {
      jumpingRef.current = false;
    }, 700);
    return true;
  };

  return { navRef, activeId, jumpTo };
}

/**
 * How tall the contents sheet may be: the room left between where it drops and the
 * bottom of the tablet, less a gutter.
 *
 * It used to be `min(52vh, 440px)`, which is a measure of the WINDOW, and the sheet
 * hangs inside a panel — at 1366×768 that put its last row 13px short of the tablet's
 * inner edge, so a chapter was sliced in half and a strip of the rules underneath
 * showed through the gap below it. Measured against the panel it always ends where
 * the tablet does, and a part-row at that edge reads as "there is more", which is
 * what it is.
 */
function useContentsHeight(open: boolean, listRef: React.RefObject<HTMLElement | null>) {
  const [max, setMax] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMax(null);
      return;
    }

    const measure = () => {
      const list = listRef.current;
      const panel = list?.closest(".intelBody");
      if (!list || !panel) {
        return;
      }
      // Flush with the tablet's inner edge, not short of it: any gap left here is a
      // strip of the chapter underneath showing between the sheet and the frame.
      const room = panel.getBoundingClientRect().bottom - list.getBoundingClientRect().top;
      // Floored: a panel too short to hold the sheet must still get a scrollable
      // sheet, never a zero-height (or negative, and so ignored) one.
      setMax(Math.max(140, Math.round(room)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, listRef]);

  return max;
}

export function CodexTab({
  G,
  target,
}: {
  G: HegemonyState;
  target?: { chapter: string; nonce: number } | null;
}) {
  const [section, setSection] = useState<SectionId>(SECTIONS[0].id);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const contentsListRef = useRef<HTMLOListElement>(null);
  const entries = useMemo(() => sectionEntries(section), [section]);
  const { navRef, activeId, jumpTo } = useCodexNav(section, entries);
  const contentsMax = useContentsHeight(contentsOpen, contentsListRef);

  // A deep-link (an AnnotatedText term clicked anywhere) opens the codex to a chapter.
  // The nonce changes on every click, so the same term re-navigates even if you'd
  // scrolled away within that chapter.
  useEffect(() => {
    if (target && RULEBOOK.some((chapter) => chapter.id === target.chapter)) {
      setSection(target.chapter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);
  const results = useMemo(() => searchRulebook(query), [query]);
  const chapter = RULEBOOK.find((candidate) => candidate.id === section) ?? RULEBOOK[0];
  const chapterNumber = SECTIONS.findIndex((candidate) => candidate.id === section) + 1;

  const openChapter = (id: SectionId) => {
    setSection(id);
    setContentsOpen(false);
    contentsButtonRef.current?.focus();
  };

  const goTo = (hit: SearchHit) => {
    setQuery("");
    setSearchOpen(false);
    setContentsOpen(false);
    if (hit.chapterId !== section) {
      setSection(hit.chapterId);
    }
    if (hit.entryId) {
      // A search jump switches chapters first, and the target chapter — its dice
      // tables especially — only becomes tall enough to scroll a few frames later,
      // so a single early jump no-ops. Re-align the anchor to the top across a short
      // window; each call is instant and idempotent, so the final settled layout
      // lands it correctly. (A smooth scroll mid-swap gets cancelled by the cascade,
      // hence "auto".)
      const id = hit.entryId;
      let tries = 0;
      const align = () => {
        jumpTo(id, "auto");
        if (tries++ < 12) {
          window.setTimeout(align, 45);
        }
      };
      window.setTimeout(align, 30);
    }
  };

  return (
    <>
      <div className="codexNav" ref={navRef}>
        <div className="codexSearch">
          <input
            className="codexSearchInput"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                goTo(results[0]);
              } else if (event.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
              }
            }}
            placeholder="Search the rules…"
            aria-label="Search the rulebook"
          />
          {searchOpen && results.length > 0 ? (
            <ul className="codexSearchResults" role="listbox">
              {results.map((hit) => (
                <li key={`${hit.chapterId}-${hit.entryId ?? "top"}`}>
                  <button
                    className="codexSearchHit"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goTo(hit)}
                  >
                    <span className="codexSearchHitLabel">{hit.label}</span>
                    <span className="codexSearchHitContext">{hit.context}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {searchOpen && query.trim().length >= 2 && results.length === 0 ? (
            <ul className="codexSearchResults">
              <li className="codexSearchEmpty">No rule matches “{query.trim()}”.</li>
            </ul>
          ) : null}
        </div>

        {/* The contents. Closed it is one line that always names where you are;
            open it is the whole book, chapter by chapter, with what each covers. */}
        <div
          className="codexContents"
          onKeyDown={(event) => {
            if (event.key === "Escape" && contentsOpen) {
              event.stopPropagation();
              setContentsOpen(false);
              contentsButtonRef.current?.focus();
            }
          }}
        >
          <button
            aria-controls="codexContentsList"
            aria-expanded={contentsOpen}
            className={contentsOpen ? "codexContentsToggle on" : "codexContentsToggle"}
            onClick={() => setContentsOpen((open) => !open)}
            ref={contentsButtonRef}
            type="button"
          >
            <span className="codexContentsNumeral label num">{toRoman(chapterNumber)}</span>
            <span className="codexContentsWhere">
              <b className="title">{chapter.title}</b>
              <span className="codexContentsOf label">
                chapter {chapterNumber} of {SECTIONS.length}
              </span>
            </span>
            <Icon className="codexContentsCaret" glyph="chevronDown" />
          </button>

          {contentsOpen ? (
            <ol
              className="codexContentsList"
              id="codexContentsList"
              ref={contentsListRef}
              style={contentsMax === null ? undefined : { maxHeight: `${contentsMax}px` }}
            >
              {SECTIONS.map((candidate, index) => (
                <li key={candidate.id}>
                  <button
                    aria-current={candidate.id === section ? "true" : undefined}
                    className={
                      candidate.id === section ? "codexContentsRow on" : "codexContentsRow"
                    }
                    onClick={() => openChapter(candidate.id)}
                    type="button"
                  >
                    <span className="codexContentsNumeral label num">{toRoman(index + 1)}</span>
                    <span className="codexContentsEntry">
                      <b className="title">{candidate.label}</b>
                      <span className="codexContentsBlurb caption">{candidate.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        {entries.length > 0 ? (
          <nav className="codexJump" aria-label={`${chapter.title} contents`}>
            {entries.map((entry) => (
              <button
                className={
                  entry.id === activeId ? "codexJumpLink codexJumpLinkActive" : "codexJumpLink"
                }
                key={entry.id}
                onClick={() => jumpTo(entry.id)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="compendiumBody">
        <chapter.Body G={G} />
      </div>
    </>
  );
}
