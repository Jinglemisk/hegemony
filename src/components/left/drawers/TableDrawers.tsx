import { PLAYER_IDS } from "../../../game/data";
import {
  getNationalIdeas,
  getTakeIdeaStatus,
  ideaHolders,
  ideaTakesPop,
} from "../../../game/ideas";
import type { NationalIdeaDefinition } from "../../../game/ideaTypes";
import { enumerateLegalOptions } from "../../../game/legalMoves";
import {
  currentVoteWeight,
  getResolutionCard,
  nextAssemblyYear,
  politicianStandings,
  victoryStandings,
  victoryThreats,
} from "../../../game/rules";
import type { VictoryCardStanding } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { formatNumber, numberWord, yearLabel } from "../../../ui/formatters";
import { turnsUntilYear } from "../../../ui/frameSelectors";
import { IDEA_RASTERS } from "../../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { useGameUi } from "../../board/GameUiContext";
import { Band } from "../../chrome/Panel";
import { SeatCoin } from "../../chrome/SeatCoin";
import { useConfirm } from "../../chrome/confirmContext";
import { Chips, Ico, Tip, TipBody, Turns } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { Tile } from "../atoms";
import { SpendDetail } from "../../chrome/confirmDetail";
import { refusal, usePoint } from "../words";
import type { DrawerProps } from "../Drawer";
import { Threat } from "./RealmDrawer";

/**
 * Ideas: the draft's cards as tiles, the free ones first, then yours, then the
 * taken ones with their holder's coin. A free one is bought here through the
 * confirm bar; an Idea that also asks for a settler goes to the full purchase sheet.
 */
export function IdeasDrawer({ actions }: DrawerProps) {
  const { G, viewerId, moves, turnBlocked } = useGameUi();
  const ask = useConfirm();
  const ideas = getNationalIdeas(G);
  const holders = ideaHolders(G);
  const store = G.players[viewerId].resources;
  const legal = new Set(
    enumerateLegalOptions(G, viewerId).flatMap(({ command }) =>
      command.type === "buyIdea" ? [command.ideaId] : [],
    ),
  );
  const { purchases } = G.ruleset.ideas;
  const free = ideas.filter((idea) => !holders.has(idea.id));
  const yours = ideas.filter((idea) => holders.get(idea.id)?.playerID === viewerId);
  const taken = ideas.filter((idea) => {
    const holder = holders.get(idea.id);
    return holder && holder.playerID !== viewerId;
  });

  const buy = (idea: NationalIdeaDefinition) => {
    if (ideaTakesPop(idea)) return actions.onIdeasModal(idea.id);
    const status = getTakeIdeaStatus(G, viewerId, idea.id);
    ask({
      icon: "assembly/national-idea",
      question: `Are you sure you want to take ${idea.name} as your next Idea?`,
      detail: (
        <SpendDetail
          command={{ type: "buyIdea", ideaId: idea.id }}
          cost={status.cost}
          G={G}
          note={idea.text}
          viewerId={viewerId}
        />
      ),
      verb: "Take the Idea",
      onYes: () => moves.buyIdea(idea.id),
    });
  };

  const tile = (idea: NationalIdeaDefinition) => {
    const holder = holders.get(idea.id);
    const status = getTakeIdeaStatus(G, viewerId, idea.id);
    const open = !holder && legal.has(idea.id) && turnBlocked === null;
    const why = holder ? null : open ? null : refusal(status, turnBlocked, store);
    const state = holder
      ? holder.playerID === viewerId
        ? "Yours"
        : `Taken by ${PLAYER_GLAZES[holder.playerID].name}`
      : open
        ? `Free: take it for ${formatNumber(status.cost.influence ?? 0)} influence`
        : (why ?? "Free");
    return (
      <Tile
        ariaLabel={`${idea.name}. ${sentence(state)}`}
        className={`is-idea${holder ? (holder.playerID === viewerId ? " is-yours" : " is-taken") : ""}`}
        disabled={!open}
        icon={IDEA_RASTERS[idea.id]}
        key={idea.id}
        label={idea.name}
        onClick={holder ? undefined : () => buy(idea)}
        tip={{ key: `i-${idea.id}`, title: idea.name, line: `${idea.text} ${sentence(state)}` }}
      >
        {holder ? (
          <SeatCoin className="lw-tile-coin" seat={holder.playerID} size={20} />
        ) : (
          <Chips amounts={status.cost} short={!open} />
        )}
      </Tile>
    );
  };

  return (
    <>
      <Band
        end={purchases === 1 ? "one, once a game" : `${purchases} a game`}
        label={`Free · ${free.length}`}
      />
      {free.length ? (
        <div className="lw-tiles">{free.map(tile)}</div>
      ) : (
        <p className="lw-none">Every Idea is held.</p>
      )}
      <Band end={yours.length + taken.length} label="Taken" />
      <div className="lw-tiles">{[...yours, ...taken].map(tile)}</div>
    </>
  );
}

