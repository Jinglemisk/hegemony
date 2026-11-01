import type { CSSProperties } from "react";
import { PLAYER_IDS } from "../../game/data";
import { currentVoteWeight, keptLaw } from "../../game/assembly";
import { happinessLevel } from "../../game/happiness";
import { playerNationalIdeas } from "../../game/ideas";
import { victoryMetricValue, voiceHolder } from "../../game/victory";
import type { HegemonyState, PlayerId } from "../../game/types";
import { publicCensus } from "../../ui/frameSelectors";
import { sign } from "../../ui/frameFormat";
import { POP_RASTERS, RESOURCE_RASTERS } from "../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Tooltip } from "../overlays/Tooltip";
import { Tip, TipBody, TipLedger } from "./parts";

/**
 * The seats, a disc each, over the corner dock: pressed, a disc takes that seat (the
 * hotseat's switch, which a networked game will not have); its tooltip is that
 * ruler's public census. A count on the disc is how many development cards it holds:
 * public, though the cards are not.
 */
export function Seats({
  G,
  viewerId,
  actingId,
  threats,
  onSeat,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  actingId: PlayerId;
  /** Seats one turn start from winning the race. */
  threats: readonly PlayerId[];
  onSeat: (id: PlayerId) => void;
}) {
  return (
    <div aria-label="Rulers" className="seats" data-c="rivals" role="group">
      {PLAYER_IDS.map((id) => (
        <Rival
          G={G}
          acting={id === actingId}
          id={id}
          key={id}
          onSelect={onSeat}
          threat={threats.includes(id)}
          viewing={id === viewerId}
        />
      ))}
    </div>
  );
}

function Rival({
  G,
  id,
  acting,
  viewing,
  threat,
  onSelect,
}: {
  G: HegemonyState;
  id: PlayerId;
  acting: boolean;
  viewing: boolean;
  /** Holds enough titles to win when its next turn starts. */
  threat: boolean;
  onSelect: (id: PlayerId) => void;
}) {
  const glaze = PLAYER_GLAZES[id];
  const census = publicCensus(G, id);
  const cards = G.devHands[id].length;
  const kept = keptLaw(G, id);

  return (
    <Tooltip
      content={
        <Tip title={glaze.name}>
          <TipLedger
            rows={[
              { key: "s", label: "Slaves", value: census.slaves, icon: POP_RASTERS.slaves },
              { key: "f", label: "Freemen", value: census.freemen, icon: POP_RASTERS.freemen },
              { key: "c", label: "Citizens", value: census.citizens, icon: POP_RASTERS.citizens },
              { key: "ci", label: "Cities", value: census.cities, icon: "settlements/city" },
              { key: "co", label: "Colonies", value: census.colonies, icon: "settlements/colony" },
              {
                key: "hap",
                label: "Happiness",
                value: sign(happinessLevel(G, id)),
                icon: RESOURCE_RASTERS.happiness,
              },
              {
                key: "laws",
                label: "Standing Laws authored",
                value: victoryMetricValue(G, id, "voice"),
                icon: "assembly/law",
              },
              {
                key: "votes",
                label: "Votes",
                value: currentVoteWeight(G, id),
                icon: "assembly/vote",
              },
              {
                key: "voice",
                label: "Voice",
                value: voiceHolder(G) === id ? "held" : "unheld",
                icon: "victory/voice",
              },
              { key: "cards", label: "Development cards", value: cards, icon: "events/convoy" },
            ]}
          />
          {playerNationalIdeas(G, id).map((idea) => (
            <TipBody key={idea.id}>
              <strong>{idea.name}</strong> · {idea.text}
            </TipBody>
          ))}
          {kept ? (
            <TipBody>
              Kept Law: <strong>{kept.name}</strong>, to propose at the next sitting
            </TipBody>
          ) : null}
        </Tip>
      }
      preferredPlacement="above"
    >
      <button
        aria-label={`${glaze.name}${acting ? ", acting" : ""}${cards ? `, ${cards} ${cards === 1 ? "card" : "cards"}` : ""}${viewing ? ", your seat" : ", take this seat"}`}
        aria-pressed={viewing}
        className={`rival${acting ? " is-acting" : ""}${threat ? " is-threat" : ""}${viewing ? " is-viewing" : ""}`}
        data-c="rival"
        onClick={() => onSelect(id)}
        style={{ "--owner": glaze.color } as CSSProperties}
        type="button"
      >
        <span className="rival-disc">{glaze.blazon}</span>
        {cards ? (
          <span aria-hidden="true" className="rival-cards label num">
            {cards}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}
