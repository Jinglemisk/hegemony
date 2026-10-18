import { useEffect, useMemo, useState } from "react";
import {
  CONCESSION_FROM,
  getBuyRiotInsuranceStatus,
  getDemotePopStatus,
  insuranceRollBonus,
  riotRollReach,
} from "../../../game/rules";
import { getRiotTable } from "../../../game/content";
import type {
  LogEntry,
  LogMoment,
  PlayerId,
  Resource,
  TableEffect,
  TableInsuranceOption,
} from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { RESOURCE_ICON, sign } from "../../../ui/frameFormat";
import { placeName } from "../../frame/moments";
import { Ico } from "../../frame/parts";
import { useGameUi } from "../GameUiContext";
import { ceremonyMood, commitVerb } from "./ceremonyMood";
import { EventTableRows } from "./EventTableModal";
import { LacquerDie } from "./LacquerDie";
import { LossCard } from "./LossCard";
import { leaveLines, nextFoot, tokensLine } from "./lossLines";
import type { LossLine } from "./lossLines";
import { ModalShell } from "./ModalShell";

type RiotEntry = LogEntry & { moment: Extract<LogMoment, { kind: "riot" }> };

/** How long the landed die holds the sheet before the result card. */
const ROLL_BEAT_MS = 1600;

const INSURANCE_ICON: Record<TableInsuranceOption["id"], string> = {
  breadDole: "unrest/bread-dole",
  concession: "unrest/concession",
  patronage: "unrest/patronage",
};

function blowIconOf(effect: TableEffect | undefined): string {
  switch (effect?.type) {
    case "losePops":
      return "pops/pop-loss";
    case "loseResource":
      return RESOURCE_ICON[effect.resource];
    case "destroyBuilding":
      return "buildings/ruin";
    default:
      return "unrest/calm";
  }
}

/**
 * The riot, at a committed turn end. The sheet sets insurance against the table: each
 * declared insurance strikes the rows it puts out of reach. The roll lands on the
 * same table, then the result card says what it all cost. Blocking: it mounts while
 * `G.pendingRiot` stands, so the handoff waits for the roll, and the result stays
 * until the seat endures it although the turn has already passed (the parent holds
 * it open via `onRolled` / `onDismissResult`).
 */
