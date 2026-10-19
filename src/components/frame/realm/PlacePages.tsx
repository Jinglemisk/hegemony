import {
  getFoundColonyStatus,
  getLuxuryGood,
  settlementPopCapacity,
  tileSlaveColumn,
} from "../../../game/rules";
import { isCoastalTile } from "../../../game/map";
import type { HexTile, LuxuryAsset } from "../../../game/types";
import { RESOURCE_ICON } from "../../../ui/frameFormat";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { Ico, Price } from "../parts";

/** A tile as a place: its settlement's name if it has one, else its ground. */
function placeName(tile: HexTile, names: Map<string, string>) {
  const settlement = tile.settlements[0];
  return settlement ? (names.get(settlement.id) ?? "POLIS") : `the ${tile.terrain}`;
}

/**
 * An unsettled tile: what its ground gives, what it would hold, the goods
 * moored off it, and the act of founding a colony on it.
 */
export function TilePage({ tile, onFound }: { tile: HexTile; onFound: (tileId: string) => void }) {
  const { G, viewerId, phase, isActive } = useGameUi();
  const capacity = settlementPopCapacity("colony", G);
  const column = tileSlaveColumn(G, tile);
  const coastal = isCoastalTile(tile, G.board.tiles);
  const goods = G.board.luxuries.filter((asset) => asset.tileIds.includes(tile.id));
  const found = getFoundColonyStatus(G, viewerId, tile.id);
  const can = found.can && isActive && phase === "gameplay";

  return (
    <>
      <p className="settle-meta caps">
        <span className="meta-i">
          <Ico path={`terrain/${tile.terrain}`} size="chip" />
          {tile.terrain}
        </span>
        <span className="meta-i">unsettled</span>
        <span className="meta-i">{coastal ? "coast" : "inland"}</span>
      </p>
      <ul className="ground">
        <li className="g-line">
          <Ico path="settlements/slot" size="ui" />
          Slots
          <span>
            <b>{tile.slots}</b>
          </span>
        </li>
        <li className="g-line">
          <Ico path={`terrain/${tile.terrain}`} size="ui" />
          Slaves make
          {column.resource ? (
            <span>
              <b>{column.perPop}</b> {column.resource} each
            </span>
          ) : (
            <span>nothing</span>
          )}
        </li>
        <li className="g-line">
          <Ico path="pops/capacity" size="ui" />
          Room
          <span>
            <b>{capacity}</b> pops as a colony
          </span>
        </li>
        <li className="g-line">
          <Ico path="events/voyage" size="ui" />
          Goods
          <span>
            {goods.length > 0
              ? goods
                  .map((asset) => getLuxuryGood(G.definition.content, asset.goodId)?.name)
                  .join(", ")
              : "none moored here"}
          </span>
        </li>
      </ul>
      <div className="act-line">
        <button
          aria-disabled={can ? undefined : true}
          className="act-btn"
          onClick={can ? () => onFound(tile.id) : undefined}
          type="button"
        >
          <Ico path="settlements/found" size="chip" />
          Found a colony here
          {found.cost ? <Price amounts={found.cost} /> : null}
        </button>
        {can ? null : (
          <span className="cap">
            {!isActive ? "not your turn" : (found.reasons[0] ?? "not in this phase")}
          </span>
        )}
      </div>
    </>
  );
}

/** The oracle: sacred ground that nobody may settle. */
export function OraclePage() {
  return (
    <>
      <p className="settle-meta caps">
        <span className="meta-i">
          <Ico path="terrain/oracle" size="chip" />
          oracle
        </span>
        <span className="meta-i">sacred ground</span>
      </p>
      <p className="lore">
        Here the god speaks for every polis and belongs to none. Envoys climb the road with gifts
        and come down with riddles; the wise build their year on the answer.
      </p>
      <p className="lore-rule cap">No one may found, raise or settle on it, by any act or event.</p>
    </>
  );
}

/** A luxury good at its mooring: its lore, what it is worth, who holds it, and where it is won. */
export function LuxuryPage({ asset }: { asset: LuxuryAsset }) {
  const { G } = useGameUi();
  const good = getLuxuryGood(G.definition.content, asset.goodId);
  const names = settlementNames(G.board.tiles);
  const rules = G.ruleset.economy.luxury;
  const holder = asset.owner ? PLAYER_GLAZES[asset.owner] : null;
  const shores = asset.tileIds
    .map((id) => G.board.tiles.find((tile) => tile.id === id))
    .flatMap((tile) => (tile ? [placeName(tile, names)] : []));

  return (
    <>
      <p className="settle-meta caps">
        <span className="meta-i">
          <Ico path="events/voyage" size="chip" />
          luxury good
        </span>
        <span className="meta-i">{holder ? `held by ${holder.name}` : "unclaimed"}</span>
      </p>
      <p className="lore">{good ? `${good.name}: ${good.flavour}.` : "A luxury good."}</p>
      <ul className="ground">
        <li className="g-line is-wide">
          <Ico path={RESOURCE_ICON.happiness} size="ui" />
          Worth
          <span>
            <b>+{rules.happinessPerGood}</b> happiness while active
          </span>
        </li>
        <li className="g-line is-wide">
          <Ico path="events/voyage" size="ui" />
          Won by
          <span>a Port at {shores.join(" or ")}</span>
        </li>
      </ul>
    </>
  );
}
