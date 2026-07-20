import type { ReactNode } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import { activeLawIds, getResolutionCard } from "../../../game/assembly";
import type { AssemblySession } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { BribeIcon, PassIcon, RepealIcon } from "./AssemblyIcons";

export type AssemblyMenu = "repeal" | null;

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
  onMenu
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
        <span className="asmFootNote">The house has risen. Play returns to {PLAYER_NAMES[session.resumePlayer]}.</span>
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
          <span className="asmFootNote">
            You have spoken. Waiting for {session.voteOrder.filter((id) => !session.proposalDone[id]).length} more to
            decide — switch seats top-right to play them.
          </span>
        </div>
      );
    }

    return (
      <div className="asm-foot">
        <div className="asmSelectWrap">
          <Verb
            armed={standing.length > 0 && influence >= rules.repealCost && !held}
            cost={`${rules.repealCost} influence`}
            icon={<RepealIcon />}
            label="Repeal"
            onClick={() => onMenu(menu === "repeal" ? null : "repeal")}
            title={
              held
                ? "Resolve the card you are holding first."
                : "Put the removal of a standing Law on the ballot — voted like any other card."
            }
          />
          {menu === "repeal" ? (
            <ul className="asmMenu asmMenuUp" role="menu">
              <li className="asmMenuHead">Move to strike a standing Law</li>
              {standing.map((cardId) => (
                <li key={cardId}>
                  <button
                    onClick={() => {
                      moves.assemblyProposeRepeal(viewerId, cardId);
                      onMenu(null);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span className="asmMenuName">{getResolutionCard(cardId)?.name ?? cardId}</span>
                    <span className="asmMenuMeta">{getResolutionCard(cardId)?.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Verb
          armed
          cost="say nothing"
          icon={<PassIcon />}
          label="Pass"
          onClick={() => moves.assemblyPass(viewerId)}
          title="Hold your peace and finalize your turn. The house card alone still goes to the vote."
        />

        <span className="asmFootNote asmFootHint">Draw from a politician above, propose your card, or pass.</span>
      </div>
    );
  }

  // Voting — yea/nay/veto are under the card; only Bribe remains here.
  const yourVote = session.voteOrder[session.voteIndex] === viewerId;
  const canBribe = yourVote && session.bribesUsed[viewerId] < rules.briberyCap && influence >= rules.briberyCost;

  return (
    <div className="asm-foot">
      <Verb
        armed={canBribe}
        cost={`+1 · ${rules.briberyCost} influence · ${session.bribesUsed[viewerId]}/${rules.briberyCap}`}
        icon={<BribeIcon />}
        label="Bribe"
        onClick={() => moves.assemblyBribe(viewerId)}
        title={`Buy one extra vote for ${rules.briberyCost} influence before you cast, up to ${rules.briberyCap} per assembly. The cap is what stops a hoard from simply buying the outcome.`}
      />
      <span className="asmFootNote asmFootHint">
        {yourVote ? "Cast your vote under the card above." : `${PLAYER_NAMES[session.voteOrder[session.voteIndex]]} is casting.`}
      </span>
    </div>
  );
}

function Verb({
  armed,
  cost,
  icon,
  label,
  onClick,
  title
}: {
  armed: boolean;
  cost: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className={`av${armed ? " armed" : " off"}`} disabled={!armed} onClick={onClick} title={title} type="button">
      <span className="ad">{icon}</span>
      <span className="atx">
        <span className="al">{label}</span>
        <span className="ac">{cost}</span>
      </span>
    </button>
  );
}
