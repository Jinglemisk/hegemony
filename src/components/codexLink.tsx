import { createContext, useContext } from "react";

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
