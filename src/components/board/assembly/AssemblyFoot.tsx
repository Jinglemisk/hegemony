import type { MouseEventHandler, ReactNode } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import { activeLawIds, getResolutionCard } from "../../../game/assembly";
import type { AssemblySession } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { Popover } from "../../overlays/Popover";
import { useGameUi } from "../GameUiContext";
import { PassIcon, RepealIcon } from "./AssemblyIcons";
import { AssemblyAction } from "./AssemblyPresentation";

export type AssemblyMenu = { kind: "repeal"; anchor: DOMRect } | null;

/**
 * The foot carries only the two verbs that belong to nobody's card: **Repeal**,
 * which puts the removal of a standing Law on the ballot, and **Pass**, which
 * ends your proposal turn saying nothing. Propose and Discard live on the card
 * they concern; Yea, Nay, Veto and Bribe live on the seat that is casting.
 *
 * The ballot has no foot at all. Bribe used to sit here, one dock away from the
 * vote it buys — it is on the caster's plaque now, which is where the decision
 * is actually made.
 *
 * Proposal is asynchronous, so a verb is live when the VIEWER has not yet
 * finalized (`proposalDone`), never mind whose turn the engine parks on.
 */
export function AssemblyFoot({
  G,
  session,
  menu,
  onMenu,
}: {
  G: HegemonyState;
  session: AssemblySession;
  menu: AssemblyMenu;
  onMenu: (menu: AssemblyMenu) => void;
}) {
  const { moves, viewerId } = useGameUi();
  const rules = G.ruleset.assembly;
  const influence = G.players[viewerId].resources.influence;
  const held = Boolean(session.held[viewerId]);
  const standing = activeLawIds(G);

  if (session.phase === "voting") {
    return null;
  }

  if (session.phase === "closing") {
    return (
      <div className="asmFoot">
        <button className="asmRise verb-lg" onClick={() => moves.assemblyClose()} type="button">
          Rise &amp; return to the map
        </button>
      </div>
    );
  }

  if (session.proposalDone[viewerId]) {
    const left = session.voteOrder.filter((id) => !session.proposalDone[id]).length;

    return (
      <div className="asmFoot">
        <span className="asmFootNote body-em">
          You have spoken · {left} still to decide — take a seat below
        </span>
      </div>
    );
  }

  return (
    <div className="asmFoot">
      <div className="asmSelectWrap">
        <Verb
          armed={standing.length > 0 && influence >= rules.repealCost && !held}
          blockedReason={
            held
              ? "Resolve the card you are holding first."
              : standing.length === 0
                ? "No standing Law can be repealed."
                : influence < rules.repealCost
                  ? `Requires ${rules.repealCost} influence.`
                  : undefined
          }
          cost={`${rules.repealCost} influence`}
          effectiveCost={{ influence: rules.repealCost }}
          explanation="Put the removal of a standing Law on the ballot. The motion is voted like any other resolution."
          icon={<RepealIcon />}
          label="Repeal"
          onClick={(event) =>
            onMenu(
              menu?.kind === "repeal"
                ? null
                : { kind: "repeal", anchor: event.currentTarget.getBoundingClientRect() },
            )
          }
        />
        {menu?.kind === "repeal" ? (
          <Popover
            anchor={menu.anchor}
            ariaLabel="Choose a standing Law to repeal"
            className="assemblyMenuPopover"
            measureKey={standing.length}
            onDismiss={() => onMenu(null)}
            preferredPlacement="above"
          >
            <div className="asmMenu">
              <p className="asmMenuHead">Move to strike a standing Law</p>
              <ul aria-label="Standing Laws available to repeal" className="asmMenuChoices">
                {standing.map((cardId) => (
                  <li key={cardId}>
                    <button
                      onClick={() => {
                        moves.assemblyProposeRepeal(viewerId, cardId);
                        onMenu(null);
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
      </div>

      <Verb
        armed
        cost="say nothing"
        explanation="Finalize your proposal turn without adding a card. The house card still goes to the vote."
        icon={<PassIcon />}
        label="Pass"
        onClick={() => moves.assemblyPass(viewerId)}
      />

      <span className="asmFootNote body-em">
        {PLAYER_NAMES[viewerId]} holds the floor · every seat decides in secret
      </span>
    </div>
  );
}

function Verb({
  armed,
  blockedReason,
  cost,
  effectiveCost,
  explanation,
  icon,
  label,
  onClick,
}: {
  armed: boolean;
  blockedReason?: ReactNode;
  cost: string;
  effectiveCost?: { influence: number };
  explanation: ReactNode;
  icon: ReactNode;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <AssemblyAction
      blockedReason={blockedReason}
      className={`asmVerb${armed ? " is-armed" : " is-off"}`}
      effectiveCost={effectiveCost}
      enabled={armed}
      explanation={explanation}
      heading={label}
      onClick={onClick}
      triggerClassName="asmVerbTrigger"
    >
      <span className="asmVerbIcon">{icon}</span>
      <span className="asmVerbText">
        <span className="asmVerbLabel verb">{label}</span>
        <span className="asmVerbCost caption">{cost}</span>
      </span>
    </AssemblyAction>
  );
}
