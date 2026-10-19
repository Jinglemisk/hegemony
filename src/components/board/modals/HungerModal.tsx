import { useState } from "react";
import { defaultHungerLeave, hungerMouths } from "../../../game/hunger";
import { getOwnedSettlement } from "../../../game/rules";
import type { HungerLeave, HungerPop } from "../../../game/types";
import { formatNumber } from "../../../ui/formatters";
import { settlementNameOf } from "../../../ui/settlementNames";
import { Ico } from "../../frame/parts";
import { useGameUi } from "../GameUiContext";
import { CeremonyBlow } from "./CeremonyBlow";
import { ModalShell } from "./ModalShell";

const POP_WORD: Record<HungerPop, [string, string]> = {
  freemen: ["Freeman", "freemen"],
  citizens: ["Citizen", "citizens"],
};
const NUMBER_WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const words = (n: number) => NUMBER_WORD[n] ?? formatNumber(n);

type Counts = Record<string, number>;
const key = (tileId: string, pop: HungerPop) => `${tileId}:${pop}`;

/**
 * Like the fate card, a dialog over the frame carries no `data-c`: the gate's
 * layout checks measure the frame's panels, and still check this card's text,
 * icons and hit targets.
 *
 * Hunger at turn end: the seat ends its turn short of food and chooses who leaves,
 * one pop per missing food, by settlement. It opens on the engine's cheapest loss
 * (freemen first) and commits only at the exact count. Opened from End turn it
 * offers the way back, so the seat can still buy food.
 */
export function HungerModal({
  unfed,
  onBack,
  onCommit,
}: {
  /** Pops that must leave. */
  unfed: number;
  /** Close without ending the turn. Absent once the turn is committed. */
  onBack?: () => void;
  onCommit: (leave: HungerLeave[]) => void;
}) {
  const { G, viewerId, isActive } = useGameUi();
  const [counts, setCounts] = useState<Counts>(() => {
    const preselected: Counts = {};
    for (const { tileId, pop } of defaultHungerLeave(G, viewerId, unfed))
      preselected[key(tileId, pop)] = (preselected[key(tileId, pop)] ?? 0) + 1;
    return preselected;
  });

  const mouths = hungerMouths(G);
  const chosen = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const rows = G.players[viewerId].settlements.flatMap((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, viewerId);
    return settlement && mouths.some((pop) => settlement.pops[pop] > 0)
      ? [{ tileId, name: settlementNameOf(G.board.tiles, settlement.id), pops: settlement.pops }]
      : [];
  });
  const toggle = (tileId: string, pop: HungerPop, index: number) =>
    setCounts((current) => {
      const n = current[key(tileId, pop)] ?? 0;
      // The marked pops are the first n of their class: a marked one unmarks the
      // last, an unmarked one marks the next, while the count allows.
      if (index < n) return { ...current, [key(tileId, pop)]: n - 1 };
      if (chosen >= unfed) return current;
      return { ...current, [key(tileId, pop)]: n + 1 };
    });
  const leave: HungerLeave[] = Object.entries(counts).flatMap(([k, n]) => {
    const [tileId, pop] = k.split(":") as [string, HungerPop];
    return Array.from({ length: n }, () => ({ tileId, pop }));
  });

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony="wound"
      className="fateCard hungerCard"
      dismissOnBackdrop={false}
      labelledBy="hunger-title"
      onDismiss={onBack}
    >
      <header className="hungerHead">
        <span className="fateKicker label">A lean year · the end of your turn</span>
        <h2 className="display display-xl" id="hunger-title">
          Hunger
        </h2>
        <p className="fateVoice body-em">
          The granary is short. {words(unfed)[0].toUpperCase() + words(unfed).slice(1)}{" "}
          {unfed === 1 ? "household" : "households"} must leave before the next harvest.
        </p>
      </header>

      <CeremonyBlow
        className="blowBand"
        icon={<Ico path="pops/pop-loss" size="tile" />}
        presentation={{
          text: `−${unfed} pops`,
          tone: "negative",
          magnitude: `−${formatNumber(unfed)}`,
          subject: unfed === 1 ? "Pop" : "Pops",
          condition: `choose ${words(unfed)} ${unfed === 1 ? "mouth" : "mouths"} to send away`,
        }}
      />

      <div className="hungerPick">
        {rows.map((row) => (
          <div className="hungerRow" key={row.tileId}>
            <b className="hungerPlace">{row.name}</b>
            <span className="hungerPops">
              {mouths.flatMap((pop) =>
                Array.from({ length: row.pops[pop] }, (_, index) => {
                  const leaves = index < (counts[key(row.tileId, pop)] ?? 0);
                  return (
                    <button
                      aria-label={`${POP_WORD[pop][0]} ${index + 1} of ${row.name}${leaves ? ", leaves" : ""}`}
                      aria-pressed={leaves}
                      className="hungerPop"
                      disabled={!isActive}
                      key={`${pop}-${index}`}
                      onClick={() => toggle(row.tileId, pop, index)}
                      type="button"
                    >
                      <Ico path={`pops/${pop}`} size="ui" />
                    </button>
                  );
                }),
              )}
            </span>
          </div>
        ))}
        <p className="hungerCount caption">
          <span>Slaves eat nothing, so they never leave for hunger.</span>
          <b className={chosen === unfed ? "is-met" : undefined}>
            {chosen} of {unfed} chosen
          </b>
        </p>
      </div>

      <p className="hungerFoot caption">
        <span>Next: your turn ends</span>
        <span>Food returns to 0 · no debt</span>
      </p>
      <div className="hungerActs">
        {onBack ? (
          <button className="ghostVerb verb" onClick={onBack} type="button">
            Go back
          </button>
        ) : null}
        <button
          className="ceremonyCommit verb verb-lg"
          disabled={!isActive || chosen !== unfed}
          onClick={() => onCommit(leave)}
          type="button"
        >
          Let them go
        </button>
      </div>
    </ModalShell>
  );
}
