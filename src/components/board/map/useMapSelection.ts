import { useCallback, useEffect, useMemo, useState } from "react";
import { getFoundColonyStatus } from "../../../game/rules";
import { tradePopSources, tradePopTargets } from "../../../game/trade";
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
  isActive,
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
}) {
  const [selection, setSelection] = useState<MapSelection | null>(null);

  const clear = useCallback(() => setSelection(null), []);

  /** Arm a mode, or disarm it if the same mode is armed again. */
  const arm = useCallback((mode: MapSelectionMode) => {
    setSelection((current) =>
      current && JSON.stringify(current.mode) === JSON.stringify(mode)
        ? null
        : { mode, target: null },
    );
  }, []);

  const setTarget = useCallback((target: MapSelection["target"]) => {
    setSelection((current) => (current ? { ...current, target } : current));
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
    if (!selection) {
      return [];
    }

    // Traded pops are the trading seat's to place, on its turn or not.
    if (selection.mode.kind === "tradePops") {
      const { seat, pops, direction } = selection.mode;
      return direction === "send" ? tradePopSources(G, seat, pops) : tradePopTargets(G, seat, pops);
    }

    if (!isActive) {
      return [];
    }

    const holdings = getOwnedHoldings(G, playerID);

    switch (selection.mode.kind) {
      case "foundColony":
        return G.board.tiles
          .filter((tile) => getFoundColonyStatus(G, playerID, tile.id).can)
          .map((tile) => tile.id);

      case "movePops": {
        // Anywhere of mine that isn't where they started.
        const { sourceTileId } = selection.mode;
        return holdings.filter(({ tile }) => tile.id !== sourceTileId).map(({ tile }) => tile.id);
      }
    }
    return [];
  }, [selection, G, playerID, isActive]);

  return { selection, arm, clear, setTarget, candidateTileIds };
}
