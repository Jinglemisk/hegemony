import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  assemblySittings,
  ballotItemName,
  baseVoteWeight,
  currentVoteWeight,
  getAssemblyBuyVoteStatus,
  getAssemblyDrawStatus,
  getAssemblyRepealStatus,
  getResolutionCard,
  lawCanBeRemoved,
  lawProposalReason,
  lawReplacementIds,
  nextAssemblyYear,
  POLITICIANS,
  POLITICIANS_BY_ID,
  previewDirective,
  voteOutlook,
  voteWeightParts,
} from "../../../game/assembly";
import type {
  AssemblyResult,
  AssemblySession,
  BallotItem,
  DirectiveCard,
  ResolutionCard,
} from "../../../game/assembly";
import { happinessLevel } from "../../../game/happiness";
import { votePurchaseLimit } from "../../../game/ideaRules";
import { victoryMetricValue, voiceHolder } from "../../../game/victory";
import type { HegemonyState, PlayerId, Resources } from "../../../game/types";
import { RESOURCE_ICON, numberWord, sign } from "../../../ui/frameFormat";
import { ordinal, toRoman } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { Chips, Ico, Price, SeatMark } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { ModalShell } from "../modals/ModalShell";
import { ResolutionDetails } from "./AssemblyPresentation";
import type { Sitting, SittingStage } from "./sitting";
import { voteLine } from "./sitting";

/**
 * The Assembly sitting, a modal over the shell: the map, the top bar and the realm
 * stay drawn behind its scrim. Any stage folds to a dock, under which the shell reads
 * normally and acts not at all; the dock restores the same stage.
 *
 * What one seat sees of another during the proposal round is what the projection
 * leaves it: whether that seat has sealed, never what it drew or sealed.
 */
export function AssemblySitting({ sitting }: { sitting: Sitting }) {
  const { G } = useGameUi();
  const { session, stage } = sitting;

  return (
    <ModalShell
      backdropClassName="sitting-scrim"
      className="sitting"
      labelledBy="sitting-title"
      dismissOnBackdrop={false}
      onDismiss={stage === "rises" ? undefined : () => sitting.setMinimised(true)}
    >
      <SittingHead G={G} sitting={sitting} />
      {stage === "proposal" ? (
        <Proposal G={G} session={session} />
      ) : stage === "drawn" ? (
        <Drawn G={G} session={session} />
      ) : stage === "ballot" ? (
        <Ballot G={G} onOpen={sitting.openVote} session={session} />
      ) : stage === "vote" ? (
        <Vote G={G} session={session} />
      ) : stage === "result" ? (
        <Result
          G={G}
          index={sitting.resultIndex}
          onNext={sitting.nextResult}
          session={session}
          voiceBefore={sitting.voiceBefore}
        />
      ) : (
        <Rises G={G} session={session} />
      )}
    </ModalShell>
  );
}

const RAIL: Array<{ label: string; stages: SittingStage[] }> = [
  { label: "Proposal", stages: ["proposal", "drawn"] },
  { label: "Ballot", stages: ["ballot"] },
  { label: "Vote", stages: ["vote", "result"] },
  { label: "Rises", stages: ["rises"] },
];