/** A line ended by one full stop, whether or not the engine's reason brought its own. */
const sentence = (line: string) => `${line.replace(/\.+$/, "")}.`;

/** Agora: the next sitting, the standing Laws as stelae, the orators by seat. */
export function AgoraDrawer() {
  const { G, viewerId } = useGameUi();
  const nextYear = nextAssemblyYear(G);
  const laws = G.activeLaws.slice().sort((left, right) => left.order - right.order);
  const cap = G.ruleset.assembly.lawCap;
  const votes = currentVoteWeight(G, viewerId);
  const next = usePoint({
    key: "next",
    title: "The Assembly",
    line: "Laws stand until repealed; each sitting may add or break one.",
  });

  return (
    <>
      <div {...next.on} className={`lw-next${next.lit ? " is-lit" : ""}`}>
        <Ico path="assembly/agora" size="tile" />
        <span className="lw-next-when">
          {G.assembly ? (
            <b>Sitting now</b>
          ) : nextYear === null ? (
            <b>No sitting left</b>
          ) : (
            <>
              <b>
                <Turns n={turnsUntilYear(G, viewerId, nextYear)} />
              </b>
              <span className="lw-tile-k">to the next sitting</span>
            </>
          )}
        </span>
        <span className="lw-next-votes">
          <Ico path="assembly/vote" size="ui" />
          <b className="lw-tile-v">{votes}</b>
          <span className="lw-tile-k">votes</span>
        </span>
      </div>
      <Band end={`${laws.length} of ${cap}`} label="Standing laws" />
      <div
        className="lw-stelae"
        style={{ gridTemplateColumns: `repeat(${Math.max(cap, 1)}, 1fr)` }}
      >
        {Array.from({ length: cap }, (_, i) => {
          const law = laws[i];
          const card = law ? getResolutionCard(G.definition.content, law.cardId) : null;
          if (!law || !card)
            return (
              <Tile
                className="is-stele is-empty"
                icon="assembly/stele"
                key={`empty-${i}`}
                label="Empty"
                tip={{
                  key: `s-${i}`,
                  title: "An empty stele",
                  line: "A Law the Assembly passes stands here.",
                }}
              />
            );
          return (
            <Tile
              className="is-stele"
              icon="assembly/stele"
              key={`${law.cardId}-${law.order}`}
              label={card.name}
              tip={{
                key: `s-${i}`,
                title: card.name,
                line: `${card.text} Carried by ${G.players[law.author].name}, ${yearLabel(law.enactedYear)}.`,
              }}
            >
              <SeatCoin className="lw-tile-coin" seat={law.author} size={20} />
            </Tile>
          );
        })}
      </div>
      <Band label="Orators" end="stelae under each" />
      <SeatTable
        caption="Orators: the stelae each seat has authored under each"
        rows={politicianStandings(G).map((standing) => ({
          key: standing.politician.id,
          icon: "assembly/politician",
          name: standing.politician.name,
          line: `${standing.politician.creed} ${standing.patron ? `Patron: ${G.players[standing.patron].name}.` : "No patron."}`,
          values: PLAYER_IDS.map((id) => ({
            id,
            value: standing.authored[id],
            held: id === standing.patron,
          })),
        }))}
      />
    </>
  );
}

/** A grid of rows by seat: a coin heads each seat's column, a held cell is marked.
 *  `caption` names the table for a screen reader; each row is named by its first cell. */
