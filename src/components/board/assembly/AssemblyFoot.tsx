import type { MouseEventHandler, ReactNode } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import { activeLawIds, getResolutionCard } from "../../../game/assembly";
import type { AssemblySession } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { Popover } from "../../overlays/Popover";
import { useGameUi } from "../GameUiContext";
import { BribeIcon, PassIcon, RepealIcon } from "./AssemblyIcons";
import { AssemblyAction } from "./AssemblyPresentation";

export type AssemblyMenu = { kind: "repeal"; anchor: DOMRect } | null;

/**
 * The action dock now carries only the cross-cutting verbs — the primary card actions
 * (propose/discard, yea/nay) and veto live under the cards in the bema columns
 * (owner ruling, 2026-07-21). So the dock is Repeal + Pass while proposing, and Bribe
 * while voting.
 *
 * Proposal is asynchronous, so a verb is live when the VIEWER has not yet finalized
 * (`proposalDone`), never mind whose turn the engine parks on. Voting is sequential,
 * so Bribe gates on it being the viewer's turn to cast.
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

  if (session.phase === "closing") {
    return (
      <div className="asm-foot">
        <span className="asmFootNote">
          The house has risen. Play returns to {PLAYER_NAMES[session.resumePlayer]}.
        </span>
        <button className="amap" onClick={() => moves.assemblyClose()} type="button">
          Rise &amp; return to the map
        </button>
      </div>
    );
  }

  if (session.phase === "proposal") {
    if (session.proposalDone[viewerId]) {
      return (
        <div className="asm-foot">
          <span className="asmFootNote label">
            You have spoken · {session.voteOrder.filter((id) => !session.proposalDone[id]).length}{" "}
            still to decide
          </span>
        </div>
      );
    }

    return (
      <div className="asm-foot">
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
      </div>
    );
  }

  // Voting — yea/nay/veto are under the card; only Bribe remains here.
  const yourVote = session.voteOrder[session.voteIndex] === viewerId;
  const canBribe =
    yourVote && session.bribesUsed[viewerId] < rules.briberyCap && influence >= rules.briberyCost;

  return (
    <div className="asm-foot">
      <Verb
        armed={canBribe}
        blockedReason={
          !yourVote
            ? "Wait until your turn to cast."
            : session.bribesUsed[viewerId] >= rules.briberyCap
              ? `The limit is ${rules.briberyCap} bribes per Assembly.`
              : influence < rules.briberyCost
                ? `Requires ${rules.briberyCost} influence.`
                : undefined
        }
        cost={`+1 · ${rules.briberyCost} influence · ${session.bribesUsed[viewerId]}/${rules.briberyCap}`}
        effectiveCost={{ influence: rules.briberyCost }}
        explanation={`Buy one extra vote before casting, up to ${rules.briberyCap} per Assembly.`}
        icon={<BribeIcon />}
        label="Bribe"
        onClick={() => moves.assemblyBribe(viewerId)}
      />
      <span className="asmFootNote asmFootHint">
        {yourVote
          ? "Cast your vote under the card above."
          : `${PLAYER_NAMES[session.voteOrder[session.voteIndex]]} is casting.`}
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
      className={`av${armed ? " armed" : " off"}`}
      effectiveCost={effectiveCost}
      enabled={armed}
      explanation={explanation}
      heading={label}
      onClick={onClick}
      triggerClassName="assemblyFootActionTrigger"
    >
      <span className="ad">{icon}</span>
      <span className="atx">
        <span className="al">{label}</span>
        <span className="ac">{cost}</span>
      </span>
    </AssemblyAction>
  );
}
