import { createContext, useContext, type ReactNode, type RefObject } from "react";

/**
 * One spending action's question for the confirm bar. The caller builds every
 * word from the engine's status functions; the bar computes nothing.
 */
export type ConfirmAsk = {
  /** An `Ico` path for the action. */
  icon: string;
  /** The bold question: "Are you sure you want to promote a freeman to citizen in Samos?" */
  question: string;
  /** The cost and the store after: "This will cost 2 gold: gold 2 → 0", the after value a `Delta`. */
  detail?: ReactNode;
  /** The action's own verb, on the lacquer button: "Promote". */
  verb: string;
  /** Runs on yes, after the bar has closed. */
  onYes: () => void;
};

type ConfirmState = {
  pending: ConfirmAsk | null;
  /** What had the focus when the question was asked: the focus goes back there. */
  opener: RefObject<Element | null>;
  ask: (question: ConfirmAsk) => void;
  close: () => void;
};

export const ConfirmContext = createContext<ConfirmState | null>(null);

/** The open question and its controls, for the host. */
export function useConfirmState(): ConfirmState {
  const state = useContext(ConfirmContext);
  if (!state) throw new Error("The confirm bar needs a ConfirmProvider above it.");
  return state;
}

/** Ask before spending: `ask({ icon, question, detail, verb, onYes })` opens the confirm bar. */
export function useConfirm(): (question: ConfirmAsk) => void {
  return useConfirmState().ask;
}
