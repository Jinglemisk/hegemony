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
  const { status, sherd, casting } = seatState(G, session, playerID, viewerId);

  return (
    <button
      // `aria-pressed` is "you hold this seat"; `aria-current` is "the house is
      // waiting on this one". They are different facts and in a hotseat they are
      // routinely on different plaques, so neither can stand in for the other.
      aria-current={casting ? "true" : undefined}
      aria-pressed={isViewer}
      className={`asmSeat${lit ? " is-lit" : ""}${isViewer ? " is-you" : ""}`}
      onClick={() => onTakeSeat(playerID)}
      title={isViewer ? `${glaze.name}, your seat` : `Take ${glaze.name}'s seat`}
      type="button"
    >
      <span className="asmGlaze title" style={{ background: glaze.color }}>
        {glaze.blazon}
      </span>
      <span className="asmSeatBody">
        <span className="asmSeatName verb">{glaze.name}</span>
        {/* The seat the game is waiting on takes the CUE treatment — clay caps,
            the same ink the casting plaque uses — not the quiet italic every
            other state wears. It is the one plaque you must click. */}
        <span className={casting ? "asmSeatCue label" : "asmSeatStatus caption"}>{status}</span>
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
): { status: string; sherd: Sherd | null; casting?: boolean } {
  const glaze = PLAYER_GLAZES[playerID];

  if (session.phase === "voting") {
    const vote = session.votes.find((v) => v.playerID === playerID);

    if (vote) {
      return {
        status: vote.bribed > 0 ? `has cast ${vote.weight} — ${vote.bribed} bought` : "has cast",
        sherd: { tone: vote.yea ? "yea" : "nay", mark: vote.yea ? "ΝΑΙ" : "ΟΥ", greek: true },
      };
    }

    // Two different questions, and the row used to answer only the second one.
    // `index` is where a seat stands in the order and never moves; `place` is how
    // far off its turn is and shrinks as the ballot walks. "Speaks last" is about
    // the ORDER — it stayed true only while `voteIndex` was 0, which is why the
    // fourth seat silently became "yet to speak" after the first vote landed. And
    // `place === 0` — the seat the whole house is waiting on — had no branch at
    // all, so the one plaque you must click read the same as the one that votes
    // third. The row was off by one and least urgent exactly where it mattered.
    const index = session.voteOrder.indexOf(playerID);
    const place = index - session.voteIndex;

    if (place === 0) {
      return { status: castingCue(G, session, playerID), sherd: null, casting: true };
    }

    return {
      status:
        place === 1
          ? "speaks next"
          : index === session.voteOrder.length - 1
            ? "speaks last"
            : "yet to speak",
      sherd: { tone: "blank", mark: "·", greek: false },
    };
  }

  if (session.phase === "closing") {
    // What this seat DID in the sitting that just rose. The all-time count lives
    // in the voice ledger on the floor above, and printing it here too put the
    // same numeral on screen twice per player.
    const authored = session.results.filter((result) => result.item.proposer === playerID);
    const carried = authored.filter((result) => result.passed).length;

    return {
      status:
        carried > 0
          ? `carried ${carried} today`
          : authored.length > 0
            ? "spoke, and lost"
            : "held their peace",
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

/** "Casts now · 2 votes" — the line every plaque uses for the seat on the floor,
 *  whether or not the viewer happens to be sitting in it. */
function castingCue(G: HegemonyState, session: AssemblySession, playerID: PlayerId): string {
  const weight = baseVoteWeight(G, playerID) + session.bribesUsed[playerID];
  return `Casts now · ${weight} vote${weight === 1 ? "" : "s"}`;
}

/**
 * Where a seat's weight comes from — the answer to "Casts now · 0 votes", which
 * used to be printed with no explanation and no recourse. Vote weight is the
 * seat's CITIZEN count, so a player holding only freemen and slaves is given the
 * floor with nothing to cast, and nothing on screen said why.
 */
function weightNote(
  G: HegemonyState,
  session: AssemblySession,
  playerID: PlayerId,
  canBribe: boolean,
): string {
  const bought = session.bribesUsed[playerID];
  const bribes = bought > 0 ? `, ${bought} bought` : "";

  if (session.isonomiaTarget === playerID) {
    return `Isonomia holds you to one vote${bribes}`;
  }

  if (baseVoteWeight(G, playerID) === 0) {
    // Never offer a way out that is already shut: on the first ballot of a game
    // the bribe is usually unaffordable, and "buy one below" beside a greyed
    // Bribe would be the second thing on this plaque to mislead.
    return bought > 0
      ? `no citizens — ${bought} bought`
      : canBribe
        ? "no citizens, no voice — buy one below"
        : "no citizens, no voice";
  }

  return `one vote per citizen${bribes}`;
}

/**
 * The seat that is casting, held by the viewer: one wide lit plaque carrying all
 * four choices at once — the two votes as filled lacquer, the two purchases as
 * outlines with their prices. Yea and Nay are the same shape a thumb apart, which
 * is deliberate; Veto and Bribe are a different shape because they cost money.
 *
 * The plaque explains ITSELF. A player handed the floor with 0 votes and both
 * purchases greyed out was given no reason for either, and the reasons only
 * existed inside tooltips nobody hovers mid-decision.
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
    <div aria-current="true" className="asmSeat asmSeatCasting is-you">
      <span className="asmGlaze title" style={{ background: glaze.color }}>
        {glaze.blazon}
      </span>
      <span className="asmSeatBody">
        <span className="asmSeatName verb">
          {glaze.name}
          <span className="visuallyHidden">, your seat</span>
        </span>
        <span className="asmSeatCue label">{castingCue(G, session, playerID)}</span>
        <span className="asmSeatWhy caption">{weightNote(G, session, playerID, canBribe)}</span>
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
        <PurchaseChip cost={rules.vetoCost} held={influence} spent={vetoSpent} />
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
        <PurchaseChip cost={rules.briberyCost} held={influence} spent={bribesSpent} />
      </AssemblyAction>
    </div>
  );
}

/**
 * The price on a purchase, and — when the purchase is inert — the reason it is.
 *
 * Veto and Bribe are routinely both greyed out on the very first ballot, and a
 * greyed slab with a price on it is indistinguishable from one you simply have
 * not clicked. The chip says which of the two walls you are against: a spent
 * allowance, or a shortfall you could still fix by collecting influence.
 */
function PurchaseChip({ cost, held, spent }: { cost: number; held: number; spent: boolean }) {
  if (spent) {
    return <small className="asmVoteWhy caption">none left</small>;
  }

  if (held < cost) {
    return (
      <small className="asmVoteWhy caption num">
        {cost - held} <Icon glyph={RESOURCE_GLYPHS.influence} /> short
      </small>
    );
  }

  return (
    <small className="asmVoteCost stat num">
      {cost}
      <Icon glyph={RESOURCE_GLYPHS.influence} />
    </small>
  );
}
