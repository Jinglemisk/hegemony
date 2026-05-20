import { HegemonyBoard } from "./components/HegemonyBoard";
import { useHegemonyGame } from "./game/controller";

export function App() {
  const { game, playerID, setPlayerID, moves, events, isActive } = useHegemonyGame();

  return (
    <HegemonyBoard
      G={game.G}
      ctx={game.ctx}
      events={events}
      isActive={isActive}
      moves={moves}
      onPlayerIDChange={setPlayerID}
      playerID={playerID}
    />
  );
}
