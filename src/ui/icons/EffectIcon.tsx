import { effectGlyph, type EffectIconTarget } from "../iconRegistry";
import { Icon, type IconSize } from "./Icon";

/**
 * The glyph for a typed effect, whatever vocabulary it came from.
 *
 * Callers hand over the effect they already have rather than looking a glyph up
 * themselves — that keeps `iconRegistry` the single place meaning is assigned,
 * and means each discriminated union is narrowed exactly once in the frontend.
 *
 *     <EffectIcon family="law" effect={effect} /> +2 per city
 *
 * The icon carries identity; the signed coloured numeral beside it carries
 * judgment; the sentence lives in the tooltip. Never let the icon do the second
 * job — an effect's glyph must be the same whether it helps you or ruins you.
 */
export function EffectIcon({
  size = "inline",
  className,
  ...target
}: EffectIconTarget & { size?: IconSize; className?: string }) {
  return <Icon glyph={effectGlyph(target)} size={size} className={className} />;
}
