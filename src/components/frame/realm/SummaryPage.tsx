import {
  POP_TYPES,
  activeClaims,
  getLuxuryGood,
  ownedClaims,
  settlementCapacity,
  unrestStatus,
} from "../../../game/rules";
import type { PopType, Resources } from "../../../game/types";
import { victoryStandings } from "../../../game/victory";
import { formatNumber, formatPopLabel } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import type { OwnedHolding } from "../../board/types";
import { Chips, Ico } from "../parts";
import { PlaceSeal } from "./PlaceSeal";

const POP_ICON: Record<PopType, string> = {
  citizens: "pops/citizens",
  freemen: "pops/freemen",
  slaves: "pops/slaves",
};

const MOOD: Record<string, string> = {
  calm: "calm",
  discontent: "discontent",
  unrest: "unrest",
  revolt: "revolt",
};

/**
 * The realm at a glance, when the map's empty sea is picked: what it nets a
 * turn, who lives in it, its mood, the laurels it holds, its luxuries, and its
 * places (each opens its page).
 */
export function SummaryPage({
  holdings,
  income,
  onOpen,
}: {
  holdings: OwnedHolding[];
  income: Resources;
  onOpen: (tileId: string) => void;
}) {
  const { G, viewerId } = useGameUi();
  const names = settlementNames(G.board.tiles);
  const people = (pop: PopType) =>
    holdings.reduce((sum, { settlement }) => sum + settlement.pops[pop], 0);
  const capacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementCapacity(settlement, G.ruleset),
    0,
  );
  const mood = unrestStatus(G, viewerId);
  const held = victoryStandings(G).filter((standing) => standing.holder === viewerId);
  const claims = ownedClaims(G, viewerId);
  const active = new Set(activeClaims(G, viewerId).map((asset) => asset.id));

  return (
    <dl className="summary" data-c="summary">
      <dt className="caps">Net / turn</dt>
      <dd>
        <Chips amounts={income} empty={<span className="cap">nothing moves</span>} />
      </dd>
      <dt className="caps">People</dt>
      <dd>
        {POP_TYPES.map((pop) => (
          <span className="meta-i" key={pop} title={formatPopLabel(pop, 2)}>
            <Ico path={POP_ICON[pop]} size="chip" />
            <b className="num">{people(pop)}</b>
          </span>
        ))}
        <span className="cap">of {capacity} room</span>
      </dd>
      <dt className="caps">Mood</dt>
      <dd>
        <span className={`num ${mood.happiness < 0 ? "neg" : "pos"}`}>
          {formatNumber(mood.happiness)}
        </span>
        <span className="cap">
          happiness, {MOOD[mood.tier]}
          {mood.tokens !== 0
            ? ` · ${formatNumber(mood.tokens)} Unrest ${mood.tokens === 1 ? "token" : "tokens"}`
            : ""}
          {mood.luxuryBonus !== 0 ? ` · ${formatNumber(mood.luxuryBonus)} from luxuries` : ""}
          {mood.calmBonus !== 0 ? ` · ${formatNumber(mood.calmBonus)} from calm` : ""}
        </span>
      </dd>
      <dt className="caps">Laurels</dt>
      <dd>
        <Ico path="victory/laurel" size="chip" />
        <b className="num">{held.length}</b>
        <span className="cap">
          of {G.ruleset.victory.cardsToWin}
          {held.length > 0 ? ` · ${held.map((standing) => standing.card.name).join(", ")}` : ""}
        </span>
      </dd>
      <dt className="caps">Luxuries</dt>
      <dd>
        {claims.length === 0 ? (
          <span className="cap">none claimed</span>
        ) : (
          claims.map((asset) => (
            <span className={`cap${active.has(asset.id) ? "" : " is-idle"}`} key={asset.id}>
              {getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId}
            </span>
          ))
        )}
      </dd>
      <dt className="caps">Places</dt>
      <dd>
        {holdings.length === 0 ? <span className="cap">none yet</span> : null}
        {holdings.map(({ tile, settlement }) => (
          <button
            className="place-link"
            key={settlement.id}
            onClick={() => onOpen(tile.id)}
            type="button"
          >
            <PlaceSeal kind={settlement.kind} owner={settlement.owner} />
            {names.get(settlement.id)}
          </button>
        ))}
      </dd>
    </dl>
  );
}
