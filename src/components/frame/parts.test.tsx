import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Chips } from "./parts";

describe("Chips", () => {
  it("reads each amount aloud in words, in resource order", () => {
    const markup = renderToStaticMarkup(<Chips amounts={{ food: 1, wood: 4 }} />);

    expect(markup).toContain('<span class="visuallyHidden">4 Wood</span>');
    expect(markup.indexOf("4 Wood")).toBeLessThan(markup.indexOf("1 Food"));
  });

  it("shows what the caller gives for a free action", () => {
    expect(renderToStaticMarkup(<Chips amounts={{}} empty="Free" />)).toBe("Free");
    expect(renderToStaticMarkup(<Chips amounts={{ wood: 0 }} />)).toBe("");
  });
});
