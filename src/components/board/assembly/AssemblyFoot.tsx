import type { ReactNode } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import { activeLawIds, getResolutionCard } from "../../../game/assembly";
import type { AssemblySession } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { BribeIcon, PassIcon, RepealIcon, VetoIcon } from "./AssemblyIcons";

export type AssemblyMenu = "repeal" | null;

/**
 * The action dock — one tight row that WRAPS rather than clips when the sea gap
 * narrows, so the verbs survive a laptop viewport without a scrollbar.
 *
 * Drawing moved up onto the politician columns and propose/discard onto the bema
 * (that is where the drawn card is), so the dock now carries only the cross-cutting
 * verbs: Repeal and Pass while proposing, Bribe / Veto / cast while voting.
 *
 * Gating differs by phase. Proposal is asynchronous, so a verb is live when the
 * VIEWER has not yet finalized (`proposalDone`), never mind whose turn the engine
 * thinks it is. Voting is sequential, so it gates on `isActive`.
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
  const { moves, viewerId, isActive } = useGameUi();
  const rules = G.ruleset.assembly;
  const influence = G.players[viewerId].resources.influence;
  const held = Boolean(session.held[viewerId]);
  const voting = session.phase === "voting";
  const yourVote = voting && session.voteOrder[session.voteIndex] === viewerId;
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
    return (
      <div className="asm-foot">
        {session.proposalDone[viewerId] ? (
          <span className="asmFootNote">
            You have spoken. Waiting for {session.voteOrder.filter((id) => !session.proposalDone[id]).length} more to
            decide — switch seats top-right to play them.
          </span>
        ) : (
          <>
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

            <span className="asmFootNote asmFootHint">Draw from a politician above, or hold your peace.</span>
          </>
        )}
      </div>
    );
  }

  // Voting.
  const canBribe = yourVote && session.bribesUsed[viewerId] < rules.briberyCap && influence >= rules.briberyCost;
  const canVeto = yourVote && session.vetoUsed[viewerId] < rules.vetoesPerAssembly && influence >= rules.vetoCost;

  return (
    <div className="asm-foot">
      <Verb
        armed={canBribe}
        cost={`+1 · ${rules.briberyCost} influence · ${session.bribesUsed[viewerId]}/${rules.briberyCap}`}
        icon={<BribeIcon />}
        label="Bribe"
        onClick={() => moves.assemblyBribe(viewerId)}
        title={`Buy one extra vote for ${rules.briberyCost} influence, up to ${rules.briberyCap} per assembly. The cap is what stops a hoard from simply buying the outcome.`}
      />

      <Verb
        armed={canVeto}
        cost={`${rules.vetoCost} influence · once`}
        icon={<VetoIcon />}
        label="Veto"
        onClick={() => moves.assemblyVeto(viewerId)}
        title="Strike the resolution under vote outright. It costs your own vote on it — a veto is a walkout, not a free lever."
      />

      {yourVote ? (
        <div className="adraw asmCast">
          <div>
            <div className="dk">Your vote</div>
            <div className="dn">{castLabel(G, session, viewerId)}</div>
          </div>
          <div className="db">
            <button className="mb yea" onClick={() => moves.assemblyVote(viewerId, true)} type="button">
              Yea
            </button>
            <button className="mb nay" onClick={() => moves.assemblyVote(viewerId, false)} type="button">
              Nay
            </button>
          </div>
        </div>
      ) : (
        <span className="asmFootNote asmFootHint">
          {isActive ? "Waiting…" : `${PLAYER_NAMES[session.voteOrder[session.voteIndex]]} is casting.`}
        </span>
      )}
    </div>
  );
}

/** "3 votes" / "1 vote" / "cast" — a voteless seat still gets a legible "0 votes"
 *  rather than an empty widget, because being voteless is itself information. */
function castLabel(G: HegemonyState, session: AssemblySession, playerID: "0" | "1" | "2" | "3"): string {
  if (session.votes.some((vote) => vote.playerID === playerID)) {
    return "cast";
  }

  const base = session.equalVotes ? 1 : countCitizens(G, playerID);
  const votes = base + session.bribesUsed[playerID];
  return `${votes} vote${votes === 1 ? "" : "s"}`;
}

function countCitizens(G: HegemonyState, playerID: "0" | "1" | "2" | "3"): number {
  let citizens = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = G.board.tiles
      .find((tile) => tile.id === tileId)
      ?.settlements.find((candidate) => candidate.owner === playerID);

    if (settlement) {
      citizens += settlement.pops.citizens;
    }
  }

  return citizens;
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