function SittingHead({ G, sitting }: { G: HegemonyState; sitting: Sitting }) {
  const { viewerId } = useGameUi();
  const { session, stage } = sitting;
  const at = RAIL.findIndex((step) => step.stages.includes(stage));
  const year = `Year ${toRoman(session.year)}`;
  const itemIndex = stage === "result" ? sitting.resultIndex : session.ballotIndex;
  const item = session.ballot[itemIndex];
  const head =
    (stage === "vote" || stage === "result") && item
      ? {
          kicker: `Item ${itemIndex + 1} of ${session.ballot.length}`,
          title: ballotItemName(G, item),
          sub: movedBy(G, item, viewerId),
        }
      : stage === "ballot"
        ? {
            kicker: "ΕΚΚΛΗΣΙΑ",
            title: "The ballot",
            sub: `${cap(numberWord(session.ballot.length))} item${session.ballot.length === 1 ? "" : "s"}, voted in turn from ${seatName(G, session.voteOrder[0], viewerId)}`,
          }
        : stage === "rises"
          ? {
              kicker: "ΕΚΚΛΗΣΙΑ",
              title: "The Assembly rises",
              sub: `${year} · ${nextAssemblyYear(G) ? `next sitting in Year ${toRoman(nextAssemblyYear(G)!)}` : "the last sitting"}`,
            }
          : {
              kicker: "ΕΚΚΛΗΣΙΑ",
              title: "The Assembly",
              sub: `${year} · ${ordinal(G.assembliesHeld)} sitting of ${assemblySittings(G)}`,
            };

  return (
    <header className="sit-head">
      <Ico path="assembly/agora" size="disc" />
      <div className="sit-title">
        <span className="sit-kicker" lang={head.kicker === "ΕΚΚΛΗΣΙΑ" ? "el" : undefined}>
          {head.kicker}
        </span>
        <h2 id="sitting-title">{head.title}</h2>
        <span className="sit-sub">{head.sub}</span>
      </div>
      <ol aria-label="The sitting" className="sit-rail">
        {RAIL.map((step, index) => (
          <li
            aria-current={index === at ? "step" : undefined}
            className={index < at ? "is-done" : index === at ? "is-now" : undefined}
            key={step.label}
          >
            {step.label}
            {index < at ? " ✓" : ""}
          </li>
        ))}
      </ol>
      {stage === "rises" ? null : (
        <button className="sit-btn" onClick={() => sitting.setMinimised(true)} type="button">
          ▾ Minimise
        </button>
      )}
    </header>
  );
}

