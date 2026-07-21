import { PLAYER_COLORS, PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import {
  activeLawIds,
  baseVoteWeight,
  getResolutionCard,
  isAtLawCap,
  patronCount,
  politicianStandings,
  POLITICIANS_BY_ID
} from "../../../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { NayMark, WaitMark, YeaMark } from "./AssemblyIcons";

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

  const cells: Cell[] = [houseCell(session, currentItem), ...PLAYER_IDS.map((id) => playerCell(G, session, id, viewerId, currentItem))];

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
    isViewer: false
  };
}

function playerCell(
  G: HegemonyState,
  session: AssemblySession,
  owner: PlayerId,
  viewerId: PlayerId,
  currentItem: BallotItem | null
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
      isViewer
    };
  }

  // Proposal. Every seat's card is secret to everyone else — you see only your own.
  const held = session.held[owner];
  const proposal = session.proposals[owner];

  if (isViewer) {
    if (held) {
      return { owner, card: held.card, item: null, status: null, actions: "proposeDiscard", voteMark: null, isCurrent: false, isViewer };
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
        isViewer
      };
    }
    return { owner, card: null, item: null, status: "your move — draw a card above", actions: null, voteMark: null, isCurrent: false, isViewer };
  }

  // A rival, mid-proposal: only their state of mind is visible, never their card.
  const status = session.proposalDone[owner]
    ? proposal
      ? "sealed a resolution"
      : "held their peace"
    : held
      ? "deciding"
      : "drawing";

  return { owner, card: null, item: null, status, actions: null, voteMark: null, isCurrent: false, isViewer };
}

function BemaColumn({ G, session, cell }: { G: HegemonyState; session: AssemblySession; cell: Cell }) {
  const isHouse = cell.owner === null;

  return (
    <div className={`bemaCol${cell.isCurrent ? " current" : ""}${cell.isViewer ? " you" : ""}${isHouse ? " house" : ""}`}>
      <div className="bemaColHead">
        <span className="bemaColDot" style={{ background: isHouse ? "var(--stone)" : PLAYER_COLORS[cell.owner!] }} />
        <span className="bemaColName">{isHouse ? "House" : PLAYER_NAMES[cell.owner!]}</span>
        {cell.voteMark ? <VoteBadge mark={cell.voteMark} /> : null}
      </div>

      {cell.item?.kind === "repeal" ? (
        <RepealCard cardId={cell.item.cardId} />
      ) : cell.card ? (
        <ColumnCard card={cell.card} />
      ) : (
        <div className="bemaColEmpty">{cell.status}</div>
      )}

      {cell.actions === "proposeDiscard" && cell.card ? <ProposeDiscard G={G} card={cell.card} /> : null}
      {cell.actions === "vote" ? <VoteActions G={G} session={session} /> : null}
    </div>
  );
}

function ColumnCard({ card }: { card: ResolutionCard }) {
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <div className="bemaCard">
      <div className="bemaCardPol">{politician.name}</div>
      <div className="bemaCardName">{card.name}</div>
      <ResolutionEffect card={card} />
      <div className={`bemaCardKind${card.kind === "directive" ? " strat" : ""}`}>
        {card.kind === "law" ? "Standing Law" : "One-time Directive"}
      </div>
    </div>
  );
}

function RepealCard({ cardId }: { cardId: string }) {
  const card = getResolutionCard(cardId);

  return (
    <div className="bemaCard bemaCardRepeal">
      <div className="bemaCardPol">A motion to repeal</div>
      <div className="bemaCardName">Repeal {card?.name ?? cardId}</div>
      <div className="bfx">Strike this standing Law from the record. {card ? <em>{card.text}</em> : null}</div>
    </div>
  );
}

// ── Actions, directly under the card they concern ───────────────────────────────────

