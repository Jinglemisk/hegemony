import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HexMap } from "../../HexMap";
import { LuxuryVertexMarker } from "./LuxuryVertexMarker";
import { createInitialState } from "../../../game/state";
import { selectLuxuryVertices } from "../../../game/mapTopology";
import type { LuxuryVertex } from "../../../game/mapTopology";

/**
 * The slice-1 exit gate for the marker (docs/plans/luxury-goods.md): the rendered map
 * carries a fixture at every selected mooring, addressable by its canonical vertex id,
 * with an accessible name that identifies both adjacent tiles — judged here before any
 * ownership behaviour exists.
 */

describe("luxury moorings on the rendered map", () => {
  const G = createInitialState(42);

  it("draws one marker per selected vertex, addressed by canonical id", () => {
    const markup = renderToStaticMarkup(
      <HexMap
        G={G}
        confirmation={null}
        onTileAction={() => undefined}
        pendingTileId={null}
        selectedTileId={null}
      />,
    );
    const expected = selectLuxuryVertices(G.board.tiles, {
      count: G.ruleset.economy.luxury.coastalGoods,
      random: G.ruleset.economy.luxury.randomPlacement,
      seed: G.seed,
    });

    expect(expected).toHaveLength(6);
    for (const vertex of expected) {
      expect(markup).toContain(`data-vertex-id="${vertex.id}"`);
    }
  });

  it("names both adjacent tiles, and takes the future good and owner as presentation", () => {
    const vertex: LuxuryVertex = {
      id: "0,0|1,-1|1,0",
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: -1 },
        { q: 1, r: 0 },
      ],
      tileIds: ["0,0", "1,0"],
      seaCell: { q: 1, r: -1 },
    };

    const neutral = renderToStaticMarkup(<LuxuryVertexMarker vertex={vertex} x={0} y={0} />);
    expect(neutral).toContain('aria-label="Luxury mooring between tiles 0,0 and 1,0"');

    const dressed = renderToStaticMarkup(
      <LuxuryVertexMarker goodName="Tyrian Dye" ownerName="Athens" vertex={vertex} x={0} y={0} />,
    );
    expect(dressed).toContain('aria-label="Tyrian Dye between tiles 0,0 and 1,0, held by Athens"');
  });
});
