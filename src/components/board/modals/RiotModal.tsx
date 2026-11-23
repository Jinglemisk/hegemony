import { useEffect, useMemo, useState } from "react";
import {
  CONCESSION_FROM,
  getBuyRiotInsuranceStatus,
  getDemotePopStatus,
  getResolveRiotPopStatus,
  insuranceRollBonus,
  riotPopNext,
  riotRollReach,
} from "../../../game/rules";
import { getRiotTable } from "../../../game/content";
import type {
  HegemonyState,
  LogEntry,
  LogMoment,
  PlayerId,
  Resource,
  Resources,
  TableEffect,
  TableInsuranceOption,
} from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { AnnotatedText, Prose } from "../../AnnotatedText";
import { placeName } from "../../frame/moments";
import { Ico } from "../../frame/parts";
import type { GameCommand } from "../../../game/legalMoves";
import { playOnCopy, previewSpend } from "../../../ui/confirmPreview";
import { useConfirm } from "../../chrome/confirmContext";
import { ConfirmDetail } from "../../chrome/confirmDetail";
import { useGameUi } from "../GameUiContext";
import { ceremonyMood, commitVerb } from "./ceremonyMood";
import { EventTableRows } from "./EventTableRows";
import { LacquerDie } from "./LacquerDie";
import { LossCard } from "./LossCard";
import { leaveLines, nextFoot, tokensLine } from "./lossLines";
import type { LossLine } from "./lossLines";
import { ModalShell } from "./ModalShell";

type RiotEntry = LogEntry & { moment: Extract<LogMoment, { kind: "riot" }> };

/** An insurance chosen on the sheet, paid only when the die is rolled. */
type Declared = { optionId: TableInsuranceOption["id"]; tileId?: string };

const declareCommand = ({ optionId, tileId }: Declared): GameCommand => ({
  type: "buyRiotInsurance",
  optionId,
  ...(tileId ? { demoteTarget: { tileId, from: CONCESSION_FROM } } : {}),
});

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
      return RESOURCE_RASTERS[effect.resource];
    case "destroyBuilding":
      return "buildings/ruin";
    default:
      return "unrest/calm";
  }
}

/**
 * The riot, at a committed turn end. The sheet sets insurance against the table: each
 * declared insurance strikes the rows it puts out of reach. The roll lands on the
 * same table. A seat holding development cards then answers each pop the row takes:
 * lose it, or give up a held card drawn at random. Then the result card says what it
 * all cost. Blocking: it mounts while `G.pendingRiot` stands, so the handoff waits for
 * the roll and the answers, and the result stays until the seat endures it although
 * the turn has already passed (the parent holds it open via `onRolled` /
 * `onDismissResult`).
 */
