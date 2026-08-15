import { PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard, nextDrawCost, politicianStandings } from "../../../game/assembly";
import type {
  ActiveLaw,
  Politician,
  PoliticianStanding,
  TallyMonument,
} from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { POLITICIAN_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { DrawIcon } from "./AssemblyIcons";
import { AssemblyAction, ResolutionDetails } from "./AssemblyPresentation";
import { StandingLaw } from "./StandingLaw";
import { glazeOf } from "../../../ui/playerGlazes";

/**
 * The colonnade — four narrow columns, each politician standing over their own stack
 * of stelae.
 *
 * Stack height remains politician power and the leading author remains a descriptive
 * patron. Voice is shown separately because its passed-resolution tally is permanent.
 *
 * During the async proposal round each column also carries a **Draw** button — you
 * draw from a politician by reaching up to their pillar, which makes the "pick the
 * politician, not the card" choice (§1.3) a spatial one.
 */
export function AssemblyColonnade({ G }: { G: HegemonyState }) {
  const standings = politicianStandings(G);
  const { viewerId } = useGameUi();
  const session = G.assembly;

  // A seat draws only while proposing, before it has finalized, and while it is not
  // already holding a card it must first resolve.
  const proposing = session?.phase === "proposal" && !session.proposalDone[viewerId];
  const holding = Boolean(session?.held[viewerId]);
  const drawCost = session ? nextDrawCost(G, viewerId) : 0;

  return (
    <div className="colonnade">
      {standings.map((standing) => (
        <PoliticianColumn
          canDraw={
            Boolean(proposing) && !holding && G.players[viewerId].resources.influence >= drawCost
          }
          drawArmed={Boolean(proposing)}
          drawCost={drawCost}
          G={G}
          holding={holding}
          key={standing.politician.id}
          standing={standing}
        />
      ))}
    </div>
  );
}

function PoliticianColumn({
  G,
  standing,
  drawArmed,
  canDraw,
  drawCost,
  holding,
}: {
  G: HegemonyState;
  standing: PoliticianStanding;
  drawArmed: boolean;
  canDraw: boolean;
  drawCost: number;
  holding: boolean;
}) {
  const { politician, power, patron } = standing;
  const { moves, viewerId } = useGameUi();
  const isStratokles = politician.id === "stratokles";
  const deckLeft =
    G.politicianDecks[politician.id].length + G.politicianDiscards[politician.id].length;
  // Stratokles's stelae are permanent monuments, everyone else's are standing Laws —
  // the two are drawn differently because they mean different things.
  const stelae: Array<ActiveLaw | TallyMonument> = isStratokles
    ? G.tallyMonuments
    : G.activeLaws.filter(
        (law) => getResolutionCard(G.definition.content, law.cardId)?.politician === politician.id,
      );

  return (
    <div className={`colonnadeCol${isStratokles ? " isStratokles" : ""}`}>
      {/* The bust. An orator you can recognise before you read his name — the
          colonnade is scanned dozens of times a game and four identical text
          columns are four columns you have to read every time. */}
      <span className="steleBust">
        <Icon glyph={POLITICIAN_GLYPHS[politician.id]} size="rail" />
      </span>

      <div className="ahead">
        <Tooltip
          ariaLabel={`${politician.name} power: ${power} ${isStratokles ? "monuments" : "standing Laws"}`}
          content={
            <MechanicsDetails
              effects={[
                {
                  text: `${power} ${isStratokles ? "permanent monuments" : "standing Laws"}`,
                  tone: "neutral",
                },
              ]}
              heading={`${politician.name} power`}
              source={isStratokles ? "Resolved Directives" : "Standing Laws"}
            />
          }
          focusable
          preferredPlacement="above"
          triggerClassName="assemblyPowerTooltipTrigger"
        >
          <span className="oratorPower">{power}</span>
        </Tooltip>
        <span className="aname">{politician.name}</span>
        <span className="oratorEpithet">{politician.epithet}</span>
      </div>
      {/* What you are buying if you draw from this man, BEFORE you have seen a
          card. Authored in content beside the deck (Politician.tendency) and run
          through the same presenters and icons as every other effect — never a
          sentence the frontend wrote. */}
      <div className="dogma">
        <div className="dogmaKey label">
          {isStratokles ? "His decrees tend to" : "His laws tend to"}
        </div>
        {politician.kind === "law"
          ? politician.tendency.map((effect, index) => (
              <div className="dogmaRow effectRow" key={index}>
                <EffectIcon effect={effect} family="law" />
                <span className="caption">
                  {presentLawEffect(effect, G.definition.content).text}
                </span>
              </div>
            ))
          : politician.tendency.map((effect, index) => (
              <div className="dogmaRow effectRow" key={index}>
                <EffectIcon effect={effect} family="directive" />
                <span className="caption">{presentDirectiveEffect(effect).text}</span>
              </div>
            ))}
      </div>

      <div className="aprise">
        <span className="label">Author prize</span>{" "}
        <b className="stelePrize num">{formatPrize(G.ruleset.assembly.prizes[politician.id])}</b>
      </div>

      {drawArmed ? (
        <DrawButton
          canDraw={canDraw && deckLeft > 0}
          cost={drawCost}
          deckLeft={deckLeft}
          holding={holding}
          influence={G.players[viewerId].resources.influence}
          onDraw={() => moves.assemblyDraw(viewerId, politician.id)}
          politician={politician}
        />
      ) : null}

      {/* The patron line only exists once there is a stack to have a patron OF — an
          empty column says "no stelae stand" once, in the stack, and not twice. */}
      {power > 0 ? (
        <div className="ameta">
          {patron ? (
            <>
              <span className="oratorPatronDot" style={{ background: glazeOf(patron) }} />
              <b>{PLAYER_NAMES[patron]}</b> · descriptive patron
            </>
          ) : (
            <span className="ametaNone">no patron — the stack is split</span>
          )}
        </div>
      ) : null}

      <div className="stack">
        {stelae
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stele) => {
            const card = getResolutionCard(G.definition.content, stele.cardId);
            const source = isStratokles
              ? `Carried by ${authorName(stele.author)}`
              : `Enacted by ${authorName(stele.author)}`;

            if (!card) {
              return null;
            }

            return (
              <Tooltip
                ariaLabel={`${card.name}. ${isStratokles ? "Permanent monument" : "Standing Law"}. ${source}.`}
                content={
                  <ResolutionDetails
                    card={card}
                    content={G.definition.content}
                    duration={isStratokles ? "Resolved; monument is permanent" : "Until repealed"}
                    source={source}
                  />
                }
                focusable
                key={isStratokles ? `${stele.cardId}-${stele.order}` : stele.cardId}
                preferredPlacement="above"
                triggerAs="div"
                triggerClassName="assemblyCardTooltipTrigger"
              >
                <StandingLaw
                  content={G.definition.content}
                  monument={isStratokles}
                  stele={stele}
                  variant="stele"
                />
              </Tooltip>
            );
          })}
        {stelae.length === 0 ? <div className="steleEmpty">No stele bears his name.</div> : null}
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

function DrawButton({
  politician,
  cost,
  deckLeft,
  canDraw,
  holding,
  influence,
  onDraw,
}: {
  politician: Politician;
  cost: number;
  deckLeft: number;
  canDraw: boolean;
  holding: boolean;
  influence: number;
  onDraw: () => void;
}) {
  const blockedReason =
    deckLeft === 0
      ? `${politician.name}'s deck is spent.`
      : holding
        ? "Resolve the card you are holding first."
        : influence < cost
          ? `Requires ${cost} influence.`
          : undefined;

  return (
    <AssemblyAction
      blockedReason={blockedReason}
      className="acolDraw"
      effectiveCost={{ influence: cost }}
      enabled={canDraw}
      explanation={`Draw one random card from ${politician.name}'s deck. Only you see it until it is proposed.`}
      heading={`Draw from ${politician.name}`}
      onClick={onDraw}
      preferredPlacement="below"
      triggerClassName="assemblyDrawActionTrigger"
    >
      <DrawIcon size={12} />
      <span className="acolDrawLabel">Draw</span>
      <span className="acolDrawCost">{cost}</span>
    </AssemblyAction>
  );
}

function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
