import { describe, expect, it } from "vitest";
import { formatNumber, formatSignedNumber, withTrueMinus } from "./formatters";

describe("the shown minus", () => {
  it("is U+2212 in every number, signed or not", () => {
    expect(formatSignedNumber(3)).toBe("+3");
    expect(formatSignedNumber(-2)).toBe("−2");
    expect(formatSignedNumber(0)).toBe("0");
    expect(formatNumber(-1.5)).toBe("−1.5");
  });

  it("replaces the engine's hyphen before a number in its sentences, and only there", () => {
    expect(withTrueMinus("Lose 2 food (-2 Food, -1 Gold).")).toBe(
      "Lose 2 food (−2 Food, −1 Gold).",
    );
    expect(withTrueMinus("-3 happiness")).toBe("−3 happiness");
    expect(withTrueMinus("a well-kept tile-2 and Year-2")).toBe("a well-kept tile-2 and Year-2");
  });
});