/** Folded to a bar under the ticker: where the sitting stands, and the way back. */
export function AssemblyDock({ sitting }: { sitting: Sitting }) {
  const { G, viewerId } = useGameUi();
  const { session, stage } = sitting;
  const restore = () => sitting.setMinimised(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[aria-modal="true"]')) restore();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const held = session.held[viewerId];
  const item = session.ballot[stage === "result" ? sitting.resultIndex : session.ballotIndex];
  const where =
    stage === "proposal"
      ? "Your proposal"
      : stage === "drawn" && held
        ? `${held.card.name}, not sealed`
        : stage === "ballot"
          ? "The ballot is read"
          : (stage === "vote" || stage === "result") && item
            ? ballotItemName(G, item)
            : "The house rises";

  return (
    <button
      aria-label={`Assembly, Year ${toRoman(session.year)}: ${where}. Return to the sitting.`}
      className="sit-dock"
      data-c="sit-dock"
      onClick={restore}
      type="button"
    >
      <Ico path="assembly/agora" size="ui" />
      <span className="sit-dock-words">
        <b>Assembly · Year {toRoman(session.year)}</b>
        <span>{where}</span>
      </span>
      <span className="sit-dock-seats">
        {session.voteOrder.map((id) => (
          <span className="sit-dock-seat" key={id}>
            <SeatMark playerID={id} />
            {dockMark(session, stage, id)}
          </span>
        ))}
      </span>
      <span className="sit-dock-back">Return</span>
    </button>
  );
}

function dockMark(session: AssemblySession, stage: SittingStage, id: PlayerId) {
  if (stage === "proposal" || stage === "drawn") return session.proposalDone[id] ? "✓" : "…";
  if (stage === "vote") return session.votes.some((vote) => vote.playerID === id) ? "✓" : "…";
  return null;
}

// ── Proposal ────────────────────────────────────────────────────────────────

function Proposal({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const [repealing, setRepealing] = useState(false);
  const influence = G.players[viewerId].resources.influence;
  const repeal = getAssemblyRepealStatus(G, viewerId);
  const done = session.proposalDone[viewerId];
  const sealed = session.proposals[viewerId];

  return (
    <>
      <div className="sit-body">
        <h3 className="sit-sec">
          <Ico path="assembly/politician" size="chip" />
          Draw from a politician · {G.ruleset.assembly.drawCost}
          <Ico path={RESOURCE_ICON.influence} size="chip" />· you hold {influence}
        </h3>
        <div className="sit-pols">
          {POLITICIANS.map((politician) => {
            const draw = getAssemblyDrawStatus(G, viewerId, politician.id);
            return (
              <div className="sit-pol" key={politician.id}>
                <b className="sit-name">{politician.name}</b>
                <span className="sit-epithet">{politician.epithet}</span>
                <span className="sit-text">{politician.creed}</span>
                <span className="sit-prize">
                  Author’s prize <Chips amounts={G.ruleset.assembly.prizes[politician.id]} /> ·{" "}
                  {politician.kind === "law" ? "Laws" : "Directives"}
                </span>
                <button
                  aria-label={`Draw from ${politician.name}`}
                  className="sit-btn"
                  disabled={!draw.can}
                  onClick={() => moves.assemblyDraw(viewerId, politician.id)}
                  title={draw.reason ?? undefined}
                  type="button"
                >
                  Draw <Price amounts={draw.cost} short={influence < draw.price} />
                </button>
              </div>
            );
          })}
        </div>
        <Laws
          G={G}
          onRepeal={
            repealing
              ? (cardId) => {
                  setRepealing(false);
                  moves.assemblyProposeRepeal(viewerId, cardId);
                }
              : undefined
          }
          year={session.year}
        />
        {done ? (
          <p className="sit-note">
            {sealed ? "Your proposal is sealed." : "You hold your peace."} {waitingWords(session)}
          </p>
        ) : (
          <div className="sit-acts">
            <button
              aria-pressed={repealing}
              className="sit-btn"
              disabled={!repeal.can}
              onClick={() => setRepealing((on) => !on)}
              title={repeal.reason ?? undefined}
              type="button"
            >
              <Ico path="assembly/repeal" size="ui" />
              {repealing ? "Choose a Law above" : "Repeal a Law"}
              <Price amounts={repeal.cost} short={influence < repeal.price} />
            </button>
            <button className="sit-btn" onClick={() => moves.assemblyPass(viewerId)} type="button">
              <Ico path="assembly/pass" size="ui" />
              Hold your peace
            </button>
            <span className="sit-note">Your votes this sitting: {votesWords(G, viewerId)}</span>
          </div>
        )}
      </div>
      <SeatStrip G={G} session={session} />
    </>
  );
}

function waitingWords(session: AssemblySession) {
  const left = session.voteOrder.filter((id) => !session.proposalDone[id]).length;
  return `${cap(numberWord(left))} seat${left === 1 ? "" : "s"} still to decide.`;
}

/** "4 (1 + 3 citizens)": the base vote by its parts, read off the engine. */
function votesWords(G: HegemonyState, id: PlayerId) {
  return `${baseVoteWeight(G, id)} (${weightParts(G, id)})`;
}

function weightParts(G: HegemonyState, id: PlayerId) {
  const { citizens, rural, isonomia } = voteWeightParts(G, id);
  if (isonomia) return "1 under Isonomia";
  const base = `1 + ${citizens} citizen${citizens === 1 ? "" : "s"}`;
  return rural ? `${base} ${sign(rural)} Rural Bloc` : base;
}

/** The standing Laws in their slots. Armed for a repeal, a Law past its tenure is the
 *  button that names it. */
function Laws({
  G,
  year,
  onRepeal,
}: {
  G: HegemonyState;
  year: number;
  onRepeal?: (cardId: string) => void;
}) {
  const { viewerId } = useGameUi();
  const lawCap = G.ruleset.assembly.lawCap;
  const laws = [...G.activeLaws].sort((a, b) => a.order - b.order);
  const empty = lawCap - laws.length;

  return (
    <>
      <h3 className="sit-sec">
        <Ico path="assembly/stele" size="chip" />
        Standing Laws · {laws.length} of {lawCap}
      </h3>
      <div className="sit-laws">
        {laws.map((law) => {
          const card = getResolutionCard(G.definition.content, law.cardId);
          const protectedNow = !lawCanBeRemoved(G, law.cardId);
          const fresh = law.enactedYear === year && G.assembly?.phase === "closing";
          const body = (
            <>
              <b className="sit-name">{card?.name ?? law.cardId}</b>
              <span className="sit-text">{card?.text}</span>
              <span className="sit-by">
                <SeatMark playerID={law.author} />
                {seatName(G, law.author, viewerId)} · Year {toRoman(law.enactedYear)}
                {fresh ? " · new" : protectedNow ? " · protected" : ""}
              </span>
            </>
          );
          return onRepeal && !protectedNow ? (
            <button
              aria-label={`Repeal ${card?.name ?? law.cardId}`}
              className="sit-law is-target"
              key={law.cardId}
              onClick={() => onRepeal(law.cardId)}
              type="button"
            >
              {body}
            </button>
          ) : (
            <Tooltip
              content={
                card ? (
                  <ResolutionDetails
                    card={card}
                    content={G.definition.content}
                    duration={
                      protectedNow ? "Protected through the next sitting" : "Until repealed"
                    }
                    source={G.players[law.author].name}
                  />
                ) : null
              }
              focusable
              key={law.cardId}
              triggerAs="div"
              triggerClassName="sit-law-tip"
            >
              <div className={`sit-law${fresh ? " is-new" : ""}`}>{body}</div>
            </Tooltip>
          );
        })}
        {empty > 0 ? (
          <div className="sit-law is-empty" style={{ gridColumn: `span ${empty}` }}>
            {empty === lawCap
              ? "No Law stands yet"
              : `${cap(numberWord(empty))} ${empty === 1 ? "stele stands" : "stelae stand"} empty`}
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── The drawn card ──────────────────────────────────────────────────────────

function Drawn({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const card = session.held[viewerId]!.card;
  const [target, setTarget] = useState<PlayerId | null>(null);
  const blocked = lawProposalReason(G, card);
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <>
      <div className="sit-body sit-drawn">
        <div className="sit-card">
          <span className="sit-sec">
            <Ico path={kindIcon(card)} size="ui" />
            {politician.name} · {card.kind === "law" ? "Law" : "Directive"}
          </span>
          <b className="sit-card-name">{card.name}</b>
          <span className="sit-text">{card.text}</span>
          <span className="sit-note">
            If it passes you take the author’s prize:{" "}
            <Chips amounts={G.ruleset.assembly.prizes[card.politician]} />
          </span>
          <span className="sit-lock">
            <Ico path="unrest/locked" size="chip" />
            Only you can see this card until the ballot is read
          </span>
        </div>
        <div className="sit-col">
          {card.kind === "directive" ? (
            <>
              <h3 className="sit-sec">Aim it at one rival</h3>
              {session.voteOrder
                .filter((id) => id !== viewerId)
                .map((id) => (
                  <button
                    aria-pressed={target === id}
                    className="sit-pick"
                    key={id}
                    onClick={() => setTarget(id)}
                    type="button"
                  >
                    <SeatMark playerID={id} />
                    <b>{G.players[id].name}</b>
                    <span className="sit-pick-fx">{directiveFx(G, card, id)}</span>
                  </button>
                ))}
            </>
          ) : (
            <>
              <h3 className="sit-sec">If it passes</h3>
              <p className="sit-text">{lawSlotWords(G, card)}</p>
              {blocked ? <p className="sit-warn">{blocked}</p> : null}
            </>
          )}
          <div className="sit-acts">
            <button
              className="sit-btn is-primary"
              disabled={card.kind === "directive" ? !target : Boolean(blocked)}
              onClick={() => moves.assemblyPropose(viewerId, target ?? undefined)}
              type="button"
            >
              <Ico path="assembly/propose" size="ui" />
              {card.kind === "law"
                ? "Seal this Law"
                : target
                  ? `Seal against ${G.players[target].name}`
                  : "Choose a rival"}
            </button>
            <button
              className="sit-btn"
              onClick={() => moves.assemblyDiscardHeld(viewerId)}
              type="button"
            >
              Discard it
            </button>
          </div>
          <p className="sit-note">
            Discarding leaves the {G.ruleset.assembly.drawCost} influence spent. There is no second
            draw this sitting.
          </p>
        </div>
      </div>
      <SeatStrip G={G} session={session} />
    </>
  );
}

function lawSlotWords(G: HegemonyState, card: ResolutionCard) {
  const replaced = lawReplacementIds(G, card).map(
    (id) => getResolutionCard(G.definition.content, id)?.name ?? id,
  );
  return replaced.length
    ? `It replaces ${replaced.join(" and ")}.`
    : "It fills an empty stele and replaces nothing.";
}

/** What a Directive would do to one rival, read off the engine's own resolution of it
 *  on a copy of the board. */
function directiveFx(G: HegemonyState, card: DirectiveCard, target: PlayerId): ReactNode[] {
  const after = previewDirective(G, card, target);
  const fx: ReactNode[] = [];
  for (const resource of RESOURCE_ORDER) {
    const was = G.players[target].resources[resource];
    const now = after.players[target].resources[resource];
    if (was !== now)
      fx.push(
        <span key={resource}>
          <Ico path={RESOURCE_ICON[resource]} size="chip" />
          {was} → {now}
        </span>,
      );
  }
  const level = [happinessLevel(G, target), happinessLevel(after, target)];
  if (level[0] !== level[1])
    fx.push(
      <span key="level">
        <Ico path={RESOURCE_ICON.happiness} size="chip" />
        {sign(level[0])} → {sign(level[1])}
      </span>,
    );
  const pops = [victoryMetricValue(G, target, "pops"), victoryMetricValue(after, target, "pops")];
  if (pops[0] !== pops[1]) fx.push(<span key="pops">pops {`${pops[0]} → ${pops[1]}`}</span>);
  if (after.players[target].incomeSuppressedTurns > G.players[target].incomeSuppressedTurns)
    fx.push(<span key="income">no income next turn</span>);
  const fallen = G.activeLaws.find(
    (law) => !after.activeLaws.some((still) => still.cardId === law.cardId),
  );
  if (fallen)
    fx.push(
      <span key="law">
        throws down {getResolutionCard(G.definition.content, fallen.cardId)?.name}
      </span>,
    );
  if (after.pendingIsonomiaTarget === target && G.pendingIsonomiaTarget !== target)
    fx.push(<span key="votes">1 base vote next sitting</span>);
  return fx.length ? fx : [<span key="none">no effect now</span>];
}

// ── The ballot ──────────────────────────────────────────────────────────────

function Ballot({
  G,
  session,
  onOpen,
}: {
  G: HegemonyState;
  session: AssemblySession;
  onOpen: () => void;
}) {
  const { viewerId } = useGameUi();

  return (
    <>
      <div className="sit-body">
        <ol className="sit-items">
          {session.ballot.map((item, index) => (
            <li className="sit-item" key={index}>
              <span className="sit-no">{index + 1}</span>
              <SeatMark playerID={item.proposer} />
              <span className="sit-item-words">
                <span className="sit-item-name">
                  <Ico path={itemIcon(item)} size="ui" />
                  <b className="sit-name">{ballotItemName(G, item)}</b>
                  <span className="sit-note">{itemKind(G, item)}</span>
                </span>
                <span className="sit-text">{itemText(G, item)}</span>
              </span>
              <span className="sit-item-side">{itemSide(G, item, viewerId)}</span>
            </li>
          ))}
          {session.voteOrder
            .filter((id) => session.proposalDone[id] && !session.proposals[id])
            .map((id) => (
              <li className="sit-item is-quiet" key={id}>
                <span className="sit-no">–</span>
                <SeatMark playerID={id} />
                <b className="sit-name">
                  {id === viewerId
                    ? "You held your peace"
                    : `${G.players[id].name} held their peace`}
                </b>
              </li>
            ))}
        </ol>
        <div className="sit-acts is-end">
          <button className="sit-btn is-primary" onClick={onOpen} type="button">
            Open the vote · item 1
          </button>
        </div>
      </div>
      <SeatStrip G={G} session={session} votes />
    </>
  );
}

function itemIcon(item: BallotItem) {
  return item.kind === "repeal" ? "assembly/repeal" : kindIcon(item.card);
}

function kindIcon(card: ResolutionCard) {
  return card.kind === "law" ? "assembly/law" : "assembly/directive";
}

function itemKind(G: HegemonyState, item: BallotItem) {
  return item.kind === "repeal"
    ? `repeal · paid ${G.ruleset.assembly.repealCost} influence`
    : `${POLITICIANS_BY_ID[item.card.politician].name} · ${item.card.kind === "law" ? "Law" : "Directive"}`;
}

function itemText(G: HegemonyState, item: BallotItem) {
  return item.kind === "repeal"
    ? getResolutionCard(G.definition.content, item.cardId)?.text
    : item.card.text;
}

/** What the item would change for the table: the slot, the target, the prize. */
function itemSide(G: HegemonyState, item: BallotItem, viewer: PlayerId) {
  if (item.kind === "repeal") {
    const law = G.activeLaws.find((standing) => standing.cardId === item.cardId);
    return law ? (
      <>
        <span>
          Authored by {seatName(G, law.author, viewer)}, Year {toRoman(law.enactedYear)}
        </span>
        <span>
          Counts toward {law.author === viewer ? "your" : `${G.players[law.author].name}’s`} Voice
        </span>
      </>
    ) : null;
  }
  return (
    <>
      <span>
        {item.card.kind === "directive" && item.target
          ? `Against ${seatName(G, item.target, viewer)}`
          : lawSlotWords(G, item.card)}
      </span>
      <span>
        Prize to {seatName(G, item.proposer, viewer)}:{" "}
        <Chips amounts={G.ruleset.assembly.prizes[item.card.politician]} />
      </span>
    </>
  );
}

// ── The vote ────────────────────────────────────────────────────────────────

function Vote({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const outlook = voteOutlook(G)!;
  const line = voteLine(G, viewerId)!;
  const caster = outlook.caster.playerID;
  const casting = caster === viewerId;
  const waiting = [outlook.caster, ...outlook.rest];
  const left = waiting.reduce((sum, seat) => sum + seat.weight, 0);
  const house = outlook.yea + outlook.nay + left;
  const item = session.ballot[session.ballotIndex];
  const words = item.kind === "repeal" ? ["strike it", "keep it"] : ["pass it", "reject it"];
  const bought = session.bribesUsed[caster];

  return (
    <>
      <div className="sit-body">
        <div className="sit-tally">
          <span className="sit-side is-yea">
            <span className="sit-sec">Yea · {words[0]}</span>
            <b>{outlook.yea}</b>
          </span>
          <span className="sit-beam-col">
            <span className="sit-beam">
              <i className="is-yea" style={{ flexGrow: outlook.yea }} />
              <i style={{ flexGrow: left }} />
              <i className="is-nay" style={{ flexGrow: outlook.nay }} />
            </span>
            <span className="sit-note">
              A tie fails. {house} votes in the house; {left} still to cast.
            </span>
          </span>
          <span className="sit-side is-nay">
            <span className="sit-sec">Nay · {words[1]}</span>
            <b>{outlook.nay}</b>
          </span>
        </div>
        <ol className="sit-order">
          {session.voteOrder.map((id) => (
            <li className={id === caster ? "is-now" : undefined} key={id}>
              <SeatMark playerID={id} />
              <b>{id === viewerId ? "You" : G.players[id].name}</b>
              <span className="sit-order-v">{orderWords(session, outlook, id)}</span>
            </li>
          ))}
        </ol>
        {casting ? (
          <div className="sit-mine">
            <span className="sit-mine-n">
              <span className="sit-sec">Your votes</span>
              <b>{currentVoteWeight(G, viewerId)}</b>
              <span className="sit-note">
                {weightParts(G, viewerId)}
                {bought ? ` + ${bought} bought` : ""}
              </span>
            </span>
            <span className="sit-col">
              <span className="sit-acts">
                {(["gold", "influence"] as const).map((payment) => {
                  const status = getAssemblyBuyVoteStatus(G, viewerId, payment);
                  return (
                    <button
                      aria-label={`Buy a vote with ${status.price} ${payment}`}
                      className="sit-btn"
                      disabled={!status.can}
                      key={payment}
                      onClick={() => moves.assemblyBribe(viewerId, payment)}
                      title={status.reason ?? undefined}
                      type="button"
                    >
                      <Ico path="assembly/bribe" size="ui" />
                      +1 vote <Price amounts={status.cost as Partial<Resources>} />
                    </button>
                  );
                })}
                <span className="sit-note">
                  {bought} of {votePurchaseLimit(G, viewerId)} bought
                </span>
              </span>
              <p className="sit-what">
                <b>{line.lead}</b> {line.rest}
              </p>
            </span>
            <span className="sit-col">
              <button
                className="sit-btn is-yea"
                onClick={() => moves.assemblyVote(viewerId, true)}
                type="button"
              >
                <Ico path="assembly/vote" size="ui" />
                Yea
              </button>
              <button
                className="sit-btn is-nay"
                onClick={() => moves.assemblyVote(viewerId, false)}
                type="button"
              >
                <Ico path="assembly/vote" size="ui" />
                Nay
              </button>
            </span>
          </div>
        ) : (
          <p className="sit-what">
            <b>{line.lead}</b> {line.rest}
          </p>
        )}
      </div>
      <footer className="sit-foot">
        <span className="sit-note">
          Votes are open: everyone sees each vote as it lands. Bought votes count for this sitting
          only.
        </span>
      </footer>
    </>
  );
}

function orderWords(
  session: AssemblySession,
  outlook: NonNullable<ReturnType<typeof voteOutlook>>,
  id: PlayerId,
) {
  const vote = session.votes.find((cast) => cast.playerID === id);
  if (vote)
    return `${vote.yea ? "Yea" : "Nay"} · ${vote.weight}${vote.bribed ? ` (${vote.bribed} bought)` : ""}`;
  if (id === outlook.caster.playerID) return "casting now";
  const seat = outlook.rest.find((waiting) => waiting.playerID === id)!;
  const place = id === session.voteOrder.at(-1) ? "last" : "to cast";
  return `${place} · ${seat.weight}${seat.most > seat.weight ? `, up to ${seat.most}` : ""}`;
}

// ── An item's result ────────────────────────────────────────────────────────

function Result({
  G,
  session,
  index,
  voiceBefore,
  onNext,
}: {
  G: HegemonyState;
  session: AssemblySession;
  index: number;
  voiceBefore: PlayerId | null;
  onNext: () => void;
}) {
  const { viewerId } = useGameUi();
  const result = session.results[index];
  const next = session.ballot[index + 1];
  const law =
    result.item.kind === "repeal"
      ? result.item.cardId
      : result.item.card.kind === "law"
        ? result.item.card.id
        : null;
  const card = law ? getResolutionCard(G.definition.content, law) : null;
  const voice = voiceHolder(G);
  const prize =
    result.passed && result.item.kind === "enact"
      ? G.ruleset.assembly.prizes[result.item.card.politician]
      : null;

  return (
    <>
      <div className="sit-body sit-result">
        <span className={`sit-verdict ${verdictTone(result)}`}>{verdictWords(result)}</span>
        <b className="sit-headline">{headline(G, result, viewerId)}</b>
        <ol className="sit-order is-row">
          {result.votes.map((vote) => (
            <li key={vote.playerID}>
              <SeatMark playerID={vote.playerID} />
              <b>{vote.playerID === viewerId ? "You" : G.players[vote.playerID].name}</b>
              <span className={`sit-order-v ${vote.yea ? "is-yea" : "is-nay"}`}>
                {vote.yea ? "Yea" : "Nay"} · {vote.weight}
              </span>
            </li>
          ))}
        </ol>
        {card && result.passed ? (
          <div className={`sit-law ${result.item.kind === "repeal" ? "is-gone" : "is-new"}`}>
            <b className="sit-name">{card.name}</b>
            <span className="sit-text">{card.text}</span>
          </div>
        ) : null}
        <div className="sit-what sit-fx">
          {prize ? (
            <span>
              {seatName(G, result.item.proposer, viewerId, true)} take
              {result.item.proposer === viewerId ? "" : "s"} the author’s prize:{" "}
              <Chips amounts={prize} />
            </span>
          ) : null}
          {result.yea > result.nay && !result.passed ? <span>{result.summary}</span> : null}
          <span>
            <Ico path="victory/voice" size="ui" />
            <b>Voice of the Assembly:</b>{" "}
            {voice === voiceBefore
              ? voice
                ? `${seatName(G, voice, viewerId, true)} still hold${voice === viewerId ? "" : "s"} it.`
                : "still held by nobody."
              : voice
                ? `${seatName(G, voice, viewerId, true)} now hold${voice === viewerId ? "" : "s"} it${voiceBefore ? `, from ${seatName(G, voiceBefore, viewerId)}` : ""}.`
                : `${seatName(G, voiceBefore!, viewerId, true)} lose${voiceBefore === viewerId ? "" : "s"} it; nobody holds it now.`}
          </span>
        </div>
        <button className="sit-btn is-primary" onClick={onNext} type="button">
          {next ? `Next: ${ballotItemName(G, next)}` : "The house rises"}
        </button>
      </div>
      <SeatStrip G={G} session={session} votes />
    </>
  );
}

function verdictWords(result: AssemblyResult) {
  if (result.passed) return `Carried ${result.yea} to ${result.nay}`;
  if (result.yea > result.nay) return `Carried ${result.yea} to ${result.nay}, without effect`;
  if (result.yea === result.nay) return `Tied ${result.yea} to ${result.nay}: it fails`;
  return `Fails ${result.yea} to ${result.nay}`;
}

const verdictTone = (result: AssemblyResult) => (result.passed ? "is-yea" : "is-nay");

function headline(G: HegemonyState, result: AssemblyResult, viewer: PlayerId) {
  const { item, passed } = result;
  if (item.kind === "repeal") {
    const name = getResolutionCard(G.definition.content, item.cardId)?.name ?? item.cardId;
    return passed ? `${name} is struck from the record` : `${name} still stands`;
  }
  if (!passed)
    return result.yea > result.nay
      ? `${item.card.name} cannot take effect`
      : `${item.card.name} is voted down`;
  return item.card.kind === "law"
    ? `${item.card.name} is enacted`
    : `${item.card.name} carries against ${seatName(G, item.target!, viewer)}`;
}

/** The recap's line under an item's name: what became of it. */
function outcomeWords(G: HegemonyState, result: AssemblyResult, viewer: PlayerId) {
  const { item, passed } = result;
  if (!passed) {
    if (result.yea > result.nay) return "carried, but could not take effect";
    return item.kind === "repeal" ? "the Law still stands" : "voted down";
  }
  if (item.kind === "repeal") return "struck from the record";
  return item.card.kind === "law"
    ? "enacted · a new stele stands"
    : `carries against ${seatName(G, item.target!, viewer)}`;
}

// ── The house rises ─────────────────────────────────────────────────────────

function Rises({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const voice = voiceHolder(G);
  const opener = session.resumePlayer;

  return (
    <div className="sit-body">
      {session.results.length === 0 ? (
        <p className="sit-headline">The Assembly rises with nothing on the bema.</p>
      ) : (
        <ol className="sit-items">
          {session.results.map((result, index) => (
            <li className="sit-item" key={index}>
              <span className="sit-no">{index + 1}</span>
              <SeatMark playerID={result.item.proposer} />
              <span className="sit-item-words">
                <b className="sit-name">{ballotItemName(G, result.item)}</b>
                <span className="sit-text">{outcomeWords(G, result, viewerId)}</span>
              </span>
              <span className="sit-item-side">
                <span className={`sit-verdict ${verdictTone(result)}`}>
                  {result.passed ? "Carried" : "Fails"} {result.yea}–{result.nay}
                </span>
                {result.passed && result.item.kind === "enact" ? (
                  <span>
                    {seatName(G, result.item.proposer, viewerId, true)}{" "}
                    <Chips amounts={G.ruleset.assembly.prizes[result.item.card.politician]} />
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      <Laws G={G} year={session.year} />
      <div className="sit-acts is-split">
        <span className="sit-note">
          <Ico path="victory/voice" size="ui" />
          Voice of the Assembly:{" "}
          {voice ? (
            <b>{seatName(G, voice, viewerId, true)}</b>
          ) : (
            <>
              <b>nobody</b> (no seat authors {G.ruleset.victory.minimums.voice} standing Laws)
            </>
          )}
        </span>
        <button className="sit-btn is-primary" onClick={() => moves.assemblyClose()} type="button">
          Return to Year {toRoman(session.year)} ·{" "}
          {opener === viewerId ? "you open" : `${G.players[opener].name} opens`}
        </button>
      </div>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────

/** Each seat and where it stands: sealed or deciding in the proposal round, its votes
 *  once the ballot is read. Never what a seat drew or sealed. */
function SeatStrip({
  G,
  session,
  votes = false,
}: {
  G: HegemonyState;
  session: AssemblySession;
  votes?: boolean;
}) {
  const { viewerId } = useGameUi();

  return (
    <footer className="sit-foot">
      <ol className="sit-seats">
        {session.voteOrder.map((id) => {
          const you = id === viewerId;
          const state = votes
            ? `${currentVoteWeight(G, id)} vote${currentVoteWeight(G, id) === 1 ? "" : "s"}`
            : session.proposalDone[id]
              ? "sealed"
              : you
                ? session.held[id]
                  ? "holding a card"
                  : "your choice"
                : "deciding…";
          return (
            <li className={you ? "is-you" : undefined} key={id}>
              <SeatMark playerID={id} />
              <span>
                <b>
                  {G.players[id].name}
                  {you ? " · you" : ""}
                </b>
                <span>{state}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {votes ? null : <span className="sit-note">Each seat decides in secret, in turn order.</span>}
    </footer>
  );
}

function movedBy(G: HegemonyState, item: BallotItem, viewer: PlayerId) {
  const by = `Moved by ${seatName(G, item.proposer, viewer)}`;
  if (item.kind === "enact")
    return `${by} · ${POLITICIANS_BY_ID[item.card.politician].name} · ${item.card.kind === "law" ? "Law" : "Directive"}`;
  const law = G.activeLaws.find((standing) => standing.cardId === item.cardId);
  return law
    ? `${by} · authored by ${seatName(G, law.author, viewer)}, Year ${toRoman(law.enactedYear)}`
    : by;
}

function seatName(G: HegemonyState, id: PlayerId, viewer: PlayerId, capital = false) {
  return id === viewer ? (capital ? "You" : "you") : G.players[id].name;
}

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
