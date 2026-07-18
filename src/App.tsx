import { HegemonyBoard } from "./components/HegemonyBoard";
import { useHegemonyGame } from "./game/controller";
import { TunePanel } from "./dev/TunePanel";

export function App() {
  const { game, playerID, setPlayerID, moves, events, resetGame, isActive } = useHegemonyGame();

  return (
    <>
      <HegemonyBoard
        G={game.G}
        ctx={game.ctx}
        events={events}
        isActive={isActive}
        moves={moves}
        onPlayerIDChange={setPlayerID}
        playerID={playerID}
      />
      {import.meta.env.DEV && <TunePanel game={game.G} resetGame={resetGame} />}
    </>
  );
}
