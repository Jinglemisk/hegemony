import { expect, it } from "vitest";
import { RESOLUTION_CARDS, RESOLUTION_DECKS } from "./deck";
it("uses Appendix B's 16 Laws and 6 Directives and retires the old roster", () => {
  expect(RESOLUTION_CARDS.filter((c) => c.kind === "law")).toHaveLength(16);
  expect(RESOLUTION_CARDS.filter((c) => c.kind === "directive")).toHaveLength(6);
  expect(Object.values(RESOLUTION_DECKS).map((d) => d.length)).toEqual([6, 5, 5, 6]);
  expect(new Set(RESOLUTION_CARDS.map((c) => c.id)).size).toBe(22);
  expect(
    RESOLUTION_CARDS.some((c) =>
      ["bread-and-circuses", "cult-of-demeter", "grain-dole", "enfranchise-the-colonies"].includes(
        c.id,
      ),
    ),
  ).toBe(false);
});
