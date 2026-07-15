import { useCallback, useEffect, useMemo, useState } from "react";
import {
  POP_TYPES,
  getDemotePopStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getPromotePopStatus,
  totalPops
} from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { getOwnedHoldings } from "../helpers";
import type { MapSelection, MapSelectionMode } from "./mapSelection";

/**
 * Owns the armed selection mode and the tiles it may land on (refit scope 3).
 *
 * The legal set always comes from the engine's own status functions — never from
 * a UI guess — so a tile glows if and only if the move would actually be allowed.
 * That is the same invariant R7 restored for the income previews, applied to
 * legality: the board can't offer what the rules would refuse.
 */
export function useMapSelection({
  G,
  playerID,
  isActive
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
}) {
  const [selection, setSelection] = useState<MapSelection | null>(null);

  const clear = useCallback(() => setSelection(null), []);

  /** Arm a mode, or disarm it if the same verb is pressed again. */
  const arm = useCallback((mode: MapSelectionMode) => {
    setSelection((current) => (current && current.mode.kind === mode.kind ? null : { mode, target: null }));
  }, []);

  const setTarget = useCallback((target: MapSelection["target"]) => {
    setSelection((current) => (current ? { ...current, target } : current));
  }, []);

  /** Move-pops is the only two-step flow: commit the source, re-glow for the target. */
  const advanceToTarget = useCallback((sourceTileId: string) => {
    setSelection((current) =>
      current && current.mode.kind === "movePops"
        ? { mode: { kind: "movePops", sourceTileId }, target: null }
        : current
    );
  }, []);

  // One Escape route for every mode, rather than a handler per flow.
  useEffect(() => {
    if (!selection) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clear();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selection, clear]);

  const candidateTileIds = useMemo(() => {
    if (!selection || !isActive) {
      return [];
    }

    const holdings = getOwnedHoldings(G, playerID);

    switch (selection.mode.kind) {
      case "foundColony":
        return G.board.tiles.filter((tile) => getFoundColonyStatus(G, playerID, tile.id).can).map((tile) => tile.id);

      case "growPop":
        // Any pop type being growable is enough to offer the settlement.
        return holdings
          .filter(({ tile }) => POP_TYPES.some((pop) => getGrowPopStatus(G, playerID, tile.id, pop).can))
          .map(({ tile }) => tile.id);

      case "movePops": {
        const { sourceTileId } = selection.mode;

        return sourceTileId
          ? // Step two: anywhere of mine that isn't where they started.
            holdings.filter(({ tile }) => tile.id !== sourceTileId).map(({ tile }) => tile.id)
          : // Step one: only settlements with a body to spare.
            holdings.filter(({ settlement }) => totalPops(settlement.pops) > 0).map(({ tile }) => tile.id);
      }

      case "ladder": {
        const { kind, from } = selection.mode.request;
        const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;

        return holdings.filter(({ tile }) => status(G, playerID, tile.id, from).can).map(({ tile }) => tile.id);
      }

    }
  }, [selection, G, playerID, isActive]);

  return { selection, arm, clear, setTarget, advanceToTarget, candidateTileIds };
}
