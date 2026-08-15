import type { BuildingId, PopType, Resource, SettlementKind, Terrain } from "../game/types";
import { RESOURCE_GLYPHS } from "../ui/iconRegistry";
import { Icon } from "../ui/icons/Icon";

export type IconAtlasKey = Resource | PopType | BuildingId | SettlementKind;

const ICON_SPRITE_CLASSES: Record<IconAtlasKey, string> = {
  wood: "sprite-wood",
  stone: "sprite-stone",
  gold: "sprite-gold",
  food: "sprite-food",
  influence: "sprite-influence",
  happiness: "sprite-happiness",
  citizens: "sprite-citizens",
  freemen: "sprite-freemen",
  slaves: "sprite-slaves",
  marketplace: "sprite-marketplace",
  temple: "sprite-temple",
  workshop: "sprite-workshop",
  granary: "sprite-granary",
  // New civic buildings (2026-07-13) + the Phase 2 roster (villa/gymnasion) borrow the
  // nearest atlas art until the sprite sheet gains their own — see docs/archive/notes/OVERNIGHT.md.
  forum: "sprite-marketplace",
  aqueduct: "sprite-granary",
  odeon: "sprite-temple",
  villa: "sprite-granary",
  gymnasion: "sprite-temple",
  capital: "sprite-capital",
  city: "sprite-city",
  colony: "sprite-colony",
};

const TERRAIN_SPRITE_CLASSES: Record<Terrain, string> = {
  mountain: "sprite-terrain-mountain",
  hill: "sprite-terrain-hill",
  forest: "sprite-terrain-forest",
  plains: "sprite-terrain-plains",
  // The oracle has no atlas cell yet; the bare hill art is the nearest read (rock, no
  // yield). The map polygon carries the oracle's real, distinct colour.
  oracle: "sprite-terrain-hill",
};

export function AtlasIcon({ icon, className = "" }: { icon: IconAtlasKey; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`atlasSprite atlasIcon ${ICON_SPRITE_CLASSES[icon]} ${className}`}
    />
  );
}

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

export function TerrainSprite({
  terrain,
  className = "",
}: {
  terrain: Terrain;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`atlasSprite atlasTerrain terrainTint-${terrain} ${TERRAIN_SPRITE_CLASSES[terrain]} ${className}`}
    />
  );
}
