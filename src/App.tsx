import { useCallback, useState } from "react";
import { HegemonyBoard } from "./components/HegemonyBoard";
import { useHegemonyGame } from "./client/controller";
import { TunePanel } from "./dev/TunePanel";

export function App() {
  const {
    game,
    playerID,
    setPlayerID,
    moves,
    events,
    resetGame,
    devShell,
    isActive,
    hotseat,
    humans,
  } = useHegemonyGame();

  // A remount key for the board. `resetGame` re-rolls the SAME seed with new params for a
  // clean A/B (controller.ts), but `HegemonyBoard` lazily seeds UI state at mount only
  // (`seen.gameOver`). Without a key change the board does not remount, so that
  // stale state leaks into the next game: the fresh game-over stays dismissed. Bumping the key
  // on every reset forces a remount and a clean re-seed. (post-sprint-debt §4.)
  const [resetKey, setResetKey] = useState(0);
  const handleReset = useCallback(() => {
    resetGame();
    setResetKey((key) => key + 1);
  }, [resetGame]);

  return (
    <>
      <HegemonyBoard
        key={resetKey}
        G={game.G}
        ctx={game.ctx}
        dev={devShell}
        events={events}
        hotseat={hotseat}
        humans={humans}
        isActive={isActive}
        moves={moves}
        onPlayerIDChange={setPlayerID}
        playerID={playerID}
      />
      {import.meta.env.DEV && game.G.phase !== "setupIdeas" && (
        <TunePanel game={game.G} resetGame={handleReset} />
      )}
    </>
  );
}
