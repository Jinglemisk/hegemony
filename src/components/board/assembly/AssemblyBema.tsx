import { PLAYER_COLORS, PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import {
  baseVoteWeight,
  getResolutionCard,
  patronCount,
  politicianStandings,
  POLITICIANS_BY_ID
} from "../../../game/assembly";
import type { AssemblySession, BallotItem, ResolutionCard } from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { NayMark, SealIcon, WaitMark, YeaMark } from "./AssemblyIcons";

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
      ? "The Bema · reverse turn order"
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

// ── ① Proposal ─────────────────────────────────────────────────────────────────────

function ProposalView({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  return (
    <div className="brow">
      <div className="bhalf">
        <div className="blab">The ballot, forming</div>
        <div className="chips">
          {session.ballot.map((item, index) => (
            <div className="chip" key={`${ballotKey(item)}-${index}`}>
              <span className="ck2">{item.proposer === null ? "House" : PLAYER_NAMES[item.proposer]}</span>
              <span className="cn2">{ballotName(item)}</span>
            </div>
          ))}
          {session.heldCard ? (
            <div className="chip seal" title="A drawn card is secret until it is proposed.">
              <SealIcon />
              {PLAYER_NAMES[session.heldCard.drawnBy]} · sealed
            </div>
          ) : null}
          {session.ballot.length === 0 && !session.heldCard ? (
            <div className="chip seal">Nothing laid before the house yet</div>
          ) : null}
        </div>
      </div>

      <div className="bhalf">
        <div className="blab">Draw &amp; propose · reverse turn order</div>
        <div className="chips">
          {session.proposalOrder.map((playerID, index) => {
            const done = index < session.proposalIndex;
            const acting = index === session.proposalIndex;

            return (
              <div className={`chip${acting ? " you" : ""}`} key={playerID}>
                <span className="pd2" style={{ background: PLAYER_COLORS[playerID] }}>
                  {PLAYER_NAMES[playerID].charAt(0)}
                </span>
                <span className="cn2">{PLAYER_NAMES[playerID]}</span>
                <span className="st2">{done ? "spoken" : acting ? "speaking" : "waiting"}</span>
              </div>
            );
          })}
        </div>
      </div>
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
        <BallotFace G={G} item={item} position={session.ballotIndex + 1} of={session.ballot.length} />
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

function ballotKey(item: BallotItem): string {
  return item.kind === "repeal" ? `repeal-${item.cardId}` : item.card.id;
}

/** The card under vote, as the bema shows it: an aegean eyebrow naming the politician,
 *  the title, and the effect with its trade-off split into gain and cost. */
export function BallotFace({
  G,
  item,
  position,
  of
}: {
  G: HegemonyState;
  item: BallotItem;
  position: number;
  of: number;
}) {
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

  const card = item.card;
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <>
      <div className="bpol">
        {politician.name} · {politician.epithet} · card {position} of {of}
      </div>
      <div className="bname">{card.name}</div>
      <ResolutionEffect card={card} />
      {card.kind === "law" ? (
        <div className="bkind">
          Standing Law — it holds until repealed
          {item.replaces ? ` · replaces ${getResolutionCard(item.replaces)?.name ?? item.replaces}` : ""}
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

export function playerVoteWeight(G: HegemonyState, session: AssemblySession, playerID: PlayerId): number {
  return baseVoteWeight(G, playerID) + session.bribesUsed[playerID];
}
