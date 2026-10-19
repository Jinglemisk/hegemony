import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HoldingNetYields } from "./SettlementCard";

describe("HoldingNetYields", () => {
  it("gives zero yields a meaningful text alternative", () => {
    const markup = renderToStaticMarkup(
      <HoldingNetYields resources={{ wood: 0, stone: 0, gold: 0, food: 0, influence: 0 }} />,
    );

    expect(markup).toContain("Wood: no change");
  });
});
