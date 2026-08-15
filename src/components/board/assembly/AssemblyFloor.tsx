import { useState } from "react";
import type { ReactNode } from "react";
import { PLAYER_IDS, PLAYER_NAMES } from "../../../game/data";
import {
  availableLawReplacementIds,
  activeLawIds,
  baseVoteWeight,
  getResolutionCard,
  lawNeedsReplacement,
  POLITICIANS_BY_ID,
} from "../../../game/assembly";
import type {
  AssemblyResult,
  AssemblySession,
  BallotItem,
  ResolutionCard,
} from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { HegemonyState, PlayerId, Resource } from "../../../game/types";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { AssemblyAction, ResolutionDetails } from "./AssemblyPresentation";
import { StandingLaw } from "./StandingLaw";

/**
 * The floor of the house — one hero object with one companion beside it.
 *
 * Proposal: the resolution you are holding, at full size and NOT inside a
 * bordered box, with the standing laws beside it — the two things you weigh
 * against each other before you propose. Voting: the card under the ballot with
 * the next one peeking out from under it, and the scale beside it.
 *
 * Five equal columns used to stand here, one per seat, three of which rendered
 * as empty voids. A vote is about ONE card at a time; the seats belong at the
 * foot of the scene as plaques, not as five tall boxes competing with the thing
 * being voted on.
 */
