/* A context + its hook + a couple of tiny link components, deliberately together —
   Fast Refresh's one-kind-of-export rule doesn't apply to this wiring module. */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";

/**
 * Deep-links into the Codex rulebook (two-panel.md piece 4). Any prose rendered
 * through {@link AnnotatedText} — cards, the chronicle, modals, the rulebook itself —
 * can turn its resource/pop/building words into links that open the Codex at the
 * matching chapter. The wiring lives in one place so the term IS the link, with no
 * `(?)` sprinkles: the board provides `openCodexTo`, AnnotatedText consumes it.
 *
 * Null when no provider is mounted (e.g. a component rendered in isolation), in which
 * case AnnotatedText renders its tokens as plain chips — the pre-deep-link behavior.
 */
export type CodexLink = {
  /** Open the consult panel's Codex at a rulebook chapter id (see rulebook.tsx). */
  openCodexTo: (chapter: string) => void;
};

const CodexLinkContext = createContext<CodexLink | null>(null);

export const CodexLinkProvider = CodexLinkContext.Provider;

export function useCodexLink(): CodexLink | null {
  return useContext(CodexLinkContext);
}

/**
 * A text-only Codex link (no appended icon) for terminology already shown beside its
 * own glyph — a building or pop name in the ledger. Same clay keyword styling as an
 * AnnotatedText term; degrades to plain text when no provider is mounted.
 */
export function CodexTermLink({ chapter, children }: { chapter: string; children: ReactNode }) {
  const link = useCodexLink();
  if (!link) {
    return <>{children}</>;
  }
  return (
    <button className="richTokenLink" onClick={() => link.openCodexTo(chapter)} type="button">
      {children}
    </button>
  );
}
