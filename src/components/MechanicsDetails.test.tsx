import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MechanicsDetails } from "./MechanicsDetails";
import { CodexLinkProvider } from "./codexLink";

describe("MechanicsDetails", () => {
  it("renders every slot without interactive controls", () => {
    const markup = renderToStaticMarkup(
      <CodexLinkProvider value={{ openCodexTo: () => undefined }}>
        <MechanicsDetails
          blockedReason="Requires an open building slot."
          effectiveCost={{ wood: 2, stone: 1 }}
          effects={[{ text: "+2 food income", tone: "positive" }]}
          heading="Granary"
          source="Master Builders"
          duration="Until year end"
        />
      </CodexLinkProvider>,
    );

    expect(markup).toContain("Granary");
    expect(markup).toContain('aria-label="Effects"');
    expect(markup).toContain("+2");
    expect(markup).toContain("Effective cost");
    expect(markup).toContain("Wood");
    expect(markup).toContain("Stone");
    expect(markup).toContain("Source");
    expect(markup).toContain("Master Builders");
    expect(markup).toContain("Duration");
    expect(markup).toContain("Until year end");
    expect(markup).toContain("Blocked");
    expect(markup).toContain("Requires an open building slot.");
    expect(markup).not.toContain('role="button"');
  });
});
