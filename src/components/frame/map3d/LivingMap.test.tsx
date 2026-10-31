import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LivingMap from "./LivingMap";
import { PLATE_DEFAULTS } from "./plates";
import { getLuxuryGood } from "../../../game/content";
import { createInitialState } from "../../../game/state";
import { selectLuxuryVertices } from "../../../game/mapTopology";
import type { HegemonyState } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";

/**
 * The slice-1 exit gate for the moorings (docs/plans/luxury-goods.md): the rendered map
 * carries a mooring at every selected vertex, addressable by its canonical vertex id,
 * with an accessible name that identifies both adjacent tiles. The scene needs a GPU and
 * starts after the first render; the moorings over it are plain HTML, rendered here.
 */

describe("luxury moorings on the rendered map", () => {
  const G = createInitialState(42);
  const selected = selectLuxuryVertices(G.board.tiles, {
    count: G.ruleset.economy.luxury.coastalGoods,
    random: G.ruleset.economy.luxury.randomPlacement,
    seed: G.seed,
  });
  const render = (state: HegemonyState) =>
    renderToStaticMarkup(
      <LivingMap
        G={state}
        mode="terrain"
        onTileAction={() => undefined}
        plates={PLATE_DEFAULTS}
        selectedTileId={null}
      />,
    );

  it("draws one mooring per selected vertex, addressed by canonical id", () => {
    const markup = render(G);

    expect(selected).toHaveLength(7);
    for (const vertex of selected) {
      expect(markup).toContain(`data-vertex-id="${vertex.id}"`);
    }
  });

  it("names the good, both adjacent tiles, and who holds it", () => {
    const [asset] = G.board.luxuries;
    const [tileA, tileB] = selected.find((vertex) => vertex.id === asset.vertexId)!.tileIds;
    const good = getLuxuryGood(G.definition.content, asset.goodId)!.name;

    expect(render(G)).toContain(
      `aria-label="${good} between tiles ${tileA} and ${tileB}, unclaimed"`,
    );

    const held = structuredClone(G);
    held.board.luxuries[0].owner = "0";
    expect(render(held)).toContain(
      `aria-label="${good} between tiles ${tileA} and ${tileB}, held by ${PLAYER_GLAZES["0"].name}"`,
    );
  });
});
