import { PLAYER_IDS } from "../../../game/data";
import { baseVoteWeight } from "../../../game/assembly";
import type { AssemblySession } from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../GameUiContext";
import { AssemblyAction } from "./AssemblyPresentation";

/**
 * The seats — a row of compact plaques along the foot of the scene, one per
 * player, each a glaze disc with its Greek blazon, a name, a one-line state and
 * an ostrakon.
 *
 * They were five 165×255 columns before, three of which rendered as empty voids;
 * that was the single largest reason the scene read as broken. A seat is not a
 * card, it is a person sitting there — a plaque is the right object.
 *
 * Two rules the old version broke:
 *
 * · **Every seat carries an ostrakon during proposal too.** The seat's own blazon
 *   scratched on a fired sherd means "this one has spoken"; a blank sherd means
 *   "still deliberating". A vote nobody has cast is *pending*, not missing.
 * · **The seat that is acting holds ALL its choices.** During the ballot the
 *   caster's plaque widens and lights, and Yea, Nay, Veto and Bribe sit on it
 *   together. Bribe used to be exiled to a dock at the bottom of the panel,
 *   physically separated from the vote it modifies — you had to buy the vote in
 *   one place and cast it in another.
 *
 * The plaques are also the hotseat's seat switcher, because the scene now covers
 * the top bar's roster. Taking a seat is the same act the roster performed.
 */
export function AssemblySeats({
  G,
  session,
  onTakeSeat,
}: {
  G: HegemonyState;
  session: AssemblySession;
  onTakeSeat: (playerID: PlayerId) => void;
}) {
  const { viewerId } = useGameUi();
  const voting = session.phase === "voting";
  const caster = voting ? session.voteOrder[session.voteIndex] : null;

  return (
    <div aria-label="The seats of the house" className="asmSeats" role="group">
      {PLAYER_IDS.map((id) => {
        if (id === caster) {
          return id === viewerId ? (
            <CastingSeat G={G} key={id} playerID={id} session={session} />
          ) : (
            <SeatPlaque
              G={G}
              key={id}
              lit
              onTakeSeat={onTakeSeat}
              playerID={id}
              session={session}
              viewerId={viewerId}
            />
          );
        }

        return (
          <SeatPlaque
            G={G}
            key={id}
            lit={!voting && id === viewerId}
            onTakeSeat={onTakeSeat}
            playerID={id}
            session={session}
            viewerId={viewerId}
          />
        );
      })}
    </div>
  );
}

function SeatPlaque({
  G,
  playerID,
  session,
  viewerId,
  lit,
  onTakeSeat,
}: {
  G: HegemonyState;
  playerID: PlayerId;
  session: AssemblySession;
  viewerId: PlayerId;
  lit: boolean;
  onTakeSeat: (playerID: PlayerId) => void;
}) {
  const glaze = PLAYER_GLAZES[playerID];
  const isViewer = playerID === viewerId;
  const { status, sherd } = seatState(G, session, playerID, viewerId);

  return (
    <button
      aria-pressed={isViewer}
      className={`asmSeat${lit ? " is-lit" : ""}${isViewer ? " is-you" : ""}`}
      onClick={() => onTakeSeat(playerID)}
      title={isViewer ? `${glaze.name} — you hold this seat` : `Take ${glaze.name}'s seat`}
      type="button"
    >
      <span className="asmGlaze title" style={{ background: glaze.color }}>
        {glaze.blazon}
      </span>
      <span className="asmSeatBody">
        <span className="asmSeatName verb">{glaze.name}</span>
        <span className="asmSeatStatus caption">{status}</span>
      </span>
      {sherd ? (
        <span className={`asmSherd is-${sherd.tone}`}>
          <span className="asmSherdMark label" lang={sherd.greek ? "el" : undefined}>
            {sherd.mark}
          </span>
        </span>
      ) : null}
    </button>
  );
}

type Sherd = { tone: "yea" | "nay" | "blank" | "seat"; mark: string; greek: boolean };