export function RiotModal({
  onRolled,
  onDismissResult,
}: {
  onRolled: () => void;
  onDismissResult: () => void;
}) {
  const { G, currentPlayerId, isActive: viewerCanAct, moves } = useGameUi();
  const pending = G.pendingRiot;
  // The riot belongs to the seat that ended its turn, not to whoever is viewing.
  const [seat] = useState<PlayerId>(
    () => pending?.playerID ?? latestRiot(G.log)?.about ?? currentPlayerId,
  );
  const [stage, setStage] = useState<"sheet" | "roll" | "result">(pending ? "sheet" : "result");
  const entry = pending ? null : latestRiot(G.log, seat);

  useEffect(() => {
    if (stage !== "roll" || !entry) return;
    const timer = window.setTimeout(() => setStage("result"), ROLL_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [stage, entry]);

  const riotTable = getRiotTable(G.definition.content);
  const name = G.players[seat].name;

  if (stage === "result" && entry) {
    const moment = entry.moment;
    const row = riotTable.rows.find((candidate) => candidate.roll === moment.modified);
    const first = row?.effects[0];
    const presented = first ? presentTableEffect(first) : null;
    const rolled = moment.modifier ? `${moment.roll} + ${moment.modifier}` : String(moment.roll);
    const insurance = moment.insurance.flatMap((id): LossLine[] => {
      const option = riotTable.insurance?.find((candidate) => candidate.id === id);
      if (!option) return [];
      if (option.demotesPop)
        return [
          {
            key: id,
            icon: "pops/demote",
            text: (
              <>
                A citizen of{" "}
                <b>{moment.concessionTileId ? placeName(G, seat, moment.concessionTileId) : "?"}</b>{" "}
                became a freeman ({option.label.toLowerCase()}).
              </>
            ),
          },
        ];
      return (Object.entries(option.cost) as Array<[Resource, number]>).map(([resource, n]) => ({
        key: `${id}-${resource}`,
        icon: RESOURCE_ICON[resource],
        text: `${n} ${resource} paid for ${option.label.toLowerCase()}.`,
      }));
    });
    return (
      <LossCard
        blow={
          presented?.magnitude
            ? { ...presented, condition: moment.outcomes.join(" ") }
            : {
                text: "No losses",
                tone: "muted",
                magnitude: "0",
                subject: "Losses",
                condition: "the mob goes home",
              }
        }
        blowIcon={blowIconOf(first)}
        commit={commitVerb(ceremonyMood(presented?.tone ?? "neutral"))}
        foot={nextFoot(G, entry)}
        kicker={`Riot · rolled ${rolled}`}
        lines={[
          ...leaveLines(G, seat, moment.left),
          ...insurance,
          tokensLine(moment.tokensCleared, moment.level),
        ]}
        onCommit={onDismissResult}
        title={moment.rowLabel}
      />
    );
  }

  const modifier = entry
    ? entry.moment.modifier
    : insuranceRollBonus(pending?.boughtInsurance ?? [], G.definition.content);
  const reach = riotRollReach(G, modifier);
  const canAct = viewerCanAct && seat === currentPlayerId && Boolean(pending);
  const rolledRecord = entry
    ? {
        tableId: "riot" as const,
        playerID: seat,
        roll: entry.moment.roll,
        modified: entry.moment.modified,
        modifier,
        rowLabel: entry.moment.rowLabel,
        outcomes: entry.moment.outcomes,
        year: entry.year,
      }
    : null;

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony="wound"
      className="riotSheet"
      labelledBy="riot-title"
    >
      <header className="sheetHead">
        <Ico path="unrest/riot" size="disc" />
        <div className="sheetTitle">
          <span className="fateKicker label">Turn end · {name}’s realm</span>
          <h2 className="display" id="riot-title">
            Riot
          </h2>
          <p className="fateVoice body-em">
            The agora fills with angry voices. Declare your concessions before the die decides.
          </p>
        </div>
      </header>

      <div className="sheetBody">
        {stage === "roll" && entry ? (
          <div className="riotRoll">
            <LacquerDie value={entry.moment.roll} />
            <span className="riotSum display num">
              {entry.moment.roll}
              {modifier ? (
                <>
                  {" "}
                  <span className="riotSumMute">+ {modifier} =</span> {entry.moment.modified}
                </>
              ) : null}
            </span>
          </div>
        ) : pending ? (
          <Insurance seat={seat} canAct={canAct} />
        ) : null}
        <section className="sheetCol">
          <h3 className="sheetSec label">
            The table · you roll a d6{modifier ? ` ${sign(modifier)}` : ""}
          </h3>
          <EventTableRows
            links={false}
            reach={reach}
            register="ceremony"
            result={rolledRecord}
            table={riotTable}
          />
          <p className="caption sheetNote">
            {modifier
              ? `With ${sign(modifier)}, the worst you can roll is a ${reach.lowest}.`
              : "Each insurance puts the lowest row out of reach."}
          </p>
        </section>
      </div>

      <footer className="sheetFoot">
        <span className="caption">Losses take slaves first.</span>
        {pending ? (
          <button
            className="ceremonyCommit verb verb-lg"
            disabled={!canAct}
            onClick={() => {
              onRolled();
              setStage("roll");
              moves.resolveRiot();
            }}
            type="button"
          >
            <Ico path="events/die" size="ui" />
            Roll the Die{modifier ? ` · ${sign(modifier)}` : ""}
          </button>
        ) : null}
      </footer>
    </ModalShell>
  );
}

/** The insurance column: three declarations, +1 each, paid now. */
function Insurance({ seat, canAct }: { seat: PlayerId; canAct: boolean }) {
  const { G, moves } = useGameUi();
  const pending = G.pendingRiot!;
  const riotTable = getRiotTable(G.definition.content);
  const held = G.players[seat].resources;
  // Concession targets: every owned settlement with a citizen to demote.
  const targets = useMemo(
    () =>
      G.players[seat].settlements.filter(
        (tileId) => getDemotePopStatus(G, seat, tileId, CONCESSION_FROM).can,
      ),
    [G, seat],
  );
  const [target, setTarget] = useState(0);
  const tileId = targets[Math.min(target, targets.length - 1)];

  return (
    <section className="sheetCol">
      <h3 className="sheetSec label">Insurance · +1 to the roll each</h3>
      <ul className="insRows">
        {(riotTable.insurance ?? []).map((option) => {
          const bought = pending.boughtInsurance.includes(option.id);
          const status = getBuyRiotInsuranceStatus(G, seat, option.id);
          const usable = option.demotesPop ? targets.length > 0 : status.can;
          const [resource, amount] =
            (Object.entries(option.cost) as Array<[Resource, number]>)[0] ?? [];
          return (
            <li
              className={bought ? "insRow is-on" : usable ? "insRow" : "insRow is-off"}
              key={option.id}
            >
              <Ico path={INSURANCE_ICON[option.id]} size="tile" />
              <span className="insWords">
                <b className="title">{option.label}</b>
                {option.demotesPop ? (
                  bought ? (
                    <span className="caption">
                      A citizen of{" "}
                      {pending.concessionTileId
                        ? placeName(G, seat, pending.concessionTileId)
                        : "?"}{" "}
                      became a freeman
                    </span>
                  ) : targets.length ? (
                    <label className="caption insPick">
                      Demote a citizen:
                      <select
                        disabled={!canAct}
                        onChange={(event) => setTarget(Number(event.target.value))}
                        value={Math.min(target, targets.length - 1)}
                      >
                        {targets.map((candidate, index) => (
                          <option key={candidate} value={index}>
                            {placeName(G, seat, candidate)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span className="caption">No citizen to demote</span>
                  )
                ) : (
                  <span className="caption">
                    {amount} {resource} · you hold {resource ? held[resource] : 0}
                  </span>
                )}
              </span>
              <button
                aria-label={`Declare ${option.label.toLowerCase()}`}
                aria-pressed={bought}
                className="insCheck"
                disabled={bought || !canAct || !usable || !status.can}
                onClick={() =>
                  option.demotesPop
                    ? tileId && moves.buyRiotInsurance(option.id, { tileId, from: CONCESSION_FROM })
                    : moves.buyRiotInsurance(option.id)
                }
                type="button"
              >
                {bought ? "✓" : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="caption sheetNote insCleared">
        <Ico path="unrest/unrest" size="ui" />
        Your {pending.tokensCleared} Unrest{" "}
        {pending.tokensCleared === 1 ? "token has" : "tokens have"} cleared.
      </p>
    </section>
  );
}

function latestRiot(log: readonly LogEntry[], seat?: PlayerId): RiotEntry | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const entry = log[index];
    if (entry.moment?.kind === "riot" && (!seat || entry.about === seat)) return entry as RiotEntry;
  }
  return null;
}
