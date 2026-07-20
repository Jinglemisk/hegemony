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
 * The bema — the speaker's floor. A horizontal BAND rather than a big centred card
 * (the approved reference is explicit about this): the panel is sized to the sea gap,
 * so space spent on a card frame is space the colonnade loses.
 *
 * One band, three faces. The stepper in the head names which one is showing.
 */
export function AssemblyBema({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const label =
    session.phase === "proposal"
      ? "The Bema · draw and propose in secret"
      : session.phase === "voting"
        ? "The Bema · the card under vote"
        : "The Bema · what the Assembly decided";

  return (
    <div className="band">
      <span className="band-k">{label}</span>
      {session.phase === "proposal" ? <ProposalView G={G} session={session} /> : null}
      {session.phase === "voting" ? <VotingView G={G} session={session} /> : null}
      {session.phase === "closing" ? <ClosingView G={G} session={session} /> : null}
    </div>
  );
}

// ── ① Proposal (async) ───────────────────────────────────────────────────────────

/**
 * Every seat draws and decides on its own, in secret. The bema therefore shows two
 * things: on the left, the VIEWER's own drawn card in full (nobody else's is visible),
 * with what they can do with it; on the right, the public house card and each seat's
 * decision status — sealed / passed / still deciding — so you can see how close the
 * round is to closing without seeing what anyone chose.
 */
function ProposalView({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { viewerId } = useGameUi();
  const held = session.held[viewerId];
  const done = session.proposalDone[viewerId];
  const proposal = session.proposals[viewerId];

  return (
    <div className="brow">
      <div className="bcard">
        {held ? (
          <>
            <ResolutionCardFace card={held.card} eyebrow="Your draw · seen only by you" />
            <HeldCardActions card={held.card} G={G} viewerId={viewerId} />
          </>
        ) : done ? (
          <div className="asmDecided">
            <div className="bpol">You have spoken</div>
            <div className="bfx">
              {proposal
                ? proposal.kind === "repeal"
                  ? `You moved to strike ${getResolutionCard(proposal.cardId)?.name ?? proposal.cardId}.`
                  : `You sealed ${proposal.card.name} — it stays secret until the vote.`
                : "You held your peace."}{" "}
              Waiting for the other seats to decide.
            </div>
          </div>
        ) : (
          <div className="asmDrawPrompt">
            <div className="bpol">Your move</div>
            <div className="bfx">
              Draw from a politician above to see a resolution in secret, then propose it or fish again. Or hold your
              peace below — the house card alone still goes to the vote.
            </div>
          </div>
        )}
      </div>

      <div className="polls">
        <div className="blab">The bema, forming</div>
        <div className="chips">
          {session.houseItem ? (
            <div className="chip" title="The house resolution — laid openly, authored by no seat.">
              <span className="ck2">House</span>
              <span className="cn2">{ballotName(session.houseItem)}</span>
            </div>
          ) : null}
          {session.voteOrder.map((playerID) => {
            const seatDone = session.proposalDone[playerID];
            const seatHolding = Boolean(session.held[playerID]);
            const status = seatDone
              ? session.proposals[playerID]
                ? "sealed"
                : "passed"
              : seatHolding
                ? "deciding"
                : "drawing";

            return (
              <div className={`chip${playerID === viewerId ? " you" : ""}`} key={playerID}>
                <span className="pd2" style={{ background: PLAYER_COLORS[playerID] }}>
                  {PLAYER_NAMES[playerID].charAt(0)}
                </span>
                <span className="cn2">{PLAYER_NAMES[playerID]}</span>
                <span className="st2">{status}</span>
              </div>
            );
          })}
        </div>
        <div className="asmProposalHint">
          Switch seats with the roster top-right to take each player's turn — every seat draws at once.
        </div>
      </div>
    </div>
  );
}

/** Propose / Discard for the held card. Propose needs a replacement menu at the cap. */
function HeldCardActions({ G, viewerId, card }: { G: HegemonyState; viewerId: PlayerId; card: ResolutionCard }) {
  const { moves } = useGameUi();
  const alreadyStanding = card.kind === "law" && activeLawIds(G).includes(card.id);
  const needsReplacement = card.kind === "law" && isAtLawCap(G);

  if (alreadyStanding) {
    return (
      <div className="asmHeldActions">
        <span className="asmBlocked">Already standing — it cannot be enacted twice</span>
        <button className="mb gh" onClick={() => moves.assemblyDiscardHeld(viewerId)} type="button">
          Discard
        </button>
      </div>
    );
  }

  return (
    <div className="asmHeldActions">
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

// ── ② Voting ───────────────────────────────────────────────────────────────────────

function VotingView({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const item = session.ballot[session.ballotIndex];

  if (!item) {
    return null;
  }

  const yea = session.votes.filter((vote) => vote.yea).reduce((total, vote) => total + vote.weight, 0);
  const nay = session.votes.filter((vote) => !vote.yea).reduce((total, vote) => total + vote.weight, 0);
  const pending = PLAYER_IDS.filter((id) => !session.votes.some((vote) => vote.playerID === id)).reduce(
    (total, id) => total + baseVoteWeight(G, id) + session.bribesUsed[id],
    0
  );
  const total = Math.max(1, yea + nay + pending);

  return (
    <div className="brow">
      <div className="bcard">
        <BallotFace item={item} position={session.ballotIndex + 1} of={session.ballot.length} />
      </div>

      <div className="polls">
        <div className="blab">
          Open vote · cast in turn · {G.ruleset.assembly.tiesPass ? "a tie carries" : "a tie fails"}
          {session.equalVotes ? " · Isonomia: one vote each" : ""}
        </div>

        <div className="pebs">
          {session.voteOrder.map((playerID) => {
            const cast = session.votes.find((vote) => vote.playerID === playerID);
            const weight = cast ? cast.weight : baseVoteWeight(G, playerID) + session.bribesUsed[playerID];
            const state = cast ? (cast.yea ? "yay" : "nay") : "wait";

            return (
              <span
                className={`peb ${state}`}
                key={playerID}
                title={
                  cast
                    ? `${PLAYER_NAMES[playerID]} voted ${cast.yea ? "yea" : "nay"} with ${cast.weight} votes${cast.bribed > 0 ? ` (${cast.bribed} bought)` : ""}.`
                    : `${PLAYER_NAMES[playerID]} has ${weight} votes and has not spoken.`
                }
              >
                <span className="pd" style={{ background: PLAYER_COLORS[playerID] }}>
                  {PLAYER_NAMES[playerID].charAt(0)}
                </span>
                <span className="pn">{PLAYER_NAMES[playerID]}</span>
                <span className="pw">{weight}</span>
                {cast ? cast.yea ? <YeaMark className="pm" /> : <NayMark className="pm" /> : <WaitMark className="pm" />}
              </span>
            );
          })}
        </div>

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
          <span className="note">{voteNote(G, session, yea, nay, pending)}</span>
        </div>
      </div>
    </div>
  );
}

/** The running read on a close card — the thing a player would otherwise have to
 *  compute in their head before deciding whether to spend a bribe or a veto. */
function voteNote(G: HegemonyState, session: AssemblySession, yea: number, nay: number, pending: number): string {
  if (pending === 0) {
    return yea > nay ? "It carries." : yea === nay ? "Tied — and a tie fails." : "It is voted down.";
  }

  const waiting = session.voteOrder.filter((id) => !session.votes.some((vote) => vote.playerID === id));
  const next = waiting[0];

  if (pending >= Math.abs(yea - nay)) {
    return `${PLAYER_NAMES[next]} speaks next and the ${pending} votes still to come can still swing this.`;
  }

  return yea > nay ? "The remaining seats cannot stop it." : "The remaining seats cannot save it.";
}

// ── ③ Standing ─────────────────────────────────────────────────────────────────────

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
                  {patronOf.length > 0
                    ? patronOf.map((standing) => standing.politician.name).join(" · ")
                    : "no patronage"}
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

// ── Shared ─────────────────────────────────────────────────────────────────────────

function ballotName(item: BallotItem): string {
  return item.kind === "repeal"
    ? `Repeal ${getResolutionCard(item.cardId)?.name ?? item.cardId}`
    : item.card.name;
}

/** The card under vote, as the bema shows it: an aegean eyebrow naming the politician,
 *  the title, and the effect with its trade-off split into gain and cost. */
export function BallotFace({ item, position, of }: { item: BallotItem; position: number; of: number }) {
  if (item.kind === "repeal") {
    const card = getResolutionCard(item.cardId);

    return (
      <>
        <div className="bpol">
          A motion to repeal · card {position} of {of}
        </div>
        <div className="bname">Repeal {card?.name ?? item.cardId}</div>
        <div className="bfx">
          Strike this standing Law from the record. It leaves the board at once and its politician's power falls with
          it. {card ? <em>{card.text}</em> : null}
        </div>
      </>
    );
  }

  return <ResolutionCardFace card={item.card} eyebrow={`card ${position} of ${of}`} replaces={item.replaces} />;
}

/**
 * A resolution card's face — the politician eyebrow, the title, the effect split into
 * gain and cost, and the kind badge. Used for the card under vote AND for the held
 * card during proposal, so a card reads identically wherever it appears.
 */
export function ResolutionCardFace({
  card,
  eyebrow,
  replaces
}: {
  card: ResolutionCard;
  eyebrow: string;
  replaces?: string;
}) {
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <>
      <div className="bpol">
        {politician.name} · {politician.epithet} · {eyebrow}
      </div>
      <div className="bname">{card.name}</div>
      <ResolutionEffect card={card} />
      {card.kind === "law" ? (
        <div className="bkind">
          {card.tradeOff} · standing Law
          {replaces ? ` · replaces ${getResolutionCard(replaces)?.name ?? replaces}` : ""}
        </div>
      ) : (
        <div className="bkind strat">One-time Directive — it hits every player, then leaves a monument</div>
      )}
    </>
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
