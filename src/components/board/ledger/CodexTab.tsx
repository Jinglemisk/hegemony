import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HegemonyState } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { Icon } from "../../../ui/icons/Icon";
import { Ico } from "../../frame/parts";
import { RULEBOOK } from "./rulebook";

/**
 * The Codex — the whole of Hegemony's rules, in the game, in the order you learn it.
 * It drops from the right strip like the other consult pages, so reading the rules
 * never takes the board away from you.
 *
 * Three navigations, and each answers a different question:
 *  - a CONTENTS page the Codex opens on, every chapter a large button — "what is in
 *    this book?";
 *  - a SEARCH on that page that matches on 2+ letters and lists the topics it hits —
 *    "where is the rule about X?" (the owner's ask, 2026-07-19);
 *  - inside a chapter, a way back to the contents and a jump strip for the chapter's
 *    sub-headings, kept in step with a scroll-spy — "where am I inside it?".
 *
 * The contents page replaced a dropdown (owner, 2026-10-16): fifteen chapters in a
 * dropped list were a hunt every time, and a page of buttons is one look and one
 * click.
 *
 * The one law: every number renders FROM `G.ruleset` / the content tables (see
 * rulebook.tsx), so the Codex can never disagree with the engine.
 */

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

function useCodexNav(section: SectionId | null, entries: NavEntry[]) {
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

export function CodexTab({
  G,
  target,
}: {
  G: HegemonyState;
  target?: { chapter: string; nonce: number } | null;
}) {
  // Null is the contents page. The Codex opens there unless a deep-link names a chapter.
  const [section, setSection] = useState<SectionId | null>(() => chapterOf(target));
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const shelfRef = useRef<HTMLOListElement>(null);
  // Where focus lands once the page has turned: the way back, or the chapter you left.
  const focusAfter = useRef<"back" | SectionId | null>(null);
  const entries = useMemo(() => (section ? sectionEntries(section) : []), [section]);
  const { navRef, activeId, jumpTo } = useCodexNav(section, entries);

  // A deep-link (an AnnotatedText term clicked anywhere) opens the codex to a chapter.
  // The nonce changes on every click, so the same term re-navigates even if you'd
  // scrolled away within that chapter.
  useEffect(() => {
    const chapterId = chapterOf(target);
    if (chapterId) {
      setSection(chapterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);

  // Every page turn starts at the top of the page.
  useLayoutEffect(() => {
    const root = navRef.current?.closest(".intelBody");
    if (root) {
      root.scrollTop = 0;
    }
    const focus = focusAfter.current;
    focusAfter.current = null;
    if (focus === "back") {
      backRef.current?.focus();
    } else if (focus) {
      shelfRef.current?.querySelector<HTMLElement>(`[data-chapter="${focus}"]`)?.focus();
    }
  }, [section, navRef]);

  const results = useMemo(() => searchRulebook(query), [query]);

  const openChapter = (id: SectionId) => {
    focusAfter.current = "back";
    setSection(id);
  };

  const goBack = () => {
    focusAfter.current = section;
    setSection(null);
  };

  const goTo = (hit: SearchHit) => {
    setQuery("");
    setSearchOpen(false);
    openChapter(hit.chapterId);
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

  if (section === null) {
    return (
      <>
        <div className="codexSearch" ref={navRef}>
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
                // Focus moves to the chapter's back button; unconsumed, this same
                // Enter would press it and turn straight back to the contents.
                event.preventDefault();
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

        <ol aria-label="Chapters" className="codexShelf" ref={shelfRef}>
          {RULEBOOK.map((candidate, index) => (
            <li key={candidate.id}>
              <button
                className="codexShelfBtn"
                data-chapter={candidate.id}
                onClick={() => openChapter(candidate.id)}
                title={candidate.blurb}
                type="button"
              >
                <Ico path={candidate.icon} size="tile" />
                <span className="codexShelfWords">
                  <span className="codexShelfNum">{toRoman(index + 1)}</span>
                  <b>{candidate.title}</b>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </>
    );
  }

  const chapter = RULEBOOK.find((candidate) => candidate.id === section) ?? RULEBOOK[0];
  const chapterNumber = RULEBOOK.indexOf(chapter) + 1;

  return (
    <>
      <div className="codexNav" ref={navRef}>
        <div className="codexChapterHead">
          <button className="codexBack" onClick={goBack} ref={backRef} type="button">
            <Icon className="codexBackCaret" glyph="chevronRight" />
            Contents
          </button>
          <span className="codexChapterWhere">
            <span className="codexNumeral label num">{toRoman(chapterNumber)}</span>
            <b className="title">{chapter.title}</b>
          </span>
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

function chapterOf(target?: { chapter: string } | null): SectionId | null {
  return target && RULEBOOK.some((chapter) => chapter.id === target.chapter)
    ? target.chapter
    : null;
}