function ProposeDiscard({ G, card }: { G: HegemonyState; card: ResolutionCard }) {
  const { moves, viewerId } = useGameUi();
  const alreadyStanding = card.kind === "law" && activeLawIds(G).includes(card.id);
  const needsReplacement = card.kind === "law" && isAtLawCap(G);

  if (alreadyStanding) {
    return (
      <div className="bemaColActions">
        <span className="asmBlocked">Already stands</span>
        <button className="mb gh" onClick={() => moves.assemblyDiscardHeld(viewerId)} type="button">
          Discard
        </button>
      </div>
    );
  }

  return (
    <div className="bemaColActions">
      {needsReplacement ? (
        <details className="asmReplace">
          <summary className="mb go">Propose ▾</summary>
          <ul className="asmMenu asmMenuInline">
            <li className="asmMenuHead">The board is full — name the Law to replace</li>
            {activeLawIds(G).map((cardId) => (
              <li key={cardId}>
                <button onClick={() => moves.assemblyPropose(viewerId, cardId)} type="button">
                  <span className="asmMenuName">{getResolutionCard(cardId)?.name ?? cardId}</span>
                  <span className="asmMenuMeta">{getResolutionCard(cardId)?.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <button className="mb go" onClick={() => moves.assemblyPropose(viewerId)} type="button">
          Propose
        </button>
      )}
      <button className="mb gh" onClick={() => moves.assemblyDiscardHeld(viewerId)} type="button">
        Discard
      </button>
    </div>
  );
}

function VoteActions({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { moves, viewerId } = useGameUi();
  const rules = G.ruleset.assembly;
  const yourTurn = session.voteOrder[session.voteIndex] === viewerId;
  const canVeto = yourTurn && session.vetoUsed[viewerId] < rules.vetoesPerAssembly && G.players[viewerId].resources.influence >= rules.vetoCost;

  if (!yourTurn) {
    return <div className="bemaColActions bemaColWaiting">{PLAYER_NAMES[session.voteOrder[session.voteIndex]]} is casting…</div>;
  }

  return (
    <div className="bemaColVote">
      <div className="bemaColActions">
        <button className="mb yea" onClick={() => moves.assemblyVote(viewerId, true)} type="button">
          Yea
        </button>
        <button className="mb nay" onClick={() => moves.assemblyVote(viewerId, false)} type="button">
          Nay
        </button>
      </div>
      <button
        className="bemaVeto"
        disabled={!canVeto}
        onClick={() => moves.assemblyVeto(viewerId)}
        title="Strike this resolution outright — once per assembly. It costs your own vote on it."
        type="button"
      >
        Veto · {rules.vetoCost} inf
      </button>
    </div>
  );
}

function VoteBadge({ mark }: { mark: "yay" | "nay" | "wait" }) {
  return (
    <span className={`bemaVoteBadge ${mark}`}>
      {mark === "yay" ? <YeaMark className="pm" /> : mark === "nay" ? <NayMark className="pm" /> : <WaitMark className="pm" />}
    </span>
  );
}

// ── The tally, beneath the columns ──────────────────────────────────────────────────

function VoteTally({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const yea = session.votes.filter((v) => v.yea).reduce((total, v) => total + v.weight, 0);
  const nay = session.votes.filter((v) => !v.yea).reduce((total, v) => total + v.weight, 0);
  const pending = PLAYER_IDS.filter((id) => !session.votes.some((v) => v.playerID === id)).reduce(
    (total, id) => total + baseVoteWeight(G, id) + session.bribesUsed[id],
    0
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
          Card {session.ballotIndex + 1} of {session.ballot.length} · {voteNote(G, session, yea, nay, pending)}
        </span>
      </div>
    </div>
  );
}

/** The running read on a close card — the thing a player would otherwise compute in
 *  their head before deciding whether to spend a bribe or a veto. */
function voteNote(G: HegemonyState, session: AssemblySession, yea: number, nay: number, pending: number): string {
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
      Every seat draws at once. Switch seats with the roster top-right to take each player's turn; the round moves to the
      vote once all four have decided.
    </div>
  );
}

// ── Closing recap (unchanged in shape) ──────────────────────────────────────────────

function ClosingView({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const standings = politicianStandings(G);
  const ranked = [...PLAYER_IDS].sort((a, b) => patronCount(G, b) - patronCount(G, a));

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
                <span className="asmResultTally">{result.vetoedBy ? "vetoed" : `${result.yea}–${result.nay}`}</span>
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
        <div className="blab">Patronage standings · the Voice of the Assembly</div>
        {ranked.map((playerID) => {
          const patronOf = standings.filter((standing) => standing.patron === playerID);

          return (
            <div className="vrowline" key={playerID}>
              <span className="sd2" style={{ background: PLAYER_COLORS[playerID] }} />
              <span className="sn2">
                {PLAYER_NAMES[playerID]}{" "}
                <span className="vrowNote">
                  ·{" "}
                  {patronOf.length > 0 ? patronOf.map((standing) => standing.politician.name).join(" · ") : "no patronage"}
                </span>
              </span>
              <span className="sv2">
                <b>{patronOf.length}</b> patron{patronOf.length === 1 ? "" : "s"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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
