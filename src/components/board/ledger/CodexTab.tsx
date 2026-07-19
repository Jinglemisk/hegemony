import { useEffect, useMemo, useRef, useState } from "react";
import type { HegemonyState } from "../../../game/types";
import { RULEBOOK } from "./rulebook";

/**
 * The Codex — the whole of Hegemony's rules, in the game, in the order you learn it.
 * It is a ledger page like any other (reached from its rail disc, not a modal), so
 * reading the rules never takes the board away from you.
 *
 * Two navigations, because a dozen chapters don't fit one tab row:
 *  - a SEARCH that matches on 2+ letters and lists the topics it hits; picking one
 *    jumps straight there (the owner's ask, 2026-07-19);
 *  - the chapter chips + a sticky jump strip for the active chapter's sub-headings,
 *    kept in step with a scroll-spy.
 *
 * The one law: every number renders FROM `G.ruleset` / the content tables (see
 * rulebook.tsx), so the Codex can never disagree with the engine.
 */

const SECTIONS = RULEBOOK.map((chapter) => ({ id: chapter.id, label: chapter.title }));
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
    hay: [chapter.title, chapter.blurb, ...chapter.keywords].join(" ").toLowerCase()
  };
  const entryHits = chapter.entries.map((entry) => ({
    chapterId: chapter.id,
    entryId: entry.id,
    label: entry.label,
    context: chapter.title,
    hay: `${entry.label} ${chapter.title} ${chapter.keywords.join(" ")}`.toLowerCase()
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
    .filter((scored): scored is { hit: SearchHit & { hay: string }; rank: number } => scored !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map(({ hit }) => ({ chapterId: hit.chapterId, entryId: hit.entryId, label: hit.label, context: hit.context }));
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

export function CodexTab({ G }: { G: HegemonyState }) {
  const [section, setSection] = useState<SectionId>(SECTIONS[0].id);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const entries = useMemo(() => sectionEntries(section), [section]);
  const { navRef, activeId, jumpTo } = useCodexNav(section, entries);
  const results = useMemo(() => searchRulebook(query), [query]);
  const chapter = RULEBOOK.find((candidate) => candidate.id === section) ?? RULEBOOK[0];

  const goTo = (hit: SearchHit) => {
    setQuery("");
    setSearchOpen(false);
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
      <p className="codexLede">The whole rulebook, as this board plays it — search a topic, or read it through.</p>

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
                  <button className="codexSearchHit" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => goTo(hit)}>
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

        <nav className="compendiumTabs codexChapterTabs" aria-label="Rulebook chapters">
          {SECTIONS.map((candidate) => (
            <button
              className={candidate.id === section ? "compendiumTab compendiumTabActive" : "compendiumTab"}
              key={candidate.id}
              onClick={() => setSection(candidate.id)}
              type="button"
            >
              {candidate.label}
            </button>
          ))}
        </nav>

        {entries.length > 0 ? (
          <nav className="codexJump" aria-label={`${chapter.title} contents`}>
            {entries.map((entry) => (
              <button
                className={entry.id === activeId ? "codexJumpLink codexJumpLinkActive" : "codexJumpLink"}
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
