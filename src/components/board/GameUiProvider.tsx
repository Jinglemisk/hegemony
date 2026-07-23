import type { ReactNode } from "react";
import { GameUiContext } from "./GameUiContext";
import type { GameUi } from "./GameUiContext";

/** Split from GameUiContext.tsx (2026-07-22): the context + `useGameUi` hook stay a
 *  data/hook module (Fast-Refresh-clean, imported by ~two dozen live panels), and this
 *  provider component lives on its own so editing it hot-reloads without invalidating them. */
export function GameUiProvider({ value, children }: { value: GameUi; children: ReactNode }) {
  return <GameUiContext.Provider value={value}>{children}</GameUiContext.Provider>;
}
