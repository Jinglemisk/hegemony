import { useState } from "react";
import { PLAYER_COLORS, PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import {
  availableLawReplacementIds,
  activeLawIds,
  baseVoteWeight,
  getResolutionCard,
  lawNeedsReplacement,
  POLITICIANS_BY_ID,
} from "../../../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { NayMark, WaitMark, YeaMark } from "./AssemblyIcons";
import { AssemblyAction, ResolutionDetails } from "./AssemblyPresentation";

/**
 * The bema — the speaker's floor. Owner ruling (2026-07-21): it MIRRORS the colonnade
 * above it — a vertical column for the house and for each player, each showing that
 * seat's card, its effect, and the actions for it directly beneath (propose/discard
 * while proposing, yea/nay + veto while voting). So the whole agora reads top-to-bottom
 * as two rows of columns: politicians over their stelae, seats over their resolutions.
 */
export function AssemblyBema({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const label =
    session.phase === "proposal"
      ? "The Bema · draw and decide in secret"
      : session.phase === "voting"
        ? "The Bema · the ballot, voted in turn"
        : "The Bema · what the Assembly decided";

  return (
    <div className="band">
      <span className="band-k">{label}</span>
      {session.phase === "closing" ? (
        <ClosingView G={G} session={session} />
      ) : (
        <BemaColumns G={G} session={session} />
      )}
    </div>
  );
}

// ── The columns (proposal + voting share the layout) ────────────────────────────────

type Cell = {
  owner: PlayerId | null; // null = the house
  card: ResolutionCard | null;
  /** The ballot item this column stands for (voting), for repeal display + current-match. */
  item: BallotItem | null;
  /** A status line for a column with no visible card (a sealed rival, a passer, a prompt). */
  status: string | null;
  actions: "proposeDiscard" | "vote" | null;
  voteMark: "yay" | "nay" | "wait" | null;
  isCurrent: boolean;
  isViewer: boolean;
};

function BemaColumns({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { viewerId } = useGameUi();
  const voting = session.phase === "voting";
  const currentItem = voting ? session.ballot[session.ballotIndex] : null;

  const cells: Cell[] = [
    houseCell(session, currentItem),
    ...PLAYER_IDS.map((id) => playerCell(G, session, id, viewerId, currentItem)),
  ];

  return (
    <>
      <div className="bemaCols">
        {cells.map((cell) => (
          <BemaColumn G={G} cell={cell} key={cell.owner ?? "house"} session={session} />
        ))}
      </div>
      {voting ? <VoteTally G={G} session={session} /> : <ProposalHint />}
    </>
  );
}

function houseCell(session: AssemblySession, currentItem: BallotItem | null): Cell {
  const item = session.houseItem;

  return {
    owner: null,
    card: item?.kind === "enact" ? item.card : null,
    item,
    status: item ? null : "no house resolution",
    actions: session.phase === "voting" && item !== null && item === currentItem ? "vote" : null,
    voteMark: null,
    isCurrent: item !== null && item === currentItem,
    isViewer: false,
  };
}

function playerCell(
  G: HegemonyState,
  session: AssemblySession,
  owner: PlayerId,
  viewerId: PlayerId,
  currentItem: BallotItem | null,
): Cell {
  const isViewer = owner === viewerId;

  if (session.phase === "voting") {
    const item = session.proposals[owner];
    const vote = session.votes.find((v) => v.playerID === owner);

    return {
      owner,
      card: item?.kind === "enact" ? item.card : null,
      item,
      status: item ? null : "held their peace",
      actions: item !== null && item === currentItem ? "vote" : null,
      voteMark: vote ? (vote.yea ? "yay" : "nay") : "wait",
      isCurrent: item !== null && item === currentItem,
      isViewer,
    };
  }

  // Proposal. Every seat's card is secret to everyone else — you see only your own.
  const held = session.held[owner];
  const proposal = session.proposals[owner];

  if (isViewer) {
    if (held) {
      return {
        owner,
        card: held.card,
        item: null,
        status: null,
        actions: "proposeDiscard",
        voteMark: null,
        isCurrent: false,
        isViewer,
      };
    }
    if (session.proposalDone[owner]) {
      return {
        owner,
        card: proposal?.kind === "enact" ? proposal.card : null,
        item: proposal,
        status: proposal ? null : "you held your peace",
        actions: null,
        voteMark: null,
        isCurrent: false,
        isViewer,
      };
    }
    return {
      owner,
      card: null,
      item: null,
      status: "your move — draw a card above",
      actions: null,
      voteMark: null,
      isCurrent: false,
      isViewer,
    };
  }

  // A rival, mid-proposal: only their state of mind is visible, never their card.
  const status = session.proposalDone[owner]
    ? proposal
      ? "sealed a resolution"
      : "held their peace"
    : held
      ? "deciding"
      : "drawing";

  return {
    owner,
    card: null,
    item: null,
    status,
    actions: null,
    voteMark: null,
    isCurrent: false,
    isViewer,
  };
}

function BemaColumn({
  G,
  session,
  cell,
}: {
  G: HegemonyState;
  session: AssemblySession;
  cell: Cell;
}) {
  const isHouse = cell.owner === null;

  return (
    <div
      className={`bemaCol${cell.isCurrent ? " current" : ""}${cell.isViewer ? " you" : ""}${isHouse ? " house" : ""}`}
    >
      <div className="bemaColHead">
        <span
          className="bemaColDot"
          style={{ background: isHouse ? "var(--stone)" : PLAYER_COLORS[cell.owner!] }}
        />
        <span className="bemaColName">{isHouse ? "House" : PLAYER_NAMES[cell.owner!]}</span>
        {cell.voteMark ? <VoteBadge mark={cell.voteMark} /> : null}
      </div>

      {cell.item?.kind === "repeal" ? (
        <RepealCard cardId={cell.item.cardId} content={G.definition.content} />
      ) : cell.card ? (
        <ColumnCard
          G={G}
          card={cell.card}
          showPrize={!isHouse}
          target={cell.item?.kind === "enact" ? cell.item.target : undefined}
        />
      ) : (
        <div className="bemaColEmpty">{cell.status}</div>
      )}

      {cell.actions === "proposeDiscard" && cell.card ? (
        <ProposeDiscard G={G} card={cell.card} />
      ) : null}
      {cell.actions === "vote" ? <VoteActions G={G} session={session} /> : null}
    </div>
  );
}

function ColumnCard({
  G,
  card,
  showPrize,
  target,
}: {
  G: HegemonyState;
  card: ResolutionCard;
  showPrize: boolean;
  target?: PlayerId;
}) {
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <Tooltip
      ariaLabel={`${card.name}. ${card.kind === "law" ? "Proposed standing Law" : "Proposed one-time Directive"}.`}
      content={
        <ResolutionDetails
          card={card}
          content={G.definition.content}
          duration={card.kind === "law" ? "Until repealed if passed" : "Resolves once if passed"}
          source={politician.name}
        />
      }
      focusable
      preferredPlacement="above"
      triggerAs="div"
      triggerClassName="assemblyCardTooltipTrigger bemaCardTooltipTrigger"
    >
      <div className="bemaCard">
        <div className="bemaCardPol">{politician.name}</div>
        <div className="bemaCardName">{card.name}</div>
        <ResolutionEffect card={card} />
        {target ? (
          <div className="bemaCardTarget">
            <span style={{ background: PLAYER_COLORS[target] }} /> Target · {PLAYER_NAMES[target]}
          </div>
        ) : null}
        {showPrize ? (
          <div className="bemaCardPrize">
            Author prize · {formatPrize(G.ruleset.assembly.prizes[card.politician])}
          </div>
        ) : (
          <div className="bemaCardPrize muted">House Laws grant no author prize</div>
        )}
        <div className={`bemaCardKind${card.kind === "directive" ? " strat" : ""}`}>
          {card.kind === "law" ? "Standing Law" : "One-time Directive"}
        </div>
      </div>
    </Tooltip>
  );
}

function RepealCard({ cardId, content }: { cardId: string; content: GameContent }) {
  const card = getResolutionCard(content, cardId);

  return (
    <Tooltip
      ariaLabel={`Motion to repeal ${card?.name ?? cardId}`}
      content={
        <MechanicsDetails
          duration="Permanent if the motion passes"
          effects={[{ text: "Remove this standing Law", tone: "negative" }]}
          heading={`Repeal ${card?.name ?? cardId}`}
          source="Assembly ballot"
        >
          {card ? (
            <p className="mechanicsExplanation">The Law currently reads: {card.text}</p>
          ) : null}
        </MechanicsDetails>
      }
      focusable
      preferredPlacement="above"
      triggerAs="div"
      triggerClassName="assemblyCardTooltipTrigger bemaCardTooltipTrigger"
    >
      <div className="bemaCard bemaCardRepeal">
        <div className="bemaCardPol">A motion to repeal</div>
        <div className="bemaCardName">Repeal {card?.name ?? cardId}</div>
        <div className="bfx">
          Strike this standing Law from the record. {card ? <em>{card.text}</em> : null}
        </div>
      </div>
    </Tooltip>
  );
}

// ── Actions, directly under the card they concern ───────────────────────────────────

function ProposeDiscard({ G, card }: { G: HegemonyState; card: ResolutionCard }) {
  const { moves, viewerId } = useGameUi();
  const [replacementAnchor, setReplacementAnchor] = useState<DOMRect | null>(null);
  const alreadyStanding = card.kind === "law" && activeLawIds(G).includes(card.id);
  const needsReplacement = card.kind === "law" && lawNeedsReplacement(G);
  const replacementCandidates = availableLawReplacementIds(G);

  if (alreadyStanding) {
    return (
      <div className="bemaColActions">
        <span className="asmBlocked">Already stands</span>
        <AssemblyAction
          className="mb gh"
          enabled
          explanation="Return this held card to its politician's discard pile without adding it to the ballot."
          heading={`Discard ${card.name}`}
          onClick={() => moves.assemblyDiscardHeld(viewerId)}
          triggerClassName="bemaActionTooltipTrigger"
        >
          Discard
        </AssemblyAction>
      </div>
    );
  }

  return (
    <div className="bemaColActions">
      {card.kind === "directive" ? (
        <>
          <AssemblyAction
            className="mb go strat"
            enabled
            explanation="Choose one rival, then seal this Directive. The target is revealed with the ballot before voting begins."
            heading={`Target ${card.name}`}
            onClick={(event) => setReplacementAnchor(event.currentTarget.getBoundingClientRect())}
            triggerClassName="bemaActionTooltipTrigger"
          >
            Choose rival ▾
          </AssemblyAction>
          {replacementAnchor ? (
            <Popover
              anchor={replacementAnchor}
              ariaLabel={`Choose the rival targeted by ${card.name}`}
              className="assemblyMenuPopover"
              measureKey={viewerId}
              onDismiss={() => setReplacementAnchor(null)}
              preferredPlacement="above"
            >
              <div className="asmMenu asmTargetMenu">
                <p className="asmMenuHead">Name the rival this Directive will strike</p>
                <ul aria-label="Rivals available as Directive targets" className="asmMenuChoices">
                  {PLAYER_IDS.filter((id) => id !== viewerId).map((target) => (
                    <li key={target}>
                      <button
                        onClick={() => {
                          moves.assemblyPropose(viewerId, undefined, target);
                          setReplacementAnchor(null);
                        }}
                        type="button"
                      >
                        <span
                          className="asmTargetChoiceDot"
                          style={{ background: PLAYER_COLORS[target] }}
                        />
                        <span className="asmMenuName">{PLAYER_NAMES[target]}</span>
                        <span className="asmMenuMeta">{targetSummary(G, card, target)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover>
          ) : null}
        </>
      ) : needsReplacement ? (
        <>
          <AssemblyAction
            className="mb go"
            enabled
            explanation="Add this Law to the ballot. Because the standing-Law board is full or its remaining slots are reserved, choose the Law it would replace if passed."
            heading={`Propose ${card.name}`}
            onClick={(event) => setReplacementAnchor(event.currentTarget.getBoundingClientRect())}
            triggerClassName="bemaActionTooltipTrigger"
          >
            Propose ▾
          </AssemblyAction>
          {replacementAnchor ? (
            <Popover
              anchor={replacementAnchor}
              ariaLabel={`Choose the standing Law ${card.name} would replace`}
              className="assemblyMenuPopover"
              measureKey={G.activeLaws.length}
              onDismiss={() => setReplacementAnchor(null)}
              preferredPlacement="above"
            >
              <div className="asmMenu">
                <p className="asmMenuHead">Reserve the Law this proposal would replace</p>
                <ul aria-label="Standing Laws available for replacement" className="asmMenuChoices">
                  {replacementCandidates.map((cardId) => (
                    <li key={cardId}>
                      <button
                        onClick={() => {
                          moves.assemblyPropose(viewerId, cardId);
                          setReplacementAnchor(null);
                        }}
                        type="button"
                      >
                        <span className="asmMenuName">
                          {getResolutionCard(G.definition.content, cardId)?.name ?? cardId}
                        </span>
                        <span className="asmMenuMeta">
                          {getResolutionCard(G.definition.content, cardId)?.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover>
          ) : null}
        </>
      ) : (
        <AssemblyAction
          className="mb go"
          enabled
          explanation="Add this held resolution to the Assembly ballot. It is revealed after every seat has decided."
          heading={`Propose ${card.name}`}
          onClick={() => moves.assemblyPropose(viewerId)}
          triggerClassName="bemaActionTooltipTrigger"
        >
          Propose
        </AssemblyAction>
      )}
      <AssemblyAction
        className="mb gh"
        enabled
        explanation="Return this held card to its politician's discard pile without adding it to the ballot."
        heading={`Discard ${card.name}`}
        onClick={() => moves.assemblyDiscardHeld(viewerId)}
        triggerClassName="bemaActionTooltipTrigger"
      >
        Discard
      </AssemblyAction>
    </div>
  );
}

function VoteActions({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const rules = G.ruleset.assembly;
  const yourTurn = session.voteOrder[session.voteIndex] === viewerId;
  const canVeto =
    yourTurn &&
    session.vetoUsed[viewerId] < rules.vetoesPerAssembly &&
    G.players[viewerId].resources.influence >= rules.vetoCost;
  const voteWeight = baseVoteWeight(G, viewerId) + session.bribesUsed[viewerId];
  const vetoBlockedReason =
    session.vetoUsed[viewerId] >= rules.vetoesPerAssembly
      ? `The limit is ${rules.vetoesPerAssembly} veto${rules.vetoesPerAssembly === 1 ? "" : "es"} per Assembly.`
      : G.players[viewerId].resources.influence < rules.vetoCost
        ? `Requires ${rules.vetoCost} influence.`
        : undefined;

  if (!yourTurn) {
    return (
      <div className="bemaColActions bemaColWaiting">
        {PLAYER_NAMES[session.voteOrder[session.voteIndex]]} is casting…
      </div>
    );
  }

  return (
    <div className="bemaColVote">
      <div className="bemaColActions">
        <AssemblyAction
          className="mb yea"
          enabled
          explanation={`Cast ${voteWeight} vote${voteWeight === 1 ? "" : "s"} in favor of this resolution.`}
          heading="Vote Yea"
          onClick={() => moves.assemblyVote(viewerId, true)}
          triggerClassName="bemaActionTooltipTrigger"
        >
          Yea
        </AssemblyAction>
        <AssemblyAction
          className="mb nay"
          enabled
          explanation={`Cast ${voteWeight} vote${voteWeight === 1 ? "" : "s"} against this resolution.`}
          heading="Vote Nay"
          onClick={() => moves.assemblyVote(viewerId, false)}
          triggerClassName="bemaActionTooltipTrigger"
        >
          Nay
        </AssemblyAction>
      </div>
      <AssemblyAction
        blockedReason={vetoBlockedReason}
        className="bemaVeto"
        effectiveCost={{ influence: rules.vetoCost }}
        enabled={canVeto}
        explanation="Strike this resolution outright. Using a veto also costs your vote on this resolution."
        heading="Veto"
        onClick={() => moves.assemblyVeto(viewerId)}
        triggerClassName="bemaVetoTooltipTrigger"
      >
        Veto · {rules.vetoCost} inf
      </AssemblyAction>
    </div>
  );
}

function VoteBadge({ mark }: { mark: "yay" | "nay" | "wait" }) {
  return (
    <span className={`bemaVoteBadge ${mark}`}>
      {mark === "yay" ? (
        <YeaMark className="pm" />
      ) : mark === "nay" ? (
        <NayMark className="pm" />
      ) : (
        <WaitMark className="pm" />
      )}
    </span>
  );
}

// ── The tally, beneath the columns ──────────────────────────────────────────────────

function VoteTally({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const yea = session.votes.filter((v) => v.yea).reduce((total, v) => total + v.weight, 0);
  const nay = session.votes.filter((v) => !v.yea).reduce((total, v) => total + v.weight, 0);
  const pending = PLAYER_IDS.filter((id) => !session.votes.some((v) => v.playerID === id)).reduce(
    (total, id) => total + baseVoteWeight(G, id) + session.bribesUsed[id],
    0,
  );
  const total = Math.max(1, yea + nay + pending);

  return (
    <div className="voteTally">
      <div className="talline">
        <span className="yv">
          {yea}
          <span className="u"> yay</span>
        </span>
        <span className="tbar">
          <span className="y" style={{ width: `${(yea / total) * 100}%` }} />
          <span className="p" style={{ width: `${(pending / total) * 100}%` }} />
          <span className="n" style={{ width: `${(nay / total) * 100}%` }} />
        </span>
        <span className="nv">
          <span className="u">nay </span>
          {nay}
        </span>
      </div>
      <div className="talline">
        <span className="note">
          Card {session.ballotIndex + 1} of {session.ballot.length} ·{" "}
          {voteNote(G, session, yea, nay, pending)}
        </span>
      </div>
    </div>
  );
}

/** The running read on a close card — the thing a player would otherwise compute in
 *  their head before deciding whether to spend a bribe or a veto. */
function voteNote(
  G: HegemonyState,
  session: AssemblySession,
  yea: number,
  nay: number,
  pending: number,
): string {
  if (pending === 0) {
    return yea > nay ? "it carries" : yea === nay ? "tied — a tie fails" : "it is voted down";
  }

  const next = session.voteOrder.filter((id) => !session.votes.some((v) => v.playerID === id))[0];

  if (pending >= Math.abs(yea - nay)) {
    return `${PLAYER_NAMES[next]} speaks next; the ${pending} votes to come can still swing it`;
  }

  return yea > nay ? "the rest cannot stop it" : "the rest cannot save it";
}

function ProposalHint() {
  return (
    <div className="asmProposalHint">
      Every seat draws at once. Switch seats with the roster top-right to take each player's turn;
      the round moves to the vote once all four have decided.
    </div>
  );
}

// ── Closing recap (unchanged in shape) ──────────────────────────────────────────────

function ClosingView({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const ranked = [...PLAYER_IDS].sort(
    (a, b) =>
      G.assemblyPassedByPlayer[b] - G.assemblyPassedByPlayer[a] ||
      PLAYER_IDS.indexOf(a) - PLAYER_IDS.indexOf(b),
  );

  return (
    <div className="brow">
      <div className="bcard">
        <div className="bpol">What the Assembly decided</div>
        {session.results.length === 0 ? (
          <div className="bfx">The house rose with nothing on the bema.</div>
        ) : (
          <ul className="asmResults">
            {session.results.map((result, index) => (
              <li className={result.passed ? "passed" : "failed"} key={index}>
                {result.summary}
                <span className="asmResultTally">
                  {result.vetoedBy ? "vetoed" : `${result.yea}–${result.nay}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="bfx asmCapNote">
          <b>
            {G.activeLaws.length} of {G.ruleset.assembly.lawCap}
          </b>{" "}
          stelae planted.{" "}
          {G.activeLaws.length >= G.ruleset.assembly.lawCap
            ? "The board is full — a new Law must now name one to replace."
            : `${G.ruleset.assembly.lawCap - G.activeLaws.length} slot${G.ruleset.assembly.lawCap - G.activeLaws.length === 1 ? "" : "s"} of headroom.`}
        </div>
      </div>

      <div className="polls">
        <div className="blab">Permanent Voice ledger · authored resolutions passed</div>
        {ranked.map((playerID) => {
          const count = G.assemblyPassedByPlayer[playerID];

          return (
            <div className="vrowline" key={playerID}>
              <span className="sd2" style={{ background: PLAYER_COLORS[playerID] }} />
              <span className="sn2">
                {PLAYER_NAMES[playerID]}{" "}
                <span className="vrowNote">
                  ·{" "}
                  {G.voiceHolder === playerID
                    ? "holds Voice through ties"
                    : `minimum ${G.ruleset.victory.minimums.voice}`}
                </span>
              </span>
              <span className="sv2">
                <b>{count}</b> passed
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatPrize(prize: Partial<HegemonyState["players"][PlayerId]["resources"]>): string {
  return Object.entries(prize)
    .filter(([, amount]) => Boolean(amount))
    .map(([resource, amount]) => `+${amount} ${resource}`)
    .join(" · ");
}

function targetSummary(G: HegemonyState, card: ResolutionCard, target: PlayerId): string {
  if (card.id === "grain-riot") return `${G.players[target].resources.food} food stored`;
  if (card.id === "bread-and-circuses")
    return `${G.players[target].resources.gold} gold · ${G.players[target].resources.happiness} happiness`;
  if (card.id === "the-streets-burn") return `${G.players[target].resources.happiness} happiness`;
  if (card.id === "the-stele-is-broken") {
    const laws = G.activeLaws.filter((law) => law.author === target).length;
    return `${laws} authored standing Law${laws === 1 ? "" : "s"}`;
  }
  if (card.id === "general-strike") return "next income collection is skipped";
  if (card.id === "the-mob-rises") return "loses 1 pop from their largest settlement";
  return card.id === "isonomia" ? "1 base vote next Assembly" : "chosen rival";
}

/**
 * The effect line. Law text is authored as "<gain>, but <cost>." so the two halves can
 * be inked differently — olive for what you win, clay for what it costs. That split is
 * the whole point of a Law: a vote is a referendum on which build the table backs, and
 * the player has to see both sides at a glance to have that argument.
 */
export function ResolutionEffect({ card }: { card: ResolutionCard }) {
  const split = card.text.split(", but ");

  if (split.length !== 2) {
    return <div className="bfx">{card.text}</div>;
  }

  return (
    <div className="bfx">
      <span className="gain">{split[0]}</span>
      <span className="but">but</span>
      <span className="cost">{split[1].replace(/\.$/, "")}</span>.
    </div>
  );
}
