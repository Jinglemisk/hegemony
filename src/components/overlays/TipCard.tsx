import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { RULEBOOK } from "../board/ledger/rulebook";
import { overlayRoot, overlayScale } from "../chrome/canvas";
import { useCodexLink } from "../codexLink";
import { Tip, TipBody } from "../frame/parts";
import { TIP_GRACE_MS, TIP_LOCK_MS } from "./tipTiming";

/** A term the pointer opened from a locked card: its chapter, its word, and where it sits. */
type Opened = { chapter: string; word: string; anchor: HTMLElement };

/** Clearance between a card and the screen's edge, and between two cards. */
const EDGE = 10;
const GAP = 6;

/**
 * A tooltip's card, after Crusader Kings III's nested tooltips. A card whose words
 * hold underlined terms (AnnotatedText's `data-term`) locks once the pointer has
 * rested on it for `TIP_LOCK_MS`, a bar filling along its foot; then the pointer may
 * enter it, and a term opens its own card beside it, which may lock and nest again.
 * A term already open up the stack reads as plain text. Terms are reference links
 * (a press opens the Codex there), never choices.
 */
export function TipCard({
  cardRef,
  className,
  id,
  style,
  shown = [],
  onLock,
  onEnter,
  onLeave,
  children,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  className: string;
  id?: string;
  style?: CSSProperties;
  /** Chapters whose cards are open below this one. */
  shown?: readonly string[];
  onLock?: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
  children: ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  const closeChild = useRef<number | undefined>(undefined);
  const codexLink = useCodexLink();

  const terms = () =>
    [...(cardRef.current?.querySelectorAll<HTMLElement>("[data-term]") ?? [])].filter(
      (term) => !shown.includes(term.dataset.term ?? ""),
    );

  // A term open further down the stack reads as plain text here.
  useLayoutEffect(() => {
    cardRef.current?.querySelectorAll<HTMLElement>("[data-term]").forEach((term) => {
      term.toggleAttribute("data-term-open", shown.includes(term.dataset.term ?? ""));
    });
  });

  // Rest, then lock: only a card with a term to open has anything to lock for.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (terms().length === 0) return;
      setLocked(true);
      onLock?.();
    }, TIP_LOCK_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(closeChild.current);
    };
    // The lock runs once, from when the card first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keepChild = () => {
    window.clearTimeout(closeChild.current);
    closeChild.current = undefined;
  };
  const dropChildSoon = () => {
    if (closeChild.current !== undefined) return;
    closeChild.current = window.setTimeout(() => {
      closeChild.current = undefined;
      setOpened(null);
    }, TIP_GRACE_MS);
  };

  const over = (event: MouseEvent<HTMLDivElement>) => {
    const own = cardRef.current;
    const target = event.target as Element;
    // Inside a card this one opened (React bubbles through the portal): keep it.
    if (!own?.contains(target)) return keepChild();
    const term = locked ? target.closest<HTMLElement>("[data-term]:not([data-term-open])") : null;
    if (term) {
      keepChild();
      if (opened?.anchor !== term)
        setOpened({
          chapter: term.dataset.term ?? "",
          word: term.textContent ?? "",
          anchor: term,
        });
    } else if (opened) dropChildSoon();
  };
  const press = (event: MouseEvent<HTMLDivElement>) => {
    const term = (event.target as Element).closest<HTMLElement>(
      "[data-term]:not([data-term-open])",
    );
    if (!locked || !term || !cardRef.current?.contains(term) || !codexLink) return;
    codexLink.openCodexTo(term.dataset.term ?? "");
  };

  return (
    <div
      className={`${className}${locked ? " is-locked" : ""}`}
      id={id}
      onClick={press}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseOver={over}
      ref={cardRef}
      role="tooltip"
      style={style}
    >
      {children}
      <i aria-hidden="true" className="tip-lock" />
      {opened ? (
        <TermCard
          key={opened.chapter}
          opened={opened}
          parent={cardRef}
          shown={[...shown, opened.chapter]}
        />
      ) : null}
    </div>
  );
}

/** A term's own card: its word, its chapter, and the chapter's line, beside its parent. */
function TermCard({
  opened,
  parent,
  shown,
}: {
  opened: Opened;
  parent: RefObject<HTMLDivElement | null>;
  shown: readonly string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chapter = RULEBOOK.find((entry) => entry.id === opened.chapter);

  // Beside the parent on whichever side covers no open card; failing both, under them.
  useLayoutEffect(() => {
    const card = ref.current;
    const from = parent.current;
    if (!card || !from) return;
    const k = overlayScale();
    const design = (rect: DOMRect) => ({
      x: rect.left / k,
      y: rect.top / k,
      w: rect.width / k,
      h: rect.height / k,
    });
    const open = [...document.querySelectorAll<HTMLElement>(".sharedTooltip")]
      .filter((other) => other !== card)
      .map((other) => design(other.getBoundingClientRect()));
    const p = design(from.getBoundingClientRect());
    const a = design(opened.anchor.getBoundingClientRect());
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const screenW = window.innerWidth / k;
    const screenH = window.innerHeight / k;
    const y0 = Math.max(EDGE, Math.min(a.y - 8, screenH - h - EDGE));
    const hits = (x: number, y: number) =>
      open.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);
    const sides = [p.x + p.w + GAP, p.x - w - GAP].filter(
      (x) => x >= EDGE && x + w <= screenW - EDGE,
    );
    let x = sides.find((side) => !hits(side, y0));
    let y = y0;
    if (x === undefined) {
      x = sides[0] ?? EDGE;
      y = Math.min(screenH - h - EDGE, Math.max(...open.map((o) => o.y + o.h)) + GAP);
    }
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.opacity = "1";
  }, [opened, parent]);

  if (!chapter) return null;
  return createPortal(
    <TipCard cardRef={ref} className="sharedTooltip term-tip" shown={shown} style={{ opacity: 0 }}>
      <Tip
        title={
          <>
            {opened.word}
            <span className="term-tip-ch">{chapter.title}</span>
          </>
        }
      >
        <TipBody>{chapter.blurb}</TipBody>
      </Tip>
    </TipCard>,
    overlayRoot(),
  );
}
