import type { ReactNode } from "react";
import { nextDrawCost, politicianStandings } from "../../../game/assembly";
import type { Politician, PoliticianStanding } from "../../../game/assembly";
import type { HegemonyState, Resource } from "../../../game/types";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import type { EffectPresentation } from "../../../ui/effects";
import { POLITICIAN_GLYPHS, RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { AssemblyAction } from "./AssemblyPresentation";

/**
 * The colonnade — four SEPARATE stelae standing in the light across the top of
 * the floor.
 *
 * Separate is the whole word. They used to be four cells of one gridded slab
 * with no gap declared, so the cut corners met and read as dark V-notches
 * chipped out of a single stone. A stele is one man's monument; four of them
 * standing apart is a colonnade, and the 22px between them is what says so.
 *
 * Each stele answers one question — *what am I buying if I draw from this man?* —
 * before you have seen a card: his tendency in the same typed-effect vocabulary
 * the cards use, his author prize, the price of a draw, and a row of pips, one
 * per law he has landed on the board. The laws themselves stand on the floor
 * below in their own column; a stele counts, it does not list.
 *
 * The colonnade is drawn during PROPOSAL only. Nobody draws during a ballot.
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
    <div className="asmColonnade">
      {standings.map((standing) => (
        <Stele
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

function Stele({
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
  const { politician, power } = standing;
  const { moves, viewerId } = useGameUi();
  const isDemagogue = politician.kind === "directive";
  const deckLeft =
    G.politicianDecks[politician.id].length + G.politicianDiscards[politician.id].length;
  const tendency: EffectPresentation[] =
    politician.kind === "law"
      ? politician.tendency.map((effect) => presentLawEffect(effect, G.definition.content))
      : politician.tendency.map(presentDirectiveEffect);

  return (
    <article className="asmStele" data-orator={politician.id}>
      {/* The bust. An orator you recognise before you read his name — the colonnade
          is scanned dozens of times a game and four identical text columns are four
          columns you have to read every time. Four glazes, not two: the medallion
          is the fastest half of the recognition. */}
      <span className="asmBust" aria-hidden="true">
        <Icon glyph={POLITICIAN_GLYPHS[politician.id]} size="rail" />
      </span>

      <h3 className="asmSteleName title">{politician.name}</h3>
      <p className="asmSteleEpithet label">{politician.epithet}</p>

      <div className="asmDogma">
        <span className="asmDogmaKey label">
          {isDemagogue ? "His decrees tend to" : "His laws tend to"}
        </span>
        {politician.kind === "law"
          ? politician.tendency.map((effect, index) => (
              <TendencyRow
                key={index}
                presented={tendency[index]}
                icon={<EffectIcon effect={effect} family="law" />}
              />
            ))
          : politician.tendency.map((effect, index) => (
              <TendencyRow
                key={index}
                presented={tendency[index]}
                icon={<EffectIcon effect={effect} family="directive" />}
              />
            ))}
      </div>

      <div className="asmStelePrize">
        <span className="asmPrizeKey label">Author prize</span>
        <PrizeAmount prize={G.ruleset.assembly.prizes[politician.id]} />
      </div>

      {drawArmed ? (
        <DrawSeal
          canDraw={canDraw && deckLeft > 0}
          cost={drawCost}
          deckLeft={deckLeft}
          holding={holding}
          influence={G.players[viewerId].resources.influence}
          onDraw={() => moves.assemblyDraw(viewerId, politician.id)}
          politician={politician}
        />
      ) : null}

      {/* One pip per stele this orator has landed. A count you can see is worth
          more here than a list: the laws themselves stand on the floor below. */}
      <Tooltip
        ariaLabel={`${politician.name} power: ${power} ${isDemagogue ? "monuments" : "standing Laws"}`}
        content={
          <MechanicsDetails
            effects={[
              {
                text: `${power} ${isDemagogue ? "permanent monuments" : "standing Laws"}`,
                tone: "neutral",
              },
            ]}
            heading={`${politician.name} power`}
            source={isDemagogue ? "Resolved Directives" : "Standing Laws"}
          />
        }
        focusable
        preferredPlacement="below"
        triggerAs="div"
        triggerClassName="asmPipsTrigger"
      >
        <div className="asmPips">
          {Array.from({ length: power }, (_, index) => (
            <i className="asmPip" key={index} />
          ))}
        </div>
      </Tooltip>
    </article>
  );
}

/**
 * A tendency row: the glyph tinted by the effect's own tone, the signed number
 * inked to match, and the rest of the clause in ink. Monochrome rows made four
 * orators look like four copies of the same paragraph — the colour is what lets
 * you tell "this man pays you" from "this man charges you" at a glance.
 */
function TendencyRow({ presented, icon }: { presented: EffectPresentation; icon: ReactNode }) {
  const tone = presented.tone === "positive" ? "pos" : presented.tone === "negative" ? "neg" : "";

  return (
    <p className={`asmDogmaRow caption${tone ? ` is-${tone}` : ""}`}>
      <span className="asmDogmaIcon">{icon}</span>
      <span>
        {splitSignedNumbers(presented.text).map((part, index) =>
          part.signed ? (
            <b className={`${part.text.startsWith("-") ? "neg" : "pos"} num`} key={index}>
              {part.text}
            </b>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </span>
    </p>
  );
}

const SIGNED = /([+-]\d+(?:\.\d+)?)/g;

function splitSignedNumbers(text: string): Array<{ text: string; signed: boolean }> {
  return text
    .split(SIGNED)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, signed: /^[+-]\d/.test(part) }));
}

/** The prize as a number with its own resource glyph, centred under the tendency. */
function PrizeAmount({ prize }: { prize: Partial<Record<Resource, number>> }) {
  const entries = Object.entries(prize).filter(([, amount]) => Boolean(amount)) as Array<
    [Resource, number]
  >;

  if (entries.length === 0) {
    return <span className="asmPrizeNone caption">none</span>;
  }

  return (
    <span className="asmPrizeValue stat pos num">
      {entries.map(([resource, amount]) => (
        <span className="asmPrizePart" key={resource}>
          <Icon glyph={RESOURCE_GLYPHS[resource]} />+{amount}
        </span>
      ))}
    </span>
  );
}

/** The one pressable thing on a stele: a clay seal with the influence it costs. */
function DrawSeal({
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
      className="asmDraw verb"
      effectiveCost={{ influence: cost }}
      enabled={canDraw}
      explanation={`Draw one random card from ${politician.name}'s deck. Only you see it until it is proposed.`}
      heading={`Draw from ${politician.name}`}
      onClick={onDraw}
      preferredPlacement="below"
      triggerClassName="asmDrawTrigger"
    >
      Draw
      <b className="asmDrawCost stat num">{cost}</b>
      <Icon glyph={RESOURCE_GLYPHS.influence} />
    </AssemblyAction>
  );
}
