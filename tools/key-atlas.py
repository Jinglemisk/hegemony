#!/usr/bin/env python3
"""Alpha-key the painted sprite atlases into masks.

The atlases are generated as clay-red line art on an opaque, age-stained
parchment square. Dropped into a round disc that square is visible, and no CSS
can crop it out — so we lift the glyph into an alpha channel and let the UI use
the result as a `mask-image` tinted by `currentColor`.

Keying on darkness alone does not work: the parchment's stains are as dark as
the ink (a sampled cell had 21.75% of its pure-parchment margin below the ink
threshold, with one 1018px stain at L=44 against ink at L=36). The ink is dark
AND saturated clay-red; the stains are mid-tone AND desaturated. Neither test
separates them alone — the product does.

Usage:  python3 tools/key-atlas.py
Writes: <name>-keyed.png beside each source. Originals are never modified.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets" / "codex-banana-showcase"

# Sources and their grid size, used only to report per-cell margin leakage.
ATLASES = [("light-ui-kit", 3), ("light-icon-atlas", 4)]

# Luminance ramp: ink sits at L~36 (p95 = 84); stains average L~177.
WHITE, BLACK = 150.0, 80.0
# Saturation gate: ink ~0.87, stains ~0.41.
SAT_LO, SAT_HI = 0.45, 0.68
# A glyph is centred with clear margin; anything keyed out here is a leak.
MARGIN_PX = 40


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def key(rgb: np.ndarray) -> np.ndarray:
    """Glyph alpha in 0..1: dark AND saturated."""
    a = rgb.astype(np.float32)
    luma = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    darkness = np.clip((WHITE - luma) / (WHITE - BLACK), 0.0, 1.0)
    return darkness * smoothstep(SAT_LO, SAT_HI, sat)


def worst_margin_leak(alpha: np.ndarray, grid: int) -> float:
    """Highest share of any cell's margin that survived keying, as a percent."""
    cell = alpha.shape[0] // grid
    worst = 0.0
    for row in range(grid):
        for col in range(grid):
            c = alpha[row * cell : (row + 1) * cell, col * cell : (col + 1) * cell]
            m = MARGIN_PX
            edges = np.concatenate(
                [c[:m, :].ravel(), c[-m:, :].ravel(), c[:, :m].ravel(), c[:, -m:].ravel()]
            )
            worst = max(worst, float((edges > 0.05).mean() * 100))
    return worst


def main() -> None:
    for name, grid in ATLASES:
        src = ASSETS / f"{name}.png"
        rgb = np.asarray(Image.open(src).convert("RGB"))
        alpha = key(rgb)

        # White RGB so the file still composites sanely if used as an image;
        # as a mask only the alpha is read.
        out = np.zeros((*alpha.shape, 4), np.uint8)
        out[..., :3] = 255
        out[..., 3] = (alpha * 255).astype(np.uint8)

        dst = ASSETS / f"{name}-keyed.png"
        Image.fromarray(out, "RGBA").save(dst, optimize=True)
        print(
            f"{name}: coverage={float((alpha > 0.02).mean() * 100):5.2f}%  "
            f"worst-cell margin leak={worst_margin_leak(alpha, grid):.3f}%  -> {dst.name}"
        )


if __name__ == "__main__":
    main()
