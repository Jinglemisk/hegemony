import { PLAYER_COLORS, PLAYER_NAMES } from "../../../game/data";
import { getResolutionCard, nextDrawCost, politicianStandings } from "../../../game/assembly";
import type {
  ActiveLaw,
  Politician,
  PoliticianStanding,
  TallyMonument,
} from "../../../game/assembly";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { DrawIcon } from "./AssemblyIcons";
import { AssemblyAction, ResolutionDetails } from "./AssemblyPresentation";

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
    <div className={`acol${isStratokles ? " strat" : ""}`}>
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
          <span className="apow">{power}</span>
        </Tooltip>
        <span className="aname">{politician.name}</span>
        <span className="aep">{politician.epithet}</span>
      </div>
      <div className="aprise">
        Author prize · {formatPrize(G.ruleset.assembly.prizes[politician.id])}
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
              <span className="dot" style={{ background: PLAYER_COLORS[patron] }} />
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
                {isStratokles ? (
                  <div className="tally">
                    <span className="tk">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="tn">{card.name}</span>
                  </div>
                ) : (
                  <div className="stele">
                    <span className="sd" style={{ background: authorColor(stele.author) }} />
                    <span className="sn">{card.name}</span>
                  </div>
                )}
              </Tooltip>
            );
          })}
        {stelae.length === 0 ? <div className="steleEmpty">No stelae stand.</div> : null}
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

/** The house resolution has no author, so its bead is stone rather than a seat colour —
 *  it stands in the agora and lends its politician power, but it is nobody's stele. */
function authorColor(author: PlayerId | null): string {
  return author ? PLAYER_COLORS[author] : "var(--stone)";
}

function authorName(author: PlayerId | null): string {
  return author ? PLAYER_NAMES[author] : "the house";
}
