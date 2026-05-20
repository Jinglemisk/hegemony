import type { HegemonyState, PlayerId } from "../game/types";
import type { LocalContext } from "../game/controller";
import { PLAYER_COLORS } from "../game/data";
import { getPlayerName } from "../game/rules";
import { phaseLabel } from "../ui/formatters";
import { UiSprite } from "./Sprites";

export function MapStatusOverlay({
  G,
  ctx,
  currentPlayerId,
  isActive
}: {
  G: HegemonyState;
  ctx: LocalContext;
  currentPlayerId: PlayerId;
  isActive: boolean;
}) {
  return (
    <div className="mapHud" aria-label="Turn status">
      <div className="hudCard">
        <UiSprite item="seasonMarker" className="hudMedallion" />
        <div>
          <span>Season</span>
          <strong>{G.season}</strong>
        </div>
      </div>

      <div className="hudCard">
        <UiSprite item="meander" className="hudMedallion" />
        <div>
          <span>Turn {ctx.turn}</span>
          <strong>{phaseLabel(ctx.phase)}</strong>
        </div>
      </div>

      <div className="hudCard turnOwner" style={{ borderColor: PLAYER_COLORS[currentPlayerId] }}>
        <span className="playerSeal" style={{ background: PLAYER_COLORS[currentPlayerId] }} />
        <div>
          <span>{isActive ? "Your turn" : "Now acting"}</span>
          <strong>{getPlayerName(G, currentPlayerId)}'s turn</strong>
        </div>
      </div>
    </div>
  );
}
