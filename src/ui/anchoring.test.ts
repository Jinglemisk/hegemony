import { describe, expect, it } from "vitest";
import { positionAnchoredOverlay } from "./anchoring";

/** The helper refuses to place an unanchorable overlay; these cases all anchor. */
function place(...args: Parameters<typeof positionAnchoredOverlay>) {
  const position = positionAnchoredOverlay(...args);

  if (!position) {
    throw new Error("expected the overlay to be placed");
  }

  return position;
}

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
    const position = place(
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
    const position = place(
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
    const position = place(
      rect(4, 4, 10, 10),
      { width: 500, height: 400 },
      { width: 320, height: 240 },
    );

    expect(position.left).toBe(12);
    expect(position.top).toBe(12);
  });

  // A `display: contents` trigger measures {0,0,0,0}. Placing against it put the
  // End Turn tooltip in the top-left corner of the screen (QA-DOCK-1), which
  // looked like a layout decision rather than a missing box.
  it("refuses an anchor with no box instead of pinning it to the corner", () => {
    expect(
      positionAnchoredOverlay(
        rect(0, 0, 0, 0),
        { width: 300, height: 63 },
        { width: 1440, height: 900 },
        { preferredPlacement: "above" },
      ),
    ).toBeNull();
  });
});