function SeatTable({
  caption,
  rows,
}: {
  caption: string;
  rows: ReadonlyArray<{
    key: string;
    icon: string;
    name: string;
    line: string;
    values: ReadonlyArray<{ id: PlayerId; value: string | number; held: boolean }>;
  }>;
}) {
  return (
    <table className="lw-table">
      <caption className="visuallyHidden">{caption}</caption>
      <thead>
        <tr>
          <th>
            <span className="visuallyHidden">Name</span>
          </th>
          {PLAYER_IDS.map((id) => (
            <th key={id} scope="col">
              <SeatCoin seat={id} size={24} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <TableRow key={row.key} row={row} />
        ))}
      </tbody>
    </table>
  );
}

function TableRow({
  row,
}: {
  row: {
    key: string;
    icon: string;
    name: string;
    line: string;
    values: ReadonlyArray<{ id: PlayerId; value: string | number; held: boolean }>;
  };
}) {
  const { lit, on } = usePoint({ key: `r-${row.key}`, title: row.name, line: row.line });
  return (
    <tr {...on} aria-label={row.name} className={lit ? "is-lit" : undefined} tabIndex={0}>
      {/* A long name ellipsizes; pointing at the row writes it whole in the foot line. */}
      <th data-truncates="summary" scope="row">
        <Ico path={row.icon} size="ui" />
        {row.name}
      </th>
      {row.values.map(({ id, value, held }) => (
        <td
          aria-label={`${PLAYER_GLAZES[id].name} ${value}${held ? ", held" : ""}`}
          data-held={held || undefined}
          key={id}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}

const standingLine = (G: HegemonyState, { holder, leader, minimum }: VictoryCardStanding) =>
  holder
    ? `Held by ${G.players[holder].name}.`
    : leader
      ? `${G.players[leader].name} leads, short of ${formatNumber(minimum)}.`
      : "Tied: no one holds it.";

/** Victory: the threat first, then the titles as cards, each seat's count on each and
 *  the holder's glaze framing the one it holds. */
export function VictoryDrawer() {
  const { G, viewerId } = useGameUi();
  const standings = victoryStandings(G);
  const toWin = G.ruleset.victory.cardsToWin;
  const held = standings.filter((standing) => standing.holder === viewerId).length;

  return (
    <>
      {victoryThreats(G).map((threat) => (
        <Threat
          end={`You ${held}/${toWin}`}
          key={threat.seat}
          seat={threat.seat}
          titles={threat.titles.map((t) => t.card)}
        />
      ))}
      <Band end={`${numberWord(toWin)} win`} label={`The ${numberWord(standings.length)} titles`} />
      <ol aria-label="The titles" className="vc-list">
        {standings.map((standing) => (
          <TitleCard key={standing.card.id} standing={standing} />
        ))}
      </ol>
    </>
  );
}

/** One title as a card: its name, its rule, and every seat's count; held, it takes the
 *  holder's glaze as its frame and the holder's count stands in a pill of it. */
function TitleCard({ standing }: { standing: VictoryCardStanding }) {
  const { G } = useGameUi();
  const { card, holder, minimum, values } = standing;
  const rule = `${card.description}, at least ${formatNumber(minimum)}.`;
  const line = `${rule} ${standingLine(G, standing)}`;
  const { lit, on } = usePoint({ key: `t-${card.id}`, title: card.name, line });
  const nameId = `vc-${card.id}`;
  return (
    <li>
      <Tooltip
        content={
          <Tip title={card.name}>
            <TipBody>{line}</TipBody>
          </Tip>
        }
        triggerAs="div"
        triggerClassName="lw-tip"
      >
        <article
          {...on}
          aria-labelledby={nameId}
          className={`vc-card${lit ? " is-lit" : ""}`}
          data-held={holder ? PLAYER_GLAZES[holder].glaze.toLowerCase() : undefined}
          tabIndex={0}
        >
          <h3 className="vc-name" id={nameId}>
            <Ico path={`victory/${card.id}`} size="ui" />
            {card.name}
          </h3>
          <p className="vc-rule">{rule}</p>
          <ul className="vc-counts">
            {PLAYER_IDS.map((id) => (
              <li className={id === holder ? "is-held" : undefined} key={id}>
                <SeatCoin seat={id} size={22} />
                <b>{formatNumber(values[id])}</b>
                {id === holder ? <span className="visuallyHidden">, holds it</span> : null}
              </li>
            ))}
          </ul>
        </article>
      </Tooltip>
    </li>
  );
}
