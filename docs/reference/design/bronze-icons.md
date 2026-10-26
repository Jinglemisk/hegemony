# Painted bronze icons

The house icon style, chosen by the owner on 2026-10-16 over a black-figure and a mosaic
set. The SVGs live in `assets/icons/bronze/` by family and concept; a bronze icon at the same
path as an old placeholder replaces it (see `placeholder()` in `src/ui/icons/placeholders.ts`).
New icons follow this spec so the set stays one set. Codex drew them from it.

## Spec

- Original hand-drawn silhouettes in bronze, timber, wheat, fired clay, marble, linen, skin and olive leaf.
- Bronze: `#f2d28a / #c49245 / #795025`; gold: `#fff0b0 / #d8b45e / #997035`.
- Wheat: `#f3dda0 / #d8be73 / #a07b38`; timber: `#ecd3a0 / #c19a61 / #8b633b`.
- Clay: `#e5a268 / #c08243 / #8b4d28`; marble: `#fff8e9 / #f7ecd2 / #c9b48c`.
- Linen: `#fff8e9 / #e3d4ad / #aa9572`; skin: `#edc393 / #c38d5e / #895438`; leaf: `#a8b976 / #7d8f51 / #48542c`.
- Outer keyline: vase black `#181210`, 2.5 units; interior incisions: 1.5–2 units; upper-left rim lights: 1.5 units.
- Upper-left light; three-stop material gradients, a broad far-side shade and a deeper lower-right core shadow. Metal and glaze carry crisp specular spots; grain, chisel marks, veins and cloth folds use a few short strokes.
- Grid: `0 0 64 64`; unbadged ink stays inside 4–60; standing subjects sit on y=58. The shallow open book is centred vertically.
- Badged icons (buys, sells, promote, demote, upgrade, cost up and down, propose, repeal, pop gain and loss, income suppressed) all copy buy-food's badge: centre (50,50), r=12, black 3-unit ring; cream plus bars are 5×14 units.
- Plus badge fill: `#7d8f51 / #5e6e3a / #48542c`; minus badges are red with a cream bar; its prescribed ring reaches 63.5, beyond the ordinary live area. The subject shifts toward the upper left.
- At 16 px, broad masses carry identity: round traveller head and wide stride, torch and knuckles, drooping wheat beside an empty bowl, and a pennant above the colony roof. Texture and the wheel/meander stamps recede; all silhouettes exceed 60% coverage in local raster checks.
- No borrowed artwork, embedded raster data, filters, external references, player glazes or Assembly teal.

## Still to draw

- **The seven luxury goods,** one per good, for the map's Trade mode and its key:
  `resources/luxury/tyrian-dye`, `pearls`, `coral`, `glassware`, `incense`, `fine-linen` and
  `silphium`. Each path holds a simple hand-drawn placeholder glyph in
  `assets/icons/placeholder/`; a bronze SVG at `assets/icons/bronze/resources/luxury/<good-id>.svg`
  replaces it with no code change. The map draws them on a disc in the holder's colour, or a
  plain ivory one while the good is unclaimed.
