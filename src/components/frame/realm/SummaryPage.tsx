import { playerNationalIdeas } from "../../../game/ideas";
import { Tooltip } from "../../overlays/Tooltip";
import { Prose } from "../../AnnotatedText";
import { Tip, TipBody, Turns } from "../parts";
import {
  POP_TYPES,
  activeClaims,
  getLuxuryGood,
  ownedClaims,
  realmPops,
  settlementCapacity,
  unrestStatus,
} from "../../../game/rules";
import type { Resources } from "../../../game/types";
import { victoryStandings } from "../../../game/victory";
import { formatNumber, formatPopLabel } from "../../../ui/formatters";
import { sign, tone } from "../../../ui/frameFormat";
import { turnsLeftInYear } from "../../../ui/frameSelectors";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import type { OwnedHolding } from "../../board/types";
import { Chips, Ico } from "../parts";
import { PlaceSeal } from "./PlaceSeal";

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
  // The realm's people, those on the move included: they are still in the realm.
  const people = realmPops(G, viewerId);
  const capacity = holdings.reduce(
    (sum, { settlement }) => sum + settlementCapacity(settlement, G),
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
        <Chips amounts={income} signed empty={<span className="cap">nothing moves</span>} />
      </dd>
      <dt className="caps">People</dt>
      <dd>
        {POP_TYPES.map((pop) => (
          <span className="meta-i" key={pop} title={formatPopLabel(pop, 2)}>
            <Ico path={POP_RASTERS[pop]} size="chip" />
            <b className="num">{people[pop]}</b>
          </span>
        ))}
        <span className="cap">of {capacity} room</span>
      </dd>
      <dt className="caps">Mood</dt>
      <dd>
        <span className={`num ${tone(mood.happiness)}`}>{sign(mood.happiness)}</span>
        <span className="cap">
          <Prose>happiness</Prose>
          {/* The tier names a state, not the Calm act or the Unrest token: plain words. */}
          {`, ${mood.tier}`}
          <Prose>
            {mood.outcome.tokens !== 0
              ? ` · ${formatNumber(mood.outcome.tokens)} Unrest ${mood.outcome.tokens === 1 ? "token" : "tokens"}`
              : ""}
            {mood.luxuryBonus !== 0 ? ` · ${sign(mood.luxuryBonus)} from luxuries` : ""}
            {mood.calmBonus !== 0 ? ` · ${sign(mood.calmBonus)} from calm ` : ""}
          </Prose>
          {mood.calmBonus !== 0 ? <Turns n={turnsLeftInYear(G, viewerId)} /> : null}
        </span>
      </dd>
      <dt className="caps">Laurels</dt>
      <dd>
        <Ico path="victory/laurel" size="chip" />
        <b className="num">{held.length}</b>
        <span className="cap">
          <Prose>
            {`of ${G.ruleset.victory.cardsToWin}`}
            {held.length > 0 ? ` · ${held.map((standing) => standing.card.name).join(", ")}` : ""}
          </Prose>
        </span>
      </dd>
      <dt className="caps">Luxuries</dt>
      <dd>
        {claims.length === 0 ? (
          <span className="cap">none claimed</span>
        ) : (
          claims.map((asset) => (
            <span className={`cap${active.has(asset.id) ? "" : " is-idle"}`} key={asset.id}>
              <Prose>
                {getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId}
              </Prose>
            </span>
          ))
        )}
      </dd>
      <dt className="caps">Ideas</dt>
      <dd className="realm-ideas">
        {playerNationalIdeas(G, viewerId).map((idea) => (
          <Tooltip
            key={idea.id}
            focusable
            ariaLabel={`${idea.name}: ${idea.text}`}
            content={
              <Tip title={idea.name}>
                <TipBody>{idea.text}</TipBody>
              </Tip>
            }
          >
            <span className="cap">
              <Prose links={false}>{idea.name}</Prose>
            </span>
          </Tooltip>
        ))}
        {playerNationalIdeas(G, viewerId).length === 0 ? (
          <span className="cap">none chosen</span>
        ) : null}
      </dd>
      <dt className="caps">Places</dt>
      <dd>
        {holdings.length === 0 ? <span className="cap">none yet</span> : null}
        {holdings.map(({ tile, settlement }) => (
          <button
            className="name place-link"
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