export function AssemblyFloor({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  if (session.phase === "closing") {
    return <ClosingFloor G={G} session={session} />;
  }

  if (session.phase === "voting") {
    return <VotingFloor G={G} session={session} />;
  }

  return <ProposalFloor G={G} session={session} />;
}

// ── Proposal ────────────────────────────────────────────────────────────────────

function ProposalFloor({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const { viewerId } = useGameUi();
  const held = session.held[viewerId];
  const sealed = session.proposals[viewerId];
  const house = session.houseItem;

  return (
    <div className="asmFloor">
      <div className="asmCardWrap">
        {held ? (
          <LawCardFace
            G={G}
            card={held.card}
            kicker={`Of ${POLITICIANS_BY_ID[held.card.politician].name} · drawn by you`}
            proposer={viewerId}
            actions={<ProposeDiscard G={G} card={held.card} />}
          />
        ) : sealed ? (
          <BallotFace G={G} item={sealed} kickerPrefix="Sealed" />
        ) : house ? (
          <BallotFace G={G} item={house} kickerPrefix="A house law" />
        ) : (
          <p className="asmFloorEmpty body-em">Nothing lies on the bema.</p>
        )}

        {!held && !session.proposalDone[viewerId] ? (
          <p className="asmFloorPrompt body-em">Your move — draw from a stele above, or pass.</p>
        ) : null}
      </div>

      <StandingColumn G={G} />
    </div>
  );
}

/**
 * The standing record, beside the card that wants to join it. Six stelae stand at
 * most; the ones still bare get their own dashed slab, because "five empty" is a
 * fact you act on — it is the difference between proposing freely and having to
 * name a Law to tear down.
 */
function StandingColumn({ G }: { G: HegemonyState }) {
  const cap = G.ruleset.assembly.lawCap;
  const laws = [...G.activeLaws].sort((a, b) => a.order - b.order);
  const bare = Math.max(0, cap - laws.length);
  const monuments = [...G.tallyMonuments].sort((a, b) => a.order - b.order);

  return (
    <section className="asmStanding">
      <h4 className="asmStandingKey label">
        Standing laws · {laws.length} of {cap}
      </h4>

      {laws.map((law) => (
        <LawSlab G={G} key={law.cardId} law={law} />
      ))}

      {bare > 0 ? (
        <p className="asmSlabBare body-em">
          {bare === cap
            ? "No law stands. The stones are bare."
            : bare === 1
              ? "one stele stands empty"
              : `${bare} stelae stand empty`}
        </p>
      ) : null}

      {monuments.length > 0 ? (
        <>
          <h4 className="asmStandingKey label">Monuments · {monuments.length}</h4>
          {monuments.map((monument) => (
            <LawSlab G={G} key={`${monument.cardId}-${monument.order}`} law={monument} monument />
          ))}
        </>
      ) : null}
    </section>
  );
}

function LawSlab({
  G,
  law,
  monument = false,
}: {
  G: HegemonyState;
  law: { cardId: string; author: PlayerId | null; enactedSeason: number; order: number };
  monument?: boolean;
}) {
  const card = getResolutionCard(G.definition.content, law.cardId);

  if (!card) {
    return null;
  }

  return (
    <Tooltip
      ariaLabel={`${card.name}. ${monument ? "Permanent monument" : "Standing Law"}.`}
      content={
        <ResolutionDetails
          card={card}
          content={G.definition.content}
          duration={monument ? "Resolved; monument is permanent" : "Until repealed"}
          source={law.author ? PLAYER_NAMES[law.author] : "the house"}
        />
      }
      focusable
      preferredPlacement="below"
      triggerAs="div"
      triggerClassName="asmSlabTrigger"
    >
      <StandingLaw content={G.definition.content} monument={monument} stele={law} />
    </Tooltip>
  );
}

// ── Voting ──────────────────────────────────────────────────────────────────────

function VotingFloor({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const current = session.ballot[session.ballotIndex];
  const next = session.ballot[session.ballotIndex + 1];

  return (
    <div className="asmFloor">
      <div className="asmCardWrap">
        {current ? (
          <BallotFace G={G} item={current} kickerPrefix={null} />
        ) : (
          <p className="asmFloorEmpty body-em">The bema is clear.</p>
        )}
        {/* The rest of the ballot exists, so it is drawn: one card peeking out from
            under the current one says how much of the sitting is still to come. */}
        {next ? (
          <p className="asmNextCard label">Next on the bema · {ballotName(G, next)}</p>
        ) : null}
      </div>

      <VoteTally G={G} session={session} />
    </div>
  );
}

function ballotName(G: HegemonyState, item: BallotItem): string {
  if (item.kind === "repeal") {
    const card = getResolutionCard(G.definition.content, item.cardId);
    return `Repeal ${card?.name ?? item.cardId} — ${PLAYER_NAMES[item.proposer]}`;
  }

  return `${item.card.name} — ${item.proposer ? PLAYER_NAMES[item.proposer] : "the house"}`;
}

/**
 * The scale. Two hero numerals over a tug bar with an ivory tie-notch, and under
 * it one potsherd per voter — a ghost outline for every vote still to come.
 *
 * The bar tells you the shape of the vote; the sherds make it COUNTABLE, which is
 * what you need before you decide whether to spend a bribe. The notch is the whole
 * point of drawing a bar at all: a tie FAILS, and without a mark at the middle
 * there is nothing to be short of.
 */
function VoteTally({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const yea = session.votes.filter((v) => v.yea).reduce((total, v) => total + v.weight, 0);
  const nay = session.votes.filter((v) => !v.yea).reduce((total, v) => total + v.weight, 0);
  const waiting = PLAYER_IDS.filter((id) => !session.votes.some((v) => v.playerID === id));
  const pending = waiting.reduce(
    (total, id) => total + baseVoteWeight(G, id) + session.bribesUsed[id],
    0,
  );
  const yeaSeats = session.votes.filter((v) => v.yea).length;
  const naySeats = session.votes.filter((v) => !v.yea).length;
  const cast = session.votes.length;

  return (
    <div className="voteTally asmTally">
      <div className="asmTallyNums">
        <span className="asmTallySide is-yea">
          <b className="asmTallyNum num">{yea}</b>
          <span className="asmTallyKey label">Yea</span>
        </span>
        <span className="asmTallySide is-nay">
          <b className="asmTallyNum num">{nay}</b>
          <span className="asmTallyKey label">Nay</span>
        </span>
      </div>

      {/* Proportional flex, never percentage widths: three percentages each
          rounding up is how this bar came to overflow its own clip by 3px. */}
      <span className="tugBar">
        <span className="tugYea" style={{ flexGrow: yea }} />
        <span className="tugPending" style={{ flexGrow: pending }} />
        <span className="tugNay" style={{ flexGrow: nay }} />
      </span>

      {/* Three groups, matching the bar's three zones and meeting at the notch.
          The ghosts used to be pre-split `ceil(waiting / 2)` to each side, so an
          untouched ballot showed two sherds already committed to Yea and two to
          Nay — a PREDICTION of a vote nobody had cast. An uncast vote belongs to
          neither pile; it sits in the urn over the tie mark until it is cast.
          The piles also sat at opposite ends of a 430px bar, which is why
          "countable" never landed — they grow inward now. */}
      <div aria-hidden="true" className="asmShards">
        <span className="asmPile is-yea">{pile(yeaSeats, "yea")}</span>
        <span className="asmPile asmPileUrn">{pile(waiting.length, "ghost")}</span>
        <span className="asmPile is-nay">{pile(naySeats, "nay")}</span>
      </div>

      <p className="asmVerdict">
        <span className="asmVerdictLine label">{verdict(yea, nay, pending, cast)}</span>
        <small className="body-em">{voteNote(G, session, yea, nay, pending, cast)}</small>
      </p>

      <p className="asmOrder label">
        Voted in turn ·{" "}
        {session.voteOrder.map((id, index) => {
          const cast = session.votes.some((v) => v.playerID === id);
          const now = index === session.voteIndex;

          return (
            <span key={id}>
              {index > 0 ? <span className="asmOrderArrow"> → </span> : null}
              <span className={`asmOrderName${now ? " is-now" : cast ? " is-cast" : ""}`}>
                {PLAYER_NAMES[id]}
              </span>
            </span>
          );
        })}
      </p>
    </div>
  );
}

function pile(count: number, side: "yea" | "nay" | "ghost"): ReactNode[] {
  const sherds: ReactNode[] = [];
  for (let i = 0; i < count; i += 1) {
    sherds.push(<i className={`asmShard is-${side}`} key={i} />);
  }
  return sherds;
}

/**
 * The dramatic read on the vote — the headline the ballot's counter used to occupy.
 *
 * The zero branch is not a nicety. A ballot OPENS at 0–0 with votes pending, and
 * 0 === 0 fell into the tie test, so the scene's one dramatic line announced a
 * cliffhanger about a vote nobody had cast — every seed, every width, and on a
 * short ballot it was the only verdict the scene ever showed. A tie is only a tie
 * once someone has spoken; before that, the honest headline is that nobody has.
 */
export function verdict(yea: number, nay: number, pending: number, cast: number): string {
  if (cast === 0) {
    return "The floor is open";
  }
  if (pending === 0) {
    return yea > nay ? "It carries" : yea === nay ? "Tied — the law falls" : "It is voted down";
  }
  if (yea === nay) {
    return "On the knife's edge";
  }
  if (pending >= Math.abs(yea - nay)) {
    return "Still in the balance";
  }
  return yea > nay ? "It cannot be stopped" : "It cannot be saved";
}

/** The running read on a close card — the thing a player would otherwise compute in
 *  their head before deciding whether to spend a bribe or a veto. */
function voteNote(
  G: HegemonyState,
  session: AssemblySession,
  yea: number,
  nay: number,
  pending: number,
  cast: number,
): string {
  if (pending === 0) {
    return yea > nay ? "the house has spoken" : "a tie fails, and this one is decided";
  }

  const next = session.voteOrder.filter((id) => !session.votes.some((v) => v.playerID === id))[0];

  if (cast === 0) {
    return `${PLAYER_NAMES[next]} opens; ${pending} votes stand to be cast, and a tie fails`;
  }

  if (pending >= Math.abs(yea - nay)) {
    return `${PLAYER_NAMES[next]} speaks next; the ${pending} votes to come can still swing it`;
  }

  return yea > nay ? "the rest cannot stop it" : "the rest cannot save it";
}

// ── The card face ───────────────────────────────────────────────────────────────

function BallotFace({
  G,
  item,
  kickerPrefix,
}: {
  G: HegemonyState;
  item: BallotItem;
  kickerPrefix: string | null;
}) {
  if (item.kind === "repeal") {
    return (
      <RepealFace cardId={item.cardId} content={G.definition.content} proposer={item.proposer} />
    );
  }

  const orator = POLITICIANS_BY_ID[item.card.politician].name;
  const by = item.proposer ? PLAYER_NAMES[item.proposer] : "the house";

  return (
    <LawCardFace
      G={G}
      card={item.card}
      kicker={kickerPrefix ? `${kickerPrefix} · of ${orator}` : `Of ${orator} · by ${by}`}
      proposer={item.proposer}
      target={item.target}
    />
  );
}

/**
 * The resolution, at the size the thing being voted on deserves — a fired ivory
 * card floating on the dark floor with a meander band across its head, and NOT
 * sitting inside a bordered container. The darkness is the frame.
 */
function LawCardFace({
  G,
  card,
  kicker,
  proposer,
  target,
  actions,
}: {
  G: HegemonyState;
  card: ResolutionCard;
  kicker: string;
  proposer: PlayerId | null;
  target?: PlayerId;
  actions?: ReactNode;
}) {
  const politician = POLITICIANS_BY_ID[card.politician];

  return (
    <article className="asmLawCard">
      <span aria-hidden="true" className="asmLawBand" />

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
        triggerClassName="asmLawFaceTrigger"
      >
        <div className="asmLawFace">
          <p className="asmLawKicker label">{kicker}</p>
          <h2 className="asmLawName">{card.name}</h2>
          <span aria-hidden="true" className="asmLawRule" />
          <ResolutionEffect card={card} />

          {target ? (
            <p className="asmLawTarget label">
              <span className="asmTargetDot" style={{ background: glazeOf(target) }} />
              Aimed at {PLAYER_NAMES[target]}
            </p>
          ) : null}

          {proposer ? (
            <p className="asmLawPrize">
              <span className="asmPrizeKey label">Author prize</span>
              <PrizeLine prize={G.ruleset.assembly.prizes[card.politician]} />
            </p>
          ) : (
            <p className="asmLawHouseNote label">House laws grant no author prize</p>
          )}

          <p className={`asmLawKind label${card.kind === "directive" ? " is-directive" : ""}`}>
            {card.kind === "law" ? "Standing law" : "One-time directive"}
          </p>
        </div>
      </Tooltip>

      {actions ? <div className="asmLawActs">{actions}</div> : null}
    </article>
  );
}

function RepealFace({
  cardId,
  content,
  proposer,
}: {
  cardId: string;
  content: GameContent;
  proposer: PlayerId;
}) {
  const card = getResolutionCard(content, cardId);

  return (
    <article className="asmLawCard asmLawRepeal">
      <span aria-hidden="true" className="asmLawBand" />
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
        triggerClassName="asmLawFaceTrigger"
      >
        <div className="asmLawFace">
          <p className="asmLawKicker label">A motion to strike · by {PLAYER_NAMES[proposer]}</p>
          <h2 className="asmLawName">Repeal {card?.name ?? cardId}</h2>
          <span aria-hidden="true" className="asmLawRule" />
          <p className="asmLawText">
            Strike this standing law from the record. {card ? <em>{card.text}</em> : null}
          </p>
        </div>
      </Tooltip>
    </article>
  );
}

function PrizeLine({ prize }: { prize: Partial<Record<Resource, number>> }) {
  const entries = Object.entries(prize).filter(([, amount]) => Boolean(amount)) as Array<
    [Resource, number]
  >;

  return (
    <span className="asmPrizeValue stat pos num">
      {entries.map(([resource, amount]) => (
        <span className="asmPrizePart" key={resource}>
          <Icon glyph={RESOURCE_GLYPHS[resource]} />+{amount}
        </span>
      ))}
      {entries.length === 0 ? "none" : null}
    </span>
  );
}

/**
 * The effect line on the one hero object the proposal phase has.
 *
 * A resolution is inked by POLARITY: olive for what the table wins, oxblood for
 * what it pays. That carving is the whole point of drawing the card large — a
 * vote is a referendum on which build the table backs, and the two halves have to
 * be separable at a glance.
 *
 * The carving used to be decided by `card.text.split(", but ")`, and a substring
 * match on authored prose is the wrong mechanism for it. Eight of the thirty-one
 * cards carry no such comma — including ALL SEVEN of Stratokles's aimed
 * directives, the most dramatic cards in the deck — so a quarter of the content
 * fell out to flat grey prose, decided by whether an author remembered a comma.
 *
 * The cards carry TYPED effects, each with a tone, so the types decide the shape:
 *
 * · the tones say whether this card has a gain, a cost, or both — no parsing,
 * · a card with both is a trade-off card and reads on two lines, and only then is
 *   the authored seam consulted, and only to decide where the line breaks,
 * · a card with one polarity is carved whole in that polarity — a pure blow reads
 *   oxblood end to end, which is what Stratokles's directives always wanted,
 * · a card whose effects pull both ways inside one clause is carved neutral,
 *   because there is no single side for it to claim.
 *
 * Nothing falls through to flat prose any more. The authored sentence is still
 * the words on the face — the presenter's terse rendering ("grow pop: +2 Gold
 * cost") is the right thing in a ledger and the wrong thing on the object you
 * vote on — and it stays available verbatim in the card's own tooltip.
 */
export function ResolutionEffect({ card }: { card: ResolutionCard }) {
  const tones = new Set(
    card.kind === "law"
      ? card.effects.map((effect) => presentLawEffect(effect).tone)
      : card.effects.map((effect) => presentDirectiveEffect(effect).tone),
  );
  const tradeOff = tones.has("positive") && tones.has("negative");
  const seam = tradeOff ? card.text.indexOf(", but ") : -1;

  if (seam >= 0) {
    return (
      <p className="asmLawText">
        <span className="asmClause asmClauseGain">{card.text.slice(0, seam)},</span>
        <span className="asmClause asmClauseCost">
          <i className="asmClauseBut">but</i> {card.text.slice(seam + ", but ".length)}
        </span>
      </p>
    );
  }

  const whole = tradeOff
    ? "asmClauseWhole"
    : tones.has("positive")
      ? "asmClauseGain"
      : tones.has("negative")
        ? "asmClauseCost"
        : "asmClauseWhole";

  return (
    <p className="asmLawText">
      <span className={`asmClause ${whole}`}>{card.text}</span>
    </p>
  );
}

// ── Propose / discard, under the card they concern ──────────────────────────────

function ProposeDiscard({ G, card }: { G: HegemonyState; card: ResolutionCard }) {
  const { moves, viewerId } = useGameUi();
  const [replacementAnchor, setReplacementAnchor] = useState<DOMRect | null>(null);
  const alreadyStanding = card.kind === "law" && activeLawIds(G).includes(card.id);
  const needsReplacement = card.kind === "law" && lawNeedsReplacement(G);
  const replacementCandidates = availableLawReplacementIds(G);

  if (alreadyStanding) {
    return (
      <>
        <span className="asmBlocked label">Already stands</span>
        <AssemblyAction
          className="asmAct is-ghost verb-lg"
          enabled
          explanation="Return this held card to its politician's discard pile without adding it to the ballot."
          heading={`Discard ${card.name}`}
          onClick={() => moves.assemblyDiscardHeld(viewerId)}
          triggerClassName="asmActTrigger"
        >
          Discard
        </AssemblyAction>
      </>
    );
  }

  return (
    <>
      {card.kind === "directive" ? (
        <>
          <AssemblyAction
            className="asmAct is-primary verb-lg"
            enabled
            explanation="Choose one rival, then seal this Directive. The target is revealed with the ballot before voting begins."
            heading={`Target ${card.name}`}
            onClick={(event) => setReplacementAnchor(event.currentTarget.getBoundingClientRect())}
            triggerClassName="asmActTrigger"
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
                          style={{ background: PLAYER_GLAZES[target].color }}
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
            className="asmAct is-primary verb-lg"
            enabled
            explanation="Add this Law to the ballot. Because the standing-Law board is full or its remaining slots are reserved, choose the Law it would replace if passed."
            heading={`Propose ${card.name}`}
            onClick={(event) => setReplacementAnchor(event.currentTarget.getBoundingClientRect())}
            triggerClassName="asmActTrigger"
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
          className="asmAct is-primary verb-lg"
          enabled
          explanation="Add this held resolution to the Assembly ballot. It is revealed after every seat has decided."
          heading={`Propose ${card.name}`}
          onClick={() => moves.assemblyPropose(viewerId)}
          triggerClassName="asmActTrigger"
        >
          Propose
        </AssemblyAction>
      )}
      <AssemblyAction
        className="asmAct is-ghost verb-lg"
        enabled
        explanation="Return this held card to its politician's discard pile without adding it to the ballot."
        heading={`Discard ${card.name}`}
        onClick={() => moves.assemblyDiscardHeld(viewerId)}
        triggerClassName="asmActTrigger"
      >
        Discard
      </AssemblyAction>
    </>
  );
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

// ── Closing ─────────────────────────────────────────────────────────────────────

/**
 * The house rises — and this used to be the weakest surface in the build.
 *
 * Three things were wrong with it and all three were the same thing: the moment
 * of consequence was drawn with less material than the moments before it.
 *
 * · A law PASSING and a law FAILING rendered as the same grey sentence with 5–0
 *   or 0–5 in the same weight. The verdict is the news; it now carries the ink.
 * · The standing-laws column stood beside the card through the whole proposal
 *   and vanished at the exact moment it had news — the stele that was just
 *   planted is the outcome of everything the sitting did. It comes back.
 * · Content stopped at y≈380 with the seats at 770, and at 1920 roughly 85% of
 *   the scene was empty black. Three columns of real objects, stretched to the
 *   floor's height, is what fills it — not padding.
 */
function ClosingFloor({ G, session }: { G: HegemonyState; session: AssemblySession }) {
  const ranked = [...PLAYER_IDS].sort(
    (a, b) =>
      G.assemblyPassedByPlayer[b] - G.assemblyPassedByPlayer[a] ||
      PLAYER_IDS.indexOf(a) - PLAYER_IDS.indexOf(b),
  );

  return (
    <div className="asmFloor asmFloorClosing">
      <section className="asmRecap">
        <h4 className="asmStandingKey label">What the Assembly decided</h4>
        {session.results.length === 0 ? (
          <p className="asmFloorEmpty body-em">The house rose with nothing on the bema.</p>
        ) : (
          <ul className="asmResults">
            {session.results.map((result, index) => (
              <li className={`is-${outcomeOf(result)}`} key={index}>
                <span className="asmResultVerdict label">{OUTCOME_WORDS[outcomeOf(result)]}</span>
                <span className="asmResultText body">{result.summary}</span>
                <span className="asmResultTally stat num">
                  {result.vetoedBy ? "—" : `${result.yea}–${result.nay}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="asmCapNote body-em">{steleNote(G)}</p>
      </section>

      <StandingColumn G={G} />

      <section className="asmRecap">
        {/* "Voice ledger · authored resolutions passed" wrapped, orphaning
            "PASSED" onto a line of its own in tracked caps. The heading names
            the thing; the column of numerals under it is self-evidently a count. */}
        <h4 className="asmStandingKey label">Voice ledger</h4>
        {ranked.map((playerID) => (
          <p className="asmVoiceRow" key={playerID}>
            <span className="asmGlaze title" style={{ background: PLAYER_GLAZES[playerID].color }}>
              {PLAYER_GLAZES[playerID].blazon}
            </span>
            <span className="asmVoiceRowName verb">{PLAYER_NAMES[playerID]}</span>
            <span className="asmVoiceRowNote caption">
              {G.voiceHolder === playerID
                ? "holds Voice through ties"
                : `minimum ${G.ruleset.victory.minimums.voice}`}
            </span>
            <b className="asmVoiceRowCount stat num">{G.assemblyPassedByPlayer[playerID]}</b>
          </p>
        ))}
        <p className="asmVoiceFoot body-em">
          resolutions each seat has authored and carried, all sittings
        </p>
      </section>
    </div>
  );
}

type Outcome = "enacted" | "struck" | "fallen";

/** The word the house would say. It is the news, so it is set as a verdict and
 *  not left to be inferred from whether 5–0 or 0–5 came first. */
const OUTCOME_WORDS: Record<Outcome, string> = {
  enacted: "Enacted",
  struck: "Vetoed",
  fallen: "Falls",
};

function outcomeOf(result: AssemblyResult): Outcome {
  return result.vetoedBy ? "struck" : result.passed ? "enacted" : "fallen";
}

/** What the agora looks like now the sitting has risen. "0 of 6 stelae planted.
 *  6 slots of headroom." is a status field read aloud; this is the same two facts
 *  said the way the rest of the scene talks. */
function steleNote(G: HegemonyState): string {
  const cap = G.ruleset.assembly.lawCap;
  const standing = G.activeLaws.length;

  if (standing === 0) {
    return `No law stands. All ${cap} stones are bare.`;
  }

  if (standing >= cap) {
    return `Every stone is carved. A new Law must now name the one it tears down.`;
  }

  return `${standing} of ${cap} stones carved — ${cap - standing} still bare.`;
}
