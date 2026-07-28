import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResourceChips } from "./ResourceChips";

describe("ResourceChips", () => {
  it("includes resource names as text instead of naming a generic span", () => {
    const markup = renderToStaticMarkup(<ResourceChips resources={{ wood: 2 }} variant="cost" />);

    expect(markup).toContain("<strong>2</strong>");
    expect(markup).toContain('class="visuallyHidden"> Wood</span>');
    expect(markup).not.toMatch(/class="resourceChip[^"]*" aria-label=/);
  });

  it("gives zero yields a meaningful text alternative", () => {
    const markup = renderToStaticMarkup(<ResourceChips resources={{}} variant="yield" />);

    expect(markup).toContain("Wood: no change");
    expect(markup).toContain('<strong aria-hidden="true">–</strong>');
  });
});
