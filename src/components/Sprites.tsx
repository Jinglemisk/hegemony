import type { Resource } from "../game/types";
import { RESOURCE_GLYPHS } from "../ui/iconRegistry";
import { Icon } from "../ui/icons/Icon";

/**
 * A resource, drawn the way every other icon in the app is drawn.
 *
 * This used to be a third icon system: five of the six resources were alpha PNGs
 * tinted to a fixed resource hue, and happiness alone was an **untintable**
 * `background-image` with five mood variants — so the ledger could show the
 * unrest alarm's line mask and, forty pixels below it, a full-colour amber
 * *smiling* face labelling a −2 penalty (QA-SHELL-1). It is now the same
 * `<Icon>` the top bar, the dock and the effect rows already use.
 *
 * The mood variants are gone rather than reduced. A glyph names the resource;
 * the signed, toned numeral beside it says whether that is good news — which is
 * the app's rule everywhere else, and the only version of it a colour-blind
 * player can read. The theatre mask still frowns in exactly one place, the
 * unrest alarm, where unhappiness is the subject rather than the verdict.
 */
export function ResourceIcon({
  resource,
  className = "",
}: {
  resource: Resource;
  className?: string;
}) {
  return <Icon glyph={RESOURCE_GLYPHS[resource]} className={className} />;
}