export function RiotModal({
  onRolled,
  onDismissResult,
}: {
  onRolled: () => void;
  onDismissResult: () => void;
}) {
  const { G, currentPlayerId, isActive: viewerCanAct, moves } = useGameUi();
  const ask = useConfirm();
  const pending = G.pendingRiot;
  const [declared, setDeclared] = useState<Declared[]>([]);
  // The riot belongs to the seat that ended its turn, not to whoever is viewing.
  const [seat] = useState<PlayerId>(
    () => pending?.playerID ?? latestRiot(G.log)?.about ?? currentPlayerId,
  );
  const [stage, setStage] = useState<"sheet" | "roll" | "pay" | "result">(
    pending ? (pending.losses ? "pay" : "sheet") : "result",
  );
  const entry = pending ? null : latestRiot(G.log, seat);
  // The die as it landed: the riot's line once it closed, the record while its pops wait.
  const paying = Boolean(pending?.losses);
  const rolled = entry ? entry.moment : paying ? G.lastTableRoll : null;
  const landed = Boolean(rolled);

  useEffect(() => {
    if (stage !== "roll" || !landed) return;
    const timer = window.setTimeout(() => setStage(paying ? "pay" : "result"), ROLL_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [stage, landed, paying]);

  const riotTable = getRiotTable(G.definition.content);
  const name = G.players[seat].name;

  // The last answer closes the riot: its result follows the answers.
  if ((stage === "result" || stage === "pay") && entry) {
    const moment = entry.moment;
    const row = riotTable.rows.find((candidate) => candidate.roll === moment.modified);
    const first = row?.effects[0];
    const presented = first ? presentTableEffect(first) : null;
    // The roll is said nowhere else on the card, so the foot carries it.
    const rolled = moment.modifier ? `${moment.roll} + ${moment.modifier}` : String(moment.roll);
    const foot = nextFoot(G, entry);
    const insurance = moment.insurance.flatMap((id): LossLine[] => {
      const option = riotTable.insurance?.find((candidate) => candidate.id === id);
      if (!option) return [];
      if (option.demotesPop)
        return [
          {
            key: id,
            icon: "pops/demote",
            text: (
              <Prose links={false}>
                A citizen of{" "}
                <b>{moment.concessionTileId ? placeName(G, seat, moment.concessionTileId) : "?"}</b>{" "}
                became a freeman ({option.label.toLowerCase()}).
              </Prose>
            ),
          },
        ];
      return (Object.entries(option.cost) as Array<[Resource, number]>).map(([resource, n]) => ({
        key: `${id}-${resource}`,
        icon: RESOURCE_RASTERS[resource],
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
        foot={{ ...foot, when: `Rolled ${rolled} · ${foot.when}` }}
        kicker="Riot"
        lines={[
          ...leaveLines(G, seat, moment.left),
          ...cardLines(G, moment.cards),
          ...insurance,
          tokensLine(moment.tokensCleared, moment.level),
        ]}
        onCommit={onDismissResult}
        title={moment.rowLabel}
      />
    );
  }

  // The chosen insurance as the engine would take it, in order: null when one would not go.
  const commands = declared.map(declareCommand);
  const declaredState = pending && !paying ? playOnCopy(G, seat, commands) : null;
  const modifier = rolled
    ? rolled.modifier
    : insuranceRollBonus(
        [...(pending?.boughtInsurance ?? []), ...declared.map((choice) => choice.optionId)],
        G.definition.content,
      );
  const reach = riotRollReach(G, modifier);
  const die = riotTable.die ?? 6;
  const canAct = viewerCanAct && seat === currentPlayerId && Boolean(pending);
  const rolledRecord = rolled
    ? {
        tableId: "riot" as const,
        playerID: seat,
        roll: rolled.roll,
        modified: rolled.modified,
        modifier,
        rowLabel: rolled.rowLabel,
        outcomes: rolled.outcomes,
        year: entry?.year ?? G.year,
      }
    : null;
  const next = paying ? riotPopNext(G, seat) : null;

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
            {paying
              ? "The die has spoken. The mob will take a pop, or a card in its place."
              : "The agora fills with angry voices. Declare your concessions before the die decides."}
          </p>
        </div>
      </header>

      <div className="sheetBody">
        {stage === "roll" && rolled ? (
          <div className="riotRoll">
            <LacquerDie value={rolled.roll} />
            <span className="riotSum display num">
              {rolled.roll}
              {modifier ? (
                <>
                  {" "}
                  <span className="riotSumMute">+ {modifier} =</span> {rolled.modified}
                </>
              ) : null}
            </span>
          </div>
        ) : paying ? (
          <RiotPops seat={seat} />
        ) : pending ? (
          <Insurance
            after={declaredState ?? G}
            canAct={canAct}
            declared={declared}
            onToggle={(choice) =>
              setDeclared((current) =>
                current.some((one) => one.optionId === choice.optionId)
                  ? current.filter((one) => one.optionId !== choice.optionId)
                  : [...current, choice],
              )
            }
            seat={seat}
          />
        ) : null}
        <section className="sheetCol">
          <h3 className="sheetSec label">The table</h3>
          <EventTableRows
            links={false}
            reach={reach}
            register="ceremony"
            result={rolledRecord}
            table={riotTable}
          />
          <p className="caption sheetNote">
            {modifier
              ? `You roll a d${die} ${formatSignedNumber(modifier)}: the worst you can roll is a ${reach.lowest}.`
              : `You roll a d${die}. Each insurance puts the lowest row out of reach.`}
          </p>
        </section>
      </div>

      <footer className="sheetFoot">
        <span className="caption">
          <Prose links={false}>Losses take slaves first.</Prose>
        </span>
        {paying && stage === "pay" ? (
          <span className="hungerActs">
            <button
              className="ghostVerb verb"
              disabled={!canAct || !getResolveRiotPopStatus(G, seat, "pop").can}
              onClick={() => {
                onRolled();
                moves.resolveRiotPop("pop");
              }}
              type="button"
            >
              Lose the {next ? formatPopLabel(next.pop, 1) : "pop"}
            </button>
            <button
              className="ceremonyCommit verb verb-lg"
              disabled={!canAct || !getResolveRiotPopStatus(G, seat, "card").can}
              onClick={() => {
                onRolled();
                moves.resolveRiotPop("card");
              }}
              type="button"
            >
              <Ico path="events/convoy" size="ui" />
              Give Up a Card
            </button>
          </span>
        ) : pending && !paying ? (
          <button
            className="ceremonyCommit verb verb-lg"
            disabled={!canAct || (declared.length > 0 && !declaredState)}
            onClick={() => {
              const roll = () => {
                onRolled();
                setStage("roll");
                for (const choice of declared)
                  moves.buyRiotInsurance(
                    choice.optionId,
                    choice.tileId ? { tileId: choice.tileId, from: CONCESSION_FROM } : undefined,
                  );
                moves.resolveRiot();
              };
              if (!declared.length) return roll();
              const { changes } = previewSpend(G, seat, { command: commands });
              const concession = declared.find((choice) => choice.tileId)?.tileId;
              ask({
                icon: "events/die",
                question: `Are you sure you want to pay for ${declared.length === 1 ? "this insurance" : `${declared.length} insurances`} and roll the die?`,
                detail: (
                  <ConfirmDetail
                    changes={changes}
                    cost={declaredCost(G, declared)}
                    note={
                      concession
                        ? `A citizen of ${placeName(G, seat, concession)} becomes a freeman.`
                        : null
                    }
                  />
                ),
                verb: "Roll the die",
                onYes: roll,
              });
            }}
            type="button"
          >
            <Ico path="events/die" size="ui" />
            Roll the Die{modifier ? ` · ${formatSignedNumber(modifier)}` : ""}
          </button>
        ) : null}
      </footer>
    </ModalShell>
  );
}

/**
 * The rolled riot's pops, one at a time: what the next one is, and the hand that may
 * stand in for it. The hand shows only its count, so nobody sees which card would go.
 */
function RiotPops({ seat }: { seat: PlayerId }) {
  const { G } = useGameUi();
  const losses = G.pendingRiot!.losses!;
  const next = riotPopNext(G, seat);
  const held = G.devHands[seat].length;
  const owed = losses.owed;
  return (
    <section className="sheetCol">
      <h3 className="sheetSec label">Pops or cards</h3>
      <p className="body">
        <Prose links={false}>
          {`${owed === 1 ? "One pop" : `${owed} pops`} to answer. For each, lose it or give up a held card drawn at random.`}
        </Prose>
      </p>
      <ul className="insRows">
        {next ? (
          <li className="insRow">
            <Ico path={`pops/${next.pop}`} size="tile" />
            <span className="insWords">
              <b className="title">Next to go</b>
              <span className="caption">
                A {formatPopLabel(next.pop, 1)} from {placeName(G, seat, next.tileId)}
              </span>
            </span>
          </li>
        ) : null}
        <li className="insRow">
          <Ico path="events/convoy" size="tile" />
          <span className="insWords">
            <b className="title">Held cards</b>
            <span className="caption">
              {held} in hand{losses.cards.length ? `, ${losses.cards.length} given up` : ""}
            </span>
          </span>
        </li>
      </ul>
      <p className="caption sheetNote">
        The card is drawn after you choose. It is discarded, not played.
      </p>
    </section>
  );
}

/** "Caravan went in place of a pop." — one line per card a riot took. */
function cardLines(G: HegemonyState, cards: readonly string[]): LossLine[] {
  return cards.map((cardId, index) => ({
    key: `card-${index}`,
    icon: "events/convoy",
    text: `${G.definition.content.devCards.find((card) => card.id === cardId)?.name ?? "A card"} went in place of a pop.`,
  }));
}

/** What the chosen insurance costs in stores, summed from the table. */
function declaredCost(G: HegemonyState, declared: readonly Declared[]): Partial<Resources> {
  const table = getRiotTable(G.definition.content).insurance ?? [];
  const cost: Partial<Resources> = {};
  for (const { optionId } of declared)
    for (const [resource, n] of Object.entries(
      table.find((option) => option.id === optionId)?.cost ?? {},
    ) as Array<[Resource, number]>)
      cost[resource] = (cost[resource] ?? 0) + n;
  return cost;
}

/**
 * The insurance column: each declaration a choice, once, paid only when the die is
 * rolled (one confirm for them all). Whether one more can be chosen is the engine's
 * status on the state after the ones already chosen (`after`).
 */
function Insurance({
  seat,
  canAct,
  declared,
  after,
  onToggle,
}: {
  seat: PlayerId;
  canAct: boolean;
  declared: readonly Declared[];
  after: HegemonyState;
  onToggle: (choice: Declared) => void;
}) {
  const { G } = useGameUi();
  const pending = G.pendingRiot!;
  const riotTable = getRiotTable(G.definition.content);
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
  // The bonus is data: one number when every option adds the same.
  const bonuses = new Set((riotTable.insurance ?? []).map((option) => option.modifier));
  const uniform = bonuses.size === 1 ? [...bonuses][0] : null;

  return (
    <section className="sheetCol">
      <h3 className="sheetSec label">Insurance</h3>
      <ul className="insRows">
        {(riotTable.insurance ?? []).map((option) => {
          const bought = pending.boughtInsurance.includes(option.id);
          const chosen = declared.find((choice) => choice.optionId === option.id);
          const status = getBuyRiotInsuranceStatus(after, seat, option.id);
          const usable = option.demotesPop ? targets.length > 0 : status.can;
          const open = chosen !== undefined || (usable && status.can);
          const [resource, amount] =
            (Object.entries(option.cost) as Array<[Resource, number]>)[0] ?? [];
          const concessionAt = bought ? pending.concessionTileId : chosen?.tileId;
          return (
            <li
              className={bought || chosen ? "insRow is-on" : usable ? "insRow" : "insRow is-off"}
              key={option.id}
            >
              <Ico path={INSURANCE_ICON[option.id]} size="tile" />
              <span className="insWords">
                <b className="title">{option.label}</b>
                {option.demotesPop ? (
                  concessionAt ? (
                    <span className="caption">
                      <Prose links={false}>
                        {`A citizen of ${placeName(G, seat, concessionAt)} ${bought ? "became" : "becomes"} a freeman`}
                      </Prose>
                    </span>
                  ) : targets.length ? (
                    <label className="caption insPick">
                      <Prose links={false}>Demote a citizen:</Prose>
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
                    <span className="caption">
                      <Prose links={false}>No citizen to demote</Prose>
                    </span>
                  )
                ) : (
                  <AnnotatedText
                    className="caption"
                    links={false}
                    text={`${amount ?? 0} ${resource ?? ""} · ${formatSignedNumber(option.modifier)}`}
                  />
                )}
                {/* Why it cannot be chosen; the concession says so above. */}
                {!bought && !chosen && !status.can && (usable || !option.demotesPop) ? (
                  <span className="caption">{status.reasons[0]}</span>
                ) : null}
              </span>
              <button
                aria-label={`Declare ${option.label.toLowerCase()}`}
                aria-pressed={bought || chosen !== undefined}
                className="insCheck"
                disabled={bought || !canAct || !open}
                onClick={() =>
                  onToggle(
                    option.demotesPop && tileId
                      ? { optionId: option.id, tileId }
                      : { optionId: option.id },
                  )
                }
                type="button"
              >
                {bought || chosen ? "✓" : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="caption sheetNote">
        Each one declared adds {uniform !== null ? `${formatSignedNumber(uniform)}` : "its bonus"}{" "}
        to the roll, paid when you roll the die.
      </p>
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
