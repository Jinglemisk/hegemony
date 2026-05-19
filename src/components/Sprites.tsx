import type { BuildingId, PopType, Resource, SettlementKind, Terrain } from "../game/types";

type IconAtlasKey = Resource | PopType | BuildingId | SettlementKind;
type UiAtlasKey =
  | "seal"
  | "primaryButton"
  | "secondaryButton"
  | "resourcePill"
  | "hexHalo"
  | "playerToken"
  | "meander"
  | "voteToken"
  | "seasonMarker";

const ICON_SPRITE_CLASSES: Record<IconAtlasKey, string> = {
  wood: "sprite-wood",
  stone: "sprite-stone",
  gold: "sprite-gold",
  food: "sprite-food",
  influence: "sprite-influence",
  unrest: "sprite-unrest",
  citizens: "sprite-citizens",
  freemen: "sprite-freemen",
  slaves: "sprite-slaves",
  marketplace: "sprite-marketplace",
  temple: "sprite-temple",
  workshop: "sprite-workshop",
  granary: "sprite-granary",
  capital: "sprite-capital",
  city: "sprite-city",
  colony: "sprite-colony"
};

const TERRAIN_SPRITE_CLASSES: Record<Terrain, string> = {
  mountain: "sprite-terrain-mountain",
  hill: "sprite-terrain-hill",
  forest: "sprite-terrain-forest",
  plains: "sprite-terrain-plains"
};

const UI_SPRITE_CLASSES: Record<UiAtlasKey, string> = {
  seal: "sprite-ui-seal",
  primaryButton: "sprite-ui-primary",
  secondaryButton: "sprite-ui-secondary",
  resourcePill: "sprite-ui-resource-pill",
  hexHalo: "sprite-ui-hex-halo",
  playerToken: "sprite-ui-player-token",
  meander: "sprite-ui-meander",
  voteToken: "sprite-ui-vote-token",
  seasonMarker: "sprite-ui-season-marker"
};

export function AtlasIcon({ icon, className = "" }: { icon: IconAtlasKey; className?: string }) {
  return <span aria-hidden="true" className={`atlasSprite atlasIcon ${ICON_SPRITE_CLASSES[icon]} ${className}`} />;
}

export function TerrainSprite({ terrain, className = "" }: { terrain: Terrain; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`atlasSprite atlasTerrain terrainTint-${terrain} ${TERRAIN_SPRITE_CLASSES[terrain]} ${className}`}
    />
  );
}

export function UiSprite({ item, className = "" }: { item: UiAtlasKey; className?: string }) {
  return <span aria-hidden="true" className={`atlasSprite atlasUi ${UI_SPRITE_CLASSES[item]} ${className}`} />;
}
