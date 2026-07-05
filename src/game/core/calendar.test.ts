import { describe, expect, it } from "vitest";

import { SEASONS, isNewYear, seasonName, yearOf } from "./calendar";

describe("calendar derivation", () => {
  it("maps the season counter onto the four-season cycle, opening on spring", () => {
    expect(seasonName(1)).toBe("spring");
    expect(seasonName(2)).toBe("summer");
    expect(seasonName(3)).toBe("autumn");
    expect(seasonName(4)).toBe("winter");
    // Wraps into the next year.
    expect(seasonName(5)).toBe("spring");
    expect(seasonName(8)).toBe("winter");
  });

  it("derives the year, four seasons per year", () => {
    expect(yearOf(1)).toBe(1);
    expect(yearOf(4)).toBe(1);
    expect(yearOf(5)).toBe(2);
    expect(yearOf(8)).toBe(2);
    expect(yearOf(9)).toBe(3);
  });

  it("flags a new year on each returning spring", () => {
    expect(isNewYear(1)).toBe(true);
    expect(isNewYear(2)).toBe(false);
    expect(isNewYear(5)).toBe(true);
    expect(isNewYear(4)).toBe(false);
  });

  it("keeps season name and cycle length aligned", () => {
    expect(SEASONS).toHaveLength(4);
    for (let index = 1; index <= 16; index += 1) {
      expect(SEASONS).toContain(seasonName(index));
    }
  });
});
