import { describe, expect, it } from "vitest";
import { positionAnchoredOverlay } from "./anchoring";

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

describe("shared overlay collision geometry", () => {
  it("keeps a below-placed overlay within horizontal viewport margins", () => {
    const position = positionAnchoredOverlay(
      rect(290, 20, 20, 20),
      { width: 180, height: 80 },
      { width: 320, height: 240 },
      { margin: 12, gap: 8 },
    );

    expect(position).toMatchObject({ left: 128, top: 48, placement: "below" });
    expect(position.left + 180).toBeLessThanOrEqual(320 - 12);
    expect(position.arrowLeft).toBeGreaterThanOrEqual(18);
    expect(position.arrowLeft).toBeLessThanOrEqual(180 - 18);
  });

  it("flips above near the bottom and clamps vertically", () => {
    const position = positionAnchoredOverlay(
      rect(100, 205, 30, 20),
      { width: 160, height: 100 },
      { width: 320, height: 240 },
      { margin: 12, gap: 8 },
    );

    expect(position.placement).toBe("above");
    expect(position.top).toBe(97);
    expect(position.top).toBeGreaterThanOrEqual(12);
    expect(position.top + 100).toBeLessThanOrEqual(240 - 12);
  });

  it("pins an oversized overlay to the safe margins", () => {
    const position = positionAnchoredOverlay(
      rect(4, 4, 10, 10),
      { width: 500, height: 400 },
      { width: 320, height: 240 },
    );

    expect(position.left).toBe(12);
    expect(position.top).toBe(12);
  });
});