function seatState(
  G: HegemonyState,
  session: AssemblySession,
  playerID: PlayerId,
  viewerId: PlayerId,
): { status: string; sherd: Sherd | null } {
  const glaze = PLAYER_GLAZES[playerID];

  if (session.phase === "voting") {
    const vote = session.votes.find((v) => v.playerID === playerID);

    if (vote) {
      return {
        status: vote.bribed > 0 ? `has cast ${vote.weight} — ${vote.bribed} bought` : "has cast",
        sherd: { tone: vote.yea ? "yea" : "nay", mark: vote.yea ? "ΝΑΙ" : "ΟΥ", greek: true },
      };
    }

    const place = session.voteOrder.indexOf(playerID) - session.voteIndex;

    return {
      status:
        place === 1
          ? "speaks next"
          : place === session.voteOrder.length - 1
            ? "speaks last"
            : "yet to speak",
      sherd: { tone: "blank", mark: "·", greek: false },
    };
  }

  if (session.phase === "closing") {
    return {
      status: `${G.assemblyPassedByPlayer[playerID]} carried in all`,
      sherd: null,
    };
  }

  // Proposal. Everything visible here is a state of MIND — never another seat's card.
  if (session.proposalDone[playerID]) {
    return {
      status: session.proposals[playerID] ? "has spoken" : "held their peace",
      sherd: { tone: "seat", mark: glaze.blazon, greek: true },
    };
  }

  if (session.held[playerID]) {
    return {
      status: playerID === viewerId ? "you weigh a card" : "weighs a card",
      sherd: { tone: "blank", mark: "·", greek: false },
    };
  }

  return {
    status: playerID === viewerId ? "you deliberate" : "deliberates",
    sherd: { tone: "blank", mark: "·", greek: false },
  };
}

/**
 * The seat that is casting, held by the viewer: one wide lit plaque carrying all
 * four choices at once — the two votes as filled lacquer, the two purchases as
 * outlines with their prices. Yea and Nay are the same shape a thumb apart, which
 * is deliberate; Veto and Bribe are a different shape because they cost money.
 */
function CastingSeat({
  G,
  playerID,
  session,
}: {
  G: HegemonyState;
  playerID: PlayerId;
  session: AssemblySession;
}) {
  const { moves } = useGameUi();
  const rules = G.ruleset.assembly;
  const glaze = PLAYER_GLAZES[playerID];
  const influence = G.players[playerID].resources.influence;
  const weight = baseVoteWeight(G, playerID) + session.bribesUsed[playerID];

  const vetoSpent = session.vetoUsed[playerID] >= rules.vetoesPerAssembly;
  const canVeto = !vetoSpent && influence >= rules.vetoCost;
  const bribesSpent = session.bribesUsed[playerID] >= rules.briberyCap;
  const canBribe = !bribesSpent && influence >= rules.briberyCost;

  return (
    <div className="asmSeat asmSeatCasting">
      <span className="asmGlaze title" style={{ background: glaze.color }}>
        {glaze.blazon}
      </span>
      <span className="asmSeatBody">
        <span className="asmSeatName verb">{glaze.name}</span>
        <span className="asmSeatCue label">
          Casts now · {weight} vote{weight === 1 ? "" : "s"}
        </span>
      </span>

      <AssemblyAction
        className="asmVote is-yea verb-lg"
        enabled
        explanation={`Cast ${weight} vote${weight === 1 ? "" : "s"} in favour of this resolution.`}
        heading="Vote Yea"
        onClick={() => moves.assemblyVote(playerID, true)}
        triggerClassName="asmVoteTrigger"
      >
        Yea
      </AssemblyAction>
      <AssemblyAction
        className="asmVote is-nay verb-lg"
        enabled
        explanation={`Cast ${weight} vote${weight === 1 ? "" : "s"} against this resolution.`}
        heading="Vote Nay"
        onClick={() => moves.assemblyVote(playerID, false)}
        triggerClassName="asmVoteTrigger"
      >
        Nay
      </AssemblyAction>

      <AssemblyAction
        blockedReason={
          vetoSpent
            ? `The limit is ${rules.vetoesPerAssembly} veto${rules.vetoesPerAssembly === 1 ? "" : "es"} per Assembly.`
            : `Requires ${rules.vetoCost} influence.`
        }
        className="asmVote is-minor verb"
        effectiveCost={{ influence: rules.vetoCost }}
        enabled={canVeto}
        explanation="Strike this resolution outright. Using a veto also costs your vote on it."
        heading="Veto"
        onClick={() => moves.assemblyVeto(playerID)}
        triggerClassName="asmVoteTrigger"
      >
        Veto
        <small className="asmVoteCost stat num">
          {rules.vetoCost}
          <Icon glyph={RESOURCE_GLYPHS.influence} />
        </small>
      </AssemblyAction>
      <AssemblyAction
        blockedReason={
          bribesSpent
            ? `The limit is ${rules.briberyCap} bribes per Assembly.`
            : `Requires ${rules.briberyCost} influence.`
        }
        className="asmVote is-minor verb"
        effectiveCost={{ influence: rules.briberyCost }}
        enabled={canBribe}
        explanation={`Buy one extra vote before casting, up to ${rules.briberyCap} per Assembly.`}
        heading="Bribe"
        onClick={() => moves.assemblyBribe(playerID)}
        triggerClassName="asmVoteTrigger"
      >
        Bribe +1
        <small className="asmVoteCost stat num">
          {rules.briberyCost}
          <Icon glyph={RESOURCE_GLYPHS.influence} />
        </small>
      </AssemblyAction>
    </div>
  );
}
