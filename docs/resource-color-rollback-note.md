# Resource Color Rollback Note

Created before switching the map terrain treatment to a neutral ceramic scheme.

## Current Resource UI Setup

Resource UI icons are CSS masks generated from Nano Banana source PNGs:

- `assets/resource-icons/wood-mask.png`
- `assets/resource-icons/stone-mask.png`
- `assets/resource-icons/gold-mask.png`
- `assets/resource-icons/food-mask.png`
- `assets/resource-icons/influence-mask.png`
- `assets/resource-icons/unrest-mask.png`

`src/components/ResourceGrid.tsx` renders `ResourceIcon` and applies `resourceCssVars(resource)` to each resource pill.

`src/components/HexMap.tsx` applies `resourceCssVars(tile.resource.type)` to each tile group. Before the neutral terrain change, that means the hex polygon fill/stroke and tile yield plate were resource-tinted.

`src/styles.css` has tooltip layering fixed with:

- `.topbar { position: relative; z-index: 60; }`
- `.workbench { position: relative; z-index: 10; }`
- hovered/focused `.resourcePill` at `z-index: 70`
- `.resourceTooltip` at `z-index: 80`

## Current Resource Colors

From `src/ui/resourceVisuals.ts`:

| Resource | Color | Soft | Line | Shadow |
| --- | --- | --- | --- | --- |
| wood | `#5e6e3a` | `rgb(94 110 58 / 15%)` | `rgb(94 110 58 / 44%)` | `rgb(94 110 58 / 22%)` |
| stone | `#8f8571` | `rgb(143 133 113 / 16%)` | `rgb(143 133 113 / 48%)` | `rgb(143 133 113 / 24%)` |
| gold | `#d98a35` | `rgb(217 138 53 / 15%)` | `rgb(217 138 53 / 46%)` | `rgb(217 138 53 / 24%)` |
| food | `#c0461c` | `rgb(192 70 28 / 14%)` | `rgb(192 70 28 / 42%)` | `rgb(192 70 28 / 22%)` |
| influence | `#1f6977` | `rgb(31 105 119 / 14%)` | `rgb(31 105 119 / 44%)` | `rgb(31 105 119 / 24%)` |
| unrest | `#b13a28` | `rgb(177 58 40 / 14%)` | `rgb(177 58 40 / 46%)` | `rgb(177 58 40 / 24%)` |

## Current Terrain Tint Setup

Before the neutral terrain change, terrain art was colorized in CSS:

```css
.terrainTint-mountain {
  --terrain-tint: linear-gradient(180deg, #7d8582, #d4d1c3);
}

.terrainTint-hill {
  --terrain-tint: linear-gradient(180deg, #8b5a2f, #d09955);
}

.terrainTint-forest {
  --terrain-tint: linear-gradient(180deg, #586f3f, #c6bd70);
}

.terrainTint-plains {
  --terrain-tint: linear-gradient(180deg, #d69c35, #ffd970);
}
```

The hex polygon used resource variables:

```css
.hexTile {
  fill: var(--resource-soft, rgb(24 18 16 / 4%));
  stroke: var(--resource-line, var(--hex-line));
}

.terrain-mountain {
  fill: var(--resource-soft, rgb(143 133 113 / 10%));
}

.terrain-hill {
  fill: var(--resource-soft, rgb(217 138 53 / 8%));
}

.terrain-forest {
  fill: var(--resource-soft, rgb(94 110 58 / 8%));
}

.terrain-plains {
  fill: var(--resource-soft, rgb(192 70 28 / 8%));
}
```

To revert from the neutral terrain experiment, restore the terrain tint classes above and restore `.hexTile` plus `.terrain-*` to the resource-variable fills shown here.
