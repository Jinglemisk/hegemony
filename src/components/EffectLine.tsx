import type { EffectPresentation } from "../ui/effects";
import { AnnotatedText } from "./AnnotatedText";

/**
 * Canonical render seam for mechanical effect text. Domain-specific presenters
 * produce the words and tone; every frontend surface gets the same tokenization
 * and semantic tone from this component.
 */
export function EffectLine({
  effect,
  className,
  links = true,
}: {
  effect: EffectPresentation;
  className?: string;
  links?: boolean;
}) {
  return (
    <AnnotatedText
      className={[`effectLine effect-${effect.tone}`, className].filter(Boolean).join(" ")}
      links={links}
      text={effect.text}
    />
  );
}
