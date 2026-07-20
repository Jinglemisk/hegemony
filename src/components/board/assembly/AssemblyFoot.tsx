import type { ReactNode } from "react";
import { PLAYER_NAMES } from "../../../game/data";
import {
  activeLawIds,
  getResolutionCard,
  isAtLawCap,
  nextDrawCost,
  POLITICIANS,
  POLITICIANS_BY_ID
} from "../../../game/assembly";
import type { AssemblySession, PoliticianId } from "../../../game/assembly";
import type { HegemonyState } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { BribeIcon, DrawIcon, PassIcon, RepealIcon, VetoIcon } from "./AssemblyIcons";

export type AssemblyMenu = "politician" | "repeal" | "replace" | null;

/**
 * The action dock — one tight row that WRAPS rather than clips when the sea gap
 * narrows, so the verbs survive a laptop viewport without a scrollbar.
 *
 * Every verb is either armed or dimmed by the phase, never hidden: a player learning
 * the system should be able to see that Bribe exists while they are proposing, and
 * read from its dimming that it is not a proposal-round lever.
 */
export function AssemblyFoot({
  G,
  session,
  menu,
  onMenu,
  politician,
  onPolitician
}: {
  G: HegemonyState;
  session: AssemblySession;
  menu: AssemblyMenu;
  onMenu: (menu: AssemblyMenu) => void;
  politician: PoliticianId;
  onPolitician: (politician: PoliticianId) => void;
}) {
  const { moves, viewerId, isActive } = useGameUi();
  const rules = G.ruleset.assembly;
  const influence = G.players[viewerId].resources.influence;
  const proposing = session.phase === "proposal";
  const voting = session.phase === "voting";
  const closing = session.phase === "closing";
  const held = session.heldCard;
  const drawCost = nextDrawCost(G);
  const standing = activeLawIds(G);

  const canDraw = isActive && proposing && !held && influence >= drawCost;
  const canRepeal = isActive && proposing && standing.length > 0 && influence >= rules.repealCost;
  const canBribe =
    isActive && voting && session.bribesUsed[viewerId] < rules.briberyCap && influence >= rules.briberyCost;
  const canVeto =
    isActive && voting && session.vetoUsed[viewerId] < rules.vetoesPerAssembly && influence >= rules.vetoCost;

  if (closing) {
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

  return (
    <div className="asm-foot">
      <Verb
        armed={canDraw}
        cost={`${drawCost} influence`}
        icon={<DrawIcon />}
        label="Draw"
        onClick={() => moves.assemblyDraw(politician)}
        title={
          held
            ? "Propose or set aside the card you are holding first."
            : `Pay ${drawCost} influence for one random card from a politician you choose. Each further draw this turn costs ${rules.redrawCost}.`
        }
      />

      {proposing ? (
        <div className="asmSelectWrap">
          <button
            className={`asel${menu === "politician" ? " open" : ""}`}
            disabled={!isActive || Boolean(held)}
            onClick={() => onMenu(menu === "politician" ? null : "politician")}
            type="button"
          >
            {POLITICIANS_BY_ID[politician].name} ▾
          </button>
          {menu === "politician" ? (
            <ul className="asmMenu" role="menu">
              {POLITICIANS.map((candidate) => {
                const remaining =
                  G.politicianDecks[candidate.id].length + G.politicianDiscards[candidate.id].length;

                return (
                  <li key={candidate.id}>
                    <button
                      className={candidate.id === politician ? "on" : undefined}
                      disabled={remaining === 0}
                      onClick={() => {
                        onPolitician(candidate.id);
                        onMenu(null);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <span className="asmMenuName">{candidate.name}</span>
                      <span className="asmMenuMeta">
                        {candidate.epithet} · {remaining} left
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* The held card — secret to every other seat until it is proposed, which is
          what makes fishing a real gamble rather than a shopping trip. */}
      {proposing && held && isActive ? (
        <div className="adraw">
          <div>
            <div className="dk">Your draw · secret</div>
            <div className="dn">{held.card.name}</div>
          </div>
          <div className="db">
            {held.card.kind === "law" && standing.includes(held.card.id) ? (
              <span className="asmBlocked">Already standing</span>
            ) : held.card.kind === "law" && isAtLawCap(G) ? (
              <div className="asmSelectWrap">
                <button className="mb go" onClick={() => onMenu(menu === "replace" ? null : "replace")} type="button">
                  Propose ▾
                </button>
                {menu === "replace" ? (
                  <ul className="asmMenu asmMenuUp" role="menu">
                    <li className="asmMenuHead">The board is full — name the Law to replace</li>
                    {standing.map((cardId) => (
                      <li key={cardId}>
                        <button
                          onClick={() => {
                            moves.assemblyPropose(cardId);
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
            ) : (
              <button className="mb go" onClick={() => moves.assemblyPropose()} type="button">
                Propose
              </button>
            )}
            <button className="mb gh" onClick={() => moves.assemblyDiscardHeld()} type="button">
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {/* Your ballot. The showcase never drew the act of casting — it shows votes
          already landed — so this widget is new, built to mirror the draw widget so
          the two phases feel like the same surface answering a different question. */}
      {voting && isActive ? (
        <div className="adraw asmCast">
          <div>
            <div className="dk">Your vote</div>
            <div className="dn">{castLabel(G, session, viewerId)}</div>
          </div>
          <div className="db">
            <button className="mb yea" onClick={() => moves.assemblyVote(true)} type="button">
              Yea
            </button>
            <button className="mb nay" onClick={() => moves.assemblyVote(false)} type="button">
              Nay
            </button>
          </div>
        </div>
      ) : null}

      <Verb
        armed={canBribe}
        cost={`+1 · ${rules.briberyCost} influence · ${session.bribesUsed[viewerId]}/${rules.briberyCap}`}
        icon={<BribeIcon />}
        label="Bribe"
        onClick={() => moves.assemblyBribe()}
        title={`Buy one extra vote for ${rules.briberyCost} influence, up to ${rules.briberyCap} per assembly. The cap is what stops a hoard from simply buying the outcome.`}
      />

      <Verb
        armed={canVeto}
        cost={`${rules.vetoCost} influence · once`}
        icon={<VetoIcon />}
        label="Veto"
        onClick={() => moves.assemblyVeto()}
        title="Strike the resolution under vote outright. It costs your own vote on it — a veto is a walkout, not a free lever."
      />

      <div className="asmSelectWrap">
        <Verb
          armed={canRepeal}
          cost={`${rules.repealCost} influence`}
          icon={<RepealIcon />}
          label="Repeal"
          onClick={() => onMenu(menu === "repeal" ? null : "repeal")}
          title="Put the removal of a standing Law on the ballot. It is voted like any other card — striking a law is as political as passing one."
        />
        {menu === "repeal" ? (
          <ul className="asmMenu asmMenuUp" role="menu">
            <li className="asmMenuHead">Move to strike a standing Law</li>
            {standing.map((cardId) => (
              <li key={cardId}>
                <button
                  onClick={() => {
                    moves.assemblyProposeRepeal(cardId);
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
        armed={isActive && proposing}
        cost="say nothing"
        icon={<PassIcon />}
        label="Pass"
        onClick={() => moves.assemblyPass()}
        title="Hold your peace and let the next seat speak. Always available — a seat with no influence must still reach the vote."
      />
    </div>
  );
}

/** "3 votes" / "1 vote" / "cast" — a seat with no citizens still gets a legible "0 votes"
 *  rather than an empty widget, because being voteless is itself information. */
function castLabel(G: HegemonyState, session: AssemblySession, playerID: "0" | "1" | "2" | "3"): string {
  if (session.votes.some((vote) => vote.playerID === playerID)) {
    return "cast";
  }

  const votes = votesFor(G, session, playerID);
  return `${votes} vote${votes === 1 ? "" : "s"}`;
}

function votesFor(G: HegemonyState, session: AssemblySession, playerID: "0" | "1" | "2" | "3"): number {
  if (session.equalVotes) {
    return 1;
  }

  let citizens = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = G.board.tiles
      .find((tile) => tile.id === tileId)
      ?.settlements.find((candidate) => candidate.owner === playerID);

    if (settlement) {
      citizens += settlement.pops.citizens;
    }
  }

  return citizens + session.bribesUsed[playerID];
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
    <button
      className={`av${armed ? " armed" : " off"}`}
      disabled={!armed}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span className="ad">{icon}</span>
      <span className="atx">
        <span className="al">{label}</span>
        <span className="ac">{cost}</span>
      </span>
    </button>
  );
}
