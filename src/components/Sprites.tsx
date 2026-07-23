import type { BuildingId, PopType, Resource, SettlementKind, Terrain } from "../game/types";

export type IconAtlasKey = Resource | PopType | BuildingId | SettlementKind;
export type UiAtlasKey =
  | "seal"
  | "primaryButton"
  | "secondaryButton"
  | "resourcePill"
  | "hexHalo"
  | "playerToken"
  | "meander"
  | "voteToken"
  | "seasonMarker"
  | "growAction"
  | "moveAction"
  | "endTurn"
  | "eventDeck"
  | "seasonDeck"
  | "resolutionDeck"
  | "victoryPoint";

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
  // nearest atlas art until the sprite sheet gains their own — see docs/OVERNIGHT.md.
  forum: "sprite-marketplace",
  aqueduct: "sprite-granary",
  odeon: "sprite-temple",
  villa: "sprite-granary",
  gymnasion: "sprite-temple",
  capital: "sprite-capital",
  city: "sprite-city",
  colony: "sprite-colony"
};

const TERRAIN_SPRITE_CLASSES: Record<Terrain, string> = {
  mountain: "sprite-terrain-mountain",
  hill: "sprite-terrain-hill",
  forest: "sprite-terrain-forest",
  plains: "sprite-terrain-plains",
  // The oracle has no atlas cell yet; the bare hill art is the nearest read (rock, no
  // yield). The map polygon carries the oracle's real, distinct colour.
  oracle: "sprite-terrain-hill"
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
  seasonMarker: "sprite-ui-season-marker",
  growAction: "sprite-ui-season-marker",
  moveAction: "sprite-ui-meander",
  endTurn: "sprite-ui-primary",
  eventDeck: "sprite-ui-secondary",
  seasonDeck: "sprite-ui-season-marker",
  resolutionDeck: "sprite-ui-vote-token",
  victoryPoint: "sprite-ui-vote-token"
};

const RESOURCE_MASK_CLASSES: Record<Resource, string> = {
  wood: "resourceMask-wood",
  stone: "resourceMask-stone",
  gold: "resourceMask-gold",
  food: "resourceMask-food",
  influence: "resourceMask-influence",
  happiness: "resourceMask-happiness"
};

export function AtlasIcon({ icon, className = "" }: { icon: IconAtlasKey; className?: string }) {
  return <span aria-hidden="true" className={`atlasSprite atlasIcon ${ICON_SPRITE_CLASSES[icon]} ${className}`} />;
}

export function ResourceIcon({
  resource,
  value = 0,
  className = ""
}: {
  resource: Resource;
  value?: number;
  className?: string;
}) {
  if (resource === "happiness") {
    return (
      <span
        aria-hidden="true"
        className={`happinessTheatreIcon ${getHappinessTheatreClass(value)} ${className}`}
      />
    );
  }

  return <span aria-hidden="true" className={`resourceMaskIcon ${RESOURCE_MASK_CLASSES[resource]} ${className}`} />;
}

function getHappinessTheatreClass(value: number) {
  if (value <= -10) {
    return "happinessTheatreIcon-veryAngry";
  }

  if (value < 0) {
    return "happinessTheatreIcon-sad";
  }

  if (value === 0) {
    return "happinessTheatreIcon-neutral";
  }

  if (value >= 10) {
    return "happinessTheatreIcon-veryHappy";
  }

  return "happinessTheatreIcon-happy";
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
