import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
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
  EventTableDefinition,
  HegemonyState,
  LogEntry,
  LogMoment,
  PlayerId,
  Resource,
  Resources,
  RiotInsuranceId,
  RiotLosses,
  RiotPay,
  TableInsuranceOption,
} from "../../../game/types";
import type { GameCommand } from "../../../game/legalMoves";
import { riotRowFace } from "../../../ui/cardFace";
import { playOnCopy, previewSpend } from "../../../ui/confirmPreview";
import { RESOURCE_LABELS, formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { Prose } from "../../AnnotatedText";
import { GameCard } from "../../cards/GameCard";
import { useConfirm } from "../../chrome/confirmContext";
import { ConfirmDetail } from "../../chrome/confirmDetail";
import { Lacquer, Plaque } from "../../chrome/controls";
import { placeName } from "../../frame/moments";
import { Delta, Ico, Tip, TipBody, TipWarn } from "../../frame/parts";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { LacquerDie } from "./LacquerDie";
import { LossSheet, LossSpread, SoBeIt } from "./LossSheet";
import { nextFoot, takenLines, tokensLine } from "./lossLines";
import { TUMBLE_MS, prefersReducedMotion } from "./roll";
import type { LossLine } from "./lossLines";

type RiotEntry = LogEntry & { moment: Extract<LogMoment, { kind: "riot" }> };

/** An insurance chosen on the sheet, paid only when the die is rolled. */
type Declared = { optionId: RiotInsuranceId; tileId?: string };

/** Sheet → roll → (pay: a pop or a card, while the engine asks) → result. */
type Stage = "sheet" | "roll" | "pay" | "result";

const declareCommand = ({ optionId, tileId }: Declared): GameCommand => ({
  type: "buyRiotInsurance",
  optionId,
  ...(tileId ? { demoteTarget: { tileId, from: CONCESSION_FROM } } : {}),
});

/** How long the landed die holds the table, its card lit, before the card is read. */
const HOLD_MS = 700;

const CARD_TITLE_ID = "riot-card-title";

const INSURANCE_ICON: Record<RiotInsuranceId, string> = {
  breadDole: "unrest/bread-dole",
  concession: "unrest/concession",
  patronage: "unrest/patronage",
};

/**
 * The riot, at a committed turn end, on one sheet of one size from first to last. The
 * table is six cards, one per face of the die; each insurance chosen seals the lowest
 * card still open. The roll tumbles about a second and lights the card it found. That
 * card is then read in the shared format, one line for each thing it took, before and
 * after, from the engine's own record. While the seat holds development cards the engine
 * asks, pop by pop, whether a card goes instead, and the choice sits on that card.
 * Blocking: it mounts while `G.pendingRiot` stands, and the result stays until the seat
 * closes it although the turn has passed (the parent holds it via `onRolled` /
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
  const [stage, setStage] = useState<Stage>(
    pending ? (pending.losses ? "pay" : "sheet") : "result",
  );
  const [dieDown, setDieDown] = useState(false);
  const [still] = useState(prefersReducedMotion);
  const entry = pending ? null : latestRiot(G.log, seat);
  const losses = pending?.losses ?? null;
  // The die as it landed: the riot's line once it closed, the record while its pops wait.
  const rolled = entry ? entry.moment : losses ? G.lastTableRoll : null;
  const landed = Boolean(rolled);
  const after: Stage = losses ? "pay" : "result";

  useEffect(() => {
    if (stage !== "roll" || !landed) return;
    const down = window.setTimeout(() => setDieDown(true), still ? 0 : TUMBLE_MS);
    const read = window.setTimeout(() => setStage(after), still ? 0 : TUMBLE_MS + HOLD_MS);
    return () => {
      window.clearTimeout(down);
      window.clearTimeout(read);
    };
  }, [stage, landed, after, still]);

  // Stillness skips the tumble; the last answer closes the riot and its result follows.
  const shown: Stage =
    stage === "roll" && landed && still ? after : stage === "pay" && entry ? "result" : stage;

  // Focus lands on a safe control: the first insurance (a toggle) on the sheet, the
  // commit on the result. Otherwise the sheet itself holds it, never the board.
  const firstTile = useRef<HTMLButtonElement>(null);
  const commit = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target =
        shown === "sheet" ? firstTile.current : shown === "result" ? commit.current : null;
      (target ?? document.querySelector<HTMLElement>(".riotSheet"))?.focus();
    });
    return () => window.clearTimeout(timer);
  }, [shown]);

  const table = getRiotTable(G.definition.content);
  const options = table.insurance ?? [];
  const kicker = `Turn end · ${G.players[seat].name}’s realm`;

  if (shown === "result") {
    if (!entry) return null;
    const moment = entry.moment;
    const foot = nextFoot(G, entry);
    // The roll is said nowhere else on the sheet, so the foot carries it.
    const sum = moment.modifier ? `${moment.roll} + ${moment.modifier}` : String(moment.roll);
    const taken: LossLine[] = moment.taken
      ? takenLines(G, seat, moment.taken)
      : // A save from before the engine kept the counts: its words, as written.
        moment.outcomes.map((text, index) => ({
          key: `said-${index}`,
          icon: "unrest/riot",
          text,
        }));
    return (
      <LossSheet
        act={<SoBeIt next={foot.next} onClick={onDismissResult} ref={commit} />}
        icon="unrest/riot"
        kicker={kicker}
        labelledBy={CARD_TITLE_ID}
        note={`Rolled ${sum} · ${foot.when} · ${foot.next}`}
        title="Riot"
        voice="The die has spoken."
      >
        <LossSpread
          face={riotRowFace(rowOf(table, moment.modified))}
          lines={[
            ...(taken.length ? taken : [NO_LOSSES]),
            ...insuranceLines(G, seat, moment.insurance, moment.concessionTileId),
            tokensLine(moment.tokensCleared, moment.level),
          ]}
          titleId={CARD_TITLE_ID}
        />
      </LossSheet>
    );
  }

  const canAct = viewerCanAct && seat === currentPlayerId && Boolean(pending);

  if (shown === "pay" && losses && rolled) {
    const answer = (pay: RiotPay) => {
      onRolled();
      moves.resolveRiotPop(pay);
    };
    const lines = takenLines(G, seat, losses.taken);
    return (
      <LossSheet
        icon="unrest/riot"
        kicker={kicker}
        note="The card is drawn after you choose. It is discarded, not played."
        title="Riot"
        voice="The die has spoken. The mob will take a pop, or a card in its place."
      >
        <LossSpread
          face={riotRowFace(rowOf(table, rolled.modified))}
          lines={lines.length ? lines : [NOTHING_YET]}
          titleId={CARD_TITLE_ID}
        >
          <RiotChoice canAct={canAct} losses={losses} onAnswer={answer} seat={seat} />
        </LossSpread>
      </LossSheet>
    );
  }

  // The insurance in the order it seals: what the engine holds, then what is chosen.
  const bought = entry?.moment.insurance ?? pending?.boughtInsurance ?? [];
  const order = [
    ...bought,
    ...declared.map((choice) => choice.optionId).filter((id) => !bought.includes(id)),
  ];
  const sheet = stage === "sheet" && Boolean(pending) && !losses;
  const commands = declared.map(declareCommand);
  // The chosen insurance as the engine would take it: null when one would not go.
  const declaredState = sheet ? playOnCopy(G, seat, commands) : null;
  const modifier = rolled ? rolled.modifier : insuranceRollBonus(order, G.definition.content);
  const reach = riotRollReach(G, modifier);
  const die = table.die ?? 6;
  const tokens = pending?.tokensCleared ?? entry?.moment.tokensCleared ?? 0;

  const roll = () => {
    const go = () => {
      onRolled();
      setStage("roll");
      for (const choice of declared)
        moves.buyRiotInsurance(
          choice.optionId,
          choice.tileId ? { tileId: choice.tileId, from: CONCESSION_FROM } : undefined,
        );
      moves.resolveRiot();
    };
    if (!declared.length) return go();
    const { changes } = previewSpend(G, seat, { command: commands });
    const concession = declared.find((choice) => choice.tileId)?.tileId;
    ask({
      icon: "events/die",
      question: `Are you sure you want to pay for ${declared.length === 1 ? "this insurance" : `${declared.length} insurances`} and roll the die?`,
      detail: (
        <ConfirmDetail
          changes={changes}
          cost={declaredCost(options, declared)}
          note={
            concession ? `A citizen of ${placeName(G, seat, concession)} becomes a freeman.` : null
          }
        />
      ),
      verb: "Roll the die",
      onYes: go,
    });
  };

  return (
    <LossSheet
      act={
        stage === "roll" ? (
          <span aria-live="polite" className="riotRoll">
            {rolled ? (
              <>
                <LacquerDie value={rolled.roll} />
                <span
                  className={dieDown ? "riotSum stat-lg num" : "riotSum stat-lg num is-waiting"}
                >
                  {rolled.roll}
                  {modifier ? ` + ${modifier} → ${rolled.modified}` : ""}
                </span>
              </>
            ) : null}
          </span>
        ) : (
          <Tooltip
            content={
              <Tip title="Roll the die">
                <TipBody>
                  {modifier
                    ? `Roll a d${die} ${formatSignedNumber(modifier)}, and pay the insurance you chose.`
                    : `Roll a d${die} with no insurance.`}
                </TipBody>
                {declared.length && !declaredState ? (
                  <TipWarn>The insurance chosen cannot all be paid.</TipWarn>
                ) : null}
              </Tip>
            }
            preferredPlacement="above"
          >
            <Lacquer
              className="sheetAct"
              disabled={!canAct || (declared.length > 0 && !declaredState)}
              onClick={roll}
            >
              <Ico path="events/die" size="ui" />
              Roll the die
            </Lacquer>
          </Tooltip>
        )
      }
      icon="unrest/riot"
      kicker={kicker}
      note={
        <Prose links={false}>
          {`Your ${tokens} Unrest ${tokens === 1 ? "token has" : "tokens have"} cleared. Losses take slaves first.`}
        </Prose>
      }
      title="Riot"
      voice="The agora fills with angry voices. Declare your concessions before the die decides."
    >
      <section aria-labelledby="riot-table-label" className="riotSec">
        <div className="sheetSecRow">
          <span className="sheetSec label" id="riot-table-label">
            The table
          </span>
          <span className="caption">
            {modifier
              ? `You roll a d${die} ${formatSignedNumber(modifier)}: the worst you can roll is a ${reach.lowest}.`
              : `You roll a d${die}. Each insurance seals the lowest card still open.`}
          </span>
        </div>
        <RiotFaces
          hit={dieDown && rolled ? rolled.modified : null}
          seals={sealsOf(order, options, reach.lowest)}
          table={table}
        />
      </section>
      <section aria-labelledby="riot-insurance-label" className="riotSec">
        <div className="sheetSecRow">
          <span className="sheetSec label" id="riot-insurance-label">
            Insurance
          </span>
          <span className="caption">Each adds to the roll. Paid when you roll the die.</span>
        </div>
        <InsuranceTiles
          after={sheet ? (declaredState ?? G) : null}
          bought={bought}
          canAct={canAct}
          declared={declared}
          firstRef={firstTile}
          onRetarget={(tileId) =>
            setDeclared((current) =>
              current.map((choice) => (choice.tileId ? { ...choice, tileId } : choice)),
            )
          }
          onToggle={(choice) =>
            setDeclared((current) =>
              current.some((one) => one.optionId === choice.optionId)
                ? current.filter((one) => one.optionId !== choice.optionId)
                : [...current, choice],
            )
          }
          seat={seat}
        />
      </section>
    </LossSheet>
  );
}

const NO_LOSSES: LossLine = {
  key: "none",
  icon: "unrest/calm",
  text: "No losses: the mob goes home",
  muted: true,
};

const NOTHING_YET: LossLine = {
  key: "none",
  icon: "unrest/riot",
  text: "Nothing yet: each pop is yours to answer",
  muted: true,
};

function rowOf(table: EventTableDefinition, modified: number) {
  return table.rows.find((row) => row.roll === modified) ?? table.rows[table.rows.length - 1];
}

/** Which insurance seals each face: in the order chosen, each its bonus's worth of the
 *  lowest faces still open, never past the lowest the engine says a roll can reach. */
function sealsOf(
  order: readonly RiotInsuranceId[],
  options: readonly TableInsuranceOption[],
  lowest: number,
) {
  const seals = new Map<number, TableInsuranceOption>();
  let face = 1;
  for (const id of order) {
    const option = options.find((candidate) => candidate.id === id);
    for (let step = 0; option && step < option.modifier && face < lowest; step += 1) {
      seals.set(face, option);
      face += 1;
    }
  }
  return seals;
}

/**
 * The six faces of the die as small cards. A sealed face wears its insurance's seal and
 * stays readable; once the die lands, the face it found is ringed. The rest keep their
 * full ink: a faded face fails the contrast floor.
 */
function RiotFaces({
  table,
  seals,
  hit,
}: {
  table: EventTableDefinition;
  seals: ReadonlyMap<number, TableInsuranceOption>;
  hit: number | null;
}) {
  return (
    <ol className="riotFaces">
      {table.rows.map((row) => {
        const seal = seals.get(row.roll);
        const landed = hit === row.roll;
        return (
          <li
            className={["riotFace", seal ? "is-sealed" : null, landed ? "is-hit" : null]
              .filter(Boolean)
              .join(" ")}
            key={row.roll}
          >
            <GameCard
              className={landed ? "is-picked" : undefined}
              face={riotRowFace(row)}
              size="hand"
            />
            {seal ? (
              <span className="riotSeal">
                <span className="riotSealDisc">
                  <Ico path={INSURANCE_ICON[seal.id]} size="ui" />
                </span>
                <span className="riotSealWord label">
                  Sealed<span className="visuallyHidden"> by {seal.label}</span>
                </span>
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The three insurances as toggle tiles, each saying in one line what it takes: its
 * cost, and the store or the settlement before and after, read off the engine playing
 * the choice on a copy (`after` for one chosen; the choice with this one added for one
 * not). Whether one more can be chosen is the engine's status on that copy. Once the
 * die is cast (`after` null) the tiles only show what was chosen. The line lies over
 * its tile, outside the toggle, so the Concession's settlement can be a control of its
 * own; a click anywhere else on it falls through to the toggle.
 */
function InsuranceTiles({
  seat,
  canAct,
  declared,
  bought,
  after,
  onToggle,
  onRetarget,
  firstRef,
}: {
  seat: PlayerId;
  canAct: boolean;
  declared: readonly Declared[];
  bought: readonly RiotInsuranceId[];
  after: HegemonyState | null;
  onToggle: (choice: Declared) => void;
  onRetarget: (tileId: string) => void;
  firstRef: Ref<HTMLButtonElement>;
}) {
  const { G } = useGameUi();
  const options = getRiotTable(G.definition.content).insurance ?? [];
  // Concession targets: every owned settlement with a citizen to demote.
  const targets = useMemo(
    () =>
      G.players[seat].settlements.filter(
        (tileId) => getDemotePopStatus(G, seat, tileId, CONCESSION_FROM).can,
      ),
    [G, seat],
  );
  const [target, setTarget] = useState<string | undefined>();
  const tileId = target && targets.includes(target) ? target : targets[0];

  return (
    <ul className="riotTiles">
      {options.map((option, index) => {
        const chosen = declared.find((choice) => choice.optionId === option.id);
        const on = bought.includes(option.id) || chosen !== undefined;
        const status = after ? getBuyRiotInsuranceStatus(after, seat, option.id) : null;
        const blocked =
          option.demotesPop && !targets.length
            ? "No citizen to demote."
            : !on && status && !status.can
              ? status.reasons[0]
              : null;
        const locked = !after || !canAct || bought.includes(option.id);
        const choice: Declared =
          option.demotesPop && tileId ? { optionId: option.id, tileId } : { optionId: option.id };
        const preview = !after
          ? null
          : on
            ? after
            : playOnCopy(G, seat, [...declared, choice].map(declareCommand));
        const [resource] = Object.keys(option.cost) as Resource[];
        const price = option.demotesPop
          ? "A citizen demoted"
          : `${option.cost[resource]} ${RESOURCE_LABELS[resource]}`;
        const lineId = `riot-line-${option.id}`;
        return (
          <li className={on ? "riotTile is-on" : "riotTile"} key={option.id}>
            <Tooltip
              content={
                <Tip title={option.label}>
                  <TipBody>
                    {`${option.demotesPop ? "A citizen of the settlement you pick becomes a freeman" : `Pay ${price}`} when you roll. It seals the lowest card still open: ${formatSignedNumber(option.modifier)} to the roll.`}
                  </TipBody>
                  {blocked ? <TipWarn>{blocked}</TipWarn> : null}
                </Tip>
              }
              triggerClassName="riotTileTip"
            >
              <Plaque
                aria-describedby={lineId}
                aria-pressed={on}
                className="riotToggle"
                disabled={locked || Boolean(blocked)}
                onClick={() => onToggle(choice)}
                ref={index === 0 ? firstRef : undefined}
              >
                <Ico path={INSURANCE_ICON[option.id]} size="tile" />
                <span className="title">{option.label}</span>
                <span className="riotTileBonus stat num">
                  {formatSignedNumber(option.modifier)}
                </span>
              </Plaque>
            </Tooltip>
            <span className="riotTileLine caption" id={lineId}>
              {option.demotesPop ? (
                <ConcessionLine
                  disabled={locked}
                  onPick={(picked) => {
                    setTarget(picked);
                    onRetarget(picked);
                  }}
                  preview={preview}
                  seat={seat}
                  targets={targets}
                  tileId={chosen?.tileId ?? tileId}
                />
              ) : (
                <>
                  <Prose links={false}>{on && !after ? `Paid ${price}` : `Costs ${price}`}</Prose>
                  {preview ? (
                    <>
                      {` · ${RESOURCE_LABELS[resource]} `}
                      <Delta
                        from={G.players[seat].resources[resource]}
                        to={preview.players[seat].resources[resource]}
                      />
                    </>
                  ) : null}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The Concession's line: whose citizen it demotes, the settlement a plaque that opens
 * a short list of the others when there are several, and that settlement's citizens
 * before and after (`preview`).
 */
function ConcessionLine({
  seat,
  targets,
  tileId,
  disabled,
  preview,
  onPick,
}: {
  seat: PlayerId;
  targets: readonly string[];
  tileId: string | undefined;
  disabled: boolean;
  preview: HegemonyState | null;
  onPick: (tileId: string) => void;
}) {
  const { G } = useGameUi();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  if (!tileId) return <>No citizen to demote</>;
  const citizens = (state: HegemonyState, at: string) =>
    state.board.tiles
      .find((tile) => tile.id === at)
      ?.settlements.find((settlement) => settlement.owner === seat)?.pops.citizens ?? 0;
  const name = placeName(G, seat, tileId);

  return (
    <>
      <Prose links={false}>A citizen in</Prose>{" "}
      {targets.length < 2 ? (
        name
      ) : (
        <Tooltip
          content={
            <Tip title="Whose citizen">
              <TipBody>{`Pick the settlement whose citizen becomes a freeman. Now ${name}.`}</TipBody>
            </Tip>
          }
          preferredPlacement="above"
          triggerClassName="riotPickTip"
        >
          <Plaque
            aria-expanded={open}
            aria-haspopup="dialog"
            className="riotPick"
            disabled={disabled}
            onClick={() => setOpen(true)}
            ref={anchor}
          >
            {name}
            <span aria-hidden="true">▾</span>
          </Plaque>
        </Tooltip>
      )}{" "}
      is demoted
      {preview ? (
        <>
          {" · Citizens "}
          <Delta from={citizens(G, tileId)} to={citizens(preview, tileId)} />
        </>
      ) : null}
      {open ? (
        <Popover
          anchor={anchor}
          ariaLabel="Whose citizen"
          className="riotPicker"
          dismissOnOutside
          focusFirst
          onDismiss={() => setOpen(false)}
          preferredPlacement="above"
        >
          <span className="label">Whose citizen</span>
          <div className="riotPickList">
            {targets.map((candidate) => {
              const place = placeName(G, seat, candidate);
              return (
                <Tooltip
                  content={
                    <Tip title={place}>
                      <TipBody>{`A citizen of ${place} becomes a freeman.`}</TipBody>
                    </Tip>
                  }
                  key={candidate}
                  side="right"
                >
                  <Plaque
                    aria-pressed={candidate === tileId}
                    onClick={() => {
                      onPick(candidate);
                      setOpen(false);
                    }}
                  >
                    <span>{place}</span>
                    <span className="num">{citizens(G, candidate)}</span>
                    <Ico path="pops/citizens" size="chip" />
                  </Plaque>
                </Tooltip>
              );
            })}
          </div>
        </Popover>
      ) : null}
    </>
  );
}

/**
 * The pops the roll took, one at a time, while the seat holds a card that may stand in
 * for one: what goes next, the hand's count (never which card), and the two answers.
 */
function RiotChoice({
  seat,
  losses,
  canAct,
  onAnswer,
}: {
  seat: PlayerId;
  losses: RiotLosses;
  canAct: boolean;
  onAnswer: (pay: RiotPay) => void;
}) {
  const { G } = useGameUi();
  const next = riotPopNext(G, seat);
  const held = G.devHands[seat].length;
  const pop = next ? formatPopLabel(next.pop, 1) : "pop";
  const where = next ? placeName(G, seat, next.tileId) : null;
  const popStatus = getResolveRiotPopStatus(G, seat, "pop");
  const cardStatus = getResolveRiotPopStatus(G, seat, "card");
  const { owed } = losses;
  return (
    <div className="riotChoice">
      <p className="body">
        <Prose links={false}>
          {`${owed === 1 ? "One pop" : `${owed} pops`} to answer. For each, lose it or give up a held card drawn at random.`}
        </Prose>
      </p>
      <p className="caption">
        {where ? `Next to go: a ${pop} from ${where} · ` : null}
        {held} in hand{losses.cards.length ? `, ${losses.cards.length} given up` : ""}
      </p>
      <div className="riotActs">
        <Tooltip
          content={
            <Tip title={`Lose the ${pop}`}>
              <TipBody>{where ? `A ${pop} from ${where} leaves.` : "The pop leaves."}</TipBody>
              {popStatus.can ? null : <TipWarn>{popStatus.reasons[0]}</TipWarn>}
            </Tip>
          }
          preferredPlacement="above"
        >
          <Plaque disabled={!canAct || !popStatus.can} onClick={() => onAnswer("pop")}>
            Lose the {pop}
          </Plaque>
        </Tooltip>
        <Tooltip
          content={
            <Tip title="Give up a card">
              <TipBody>
                {`A held card drawn at random is discarded in the ${pop}’s place. You hold ${held}.`}
              </TipBody>
              {cardStatus.can ? null : <TipWarn>{cardStatus.reasons[0]}</TipWarn>}
            </Tip>
          }
          preferredPlacement="above"
        >
          <Plaque disabled={!canAct || !cardStatus.can} onClick={() => onAnswer("card")}>
            <Ico path="events/convoy" size="ui" />
            Give up a card
          </Plaque>
        </Tooltip>
      </div>
    </div>
  );
}

/** "Bread dole: 4 Food paid" — one line for each insurance the riot was rolled with. */
function insuranceLines(
  G: HegemonyState,
  seat: PlayerId,
  ids: readonly RiotInsuranceId[],
  concessionTileId: string | null,
): LossLine[] {
  const options = getRiotTable(G.definition.content).insurance ?? [];
  return ids.flatMap((id): LossLine[] => {
    const option = options.find((candidate) => candidate.id === id);
    if (!option) return [];
    const paid = option.demotesPop
      ? `a citizen of ${concessionTileId ? placeName(G, seat, concessionTileId) : "a settlement"} became a freeman`
      : `${(Object.entries(option.cost) as Array<[Resource, number]>)
          .map(([resource, n]) => `${n} ${RESOURCE_LABELS[resource]}`)
          .join(", ")} paid`;
    return [
      {
        key: `insurance-${id}`,
        icon: INSURANCE_ICON[id],
        text: `${option.label}: ${paid}`,
        muted: true,
      },
    ];
  });
}

/** What the chosen insurance costs in stores, summed from the table. */
function declaredCost(
  options: readonly TableInsuranceOption[],
  declared: readonly Declared[],
): Partial<Resources> {
  const cost: Partial<Resources> = {};
  for (const { optionId } of declared)
    for (const [resource, n] of Object.entries(
      options.find((option) => option.id === optionId)?.cost ?? {},
    ) as Array<[Resource, number]>)
      cost[resource] = (cost[resource] ?? 0) + n;
  return cost;
}

function latestRiot(log: readonly LogEntry[], seat?: PlayerId): RiotEntry | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const entry = log[index];
    if (entry.moment?.kind === "riot" && (!seat || entry.about === seat)) return entry as RiotEntry;
  }
  return null;
}
