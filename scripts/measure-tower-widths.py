#!/usr/bin/env python3
"""Measure each tower state's alpha-bbox WIDTH fraction and write
src/data/towerWidths.json.

Why: tower artwork is reframed to fit complete auras inside a square
frame, so slim states (tall clouds, vortexes) render with a much
smaller body than squat states at the same display size. The game
normalizes per-state display size from these fractions
(towerSizeFactor in src/data/towers.js).

Rerun after any tower art changes:
    python3 scripts/measure-tower-widths.py
Requires Pillow (pip install pillow). Keys are
"tower_<type>_<state>" / "tower_<type>_ascended", matching the PNG
stems under public/assets/v5/towers/*/battlefield_256/.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "assets" / "v5" / "towers"
OUT = ROOT / "src" / "data" / "towerWidths.json"


def state_image(png: Path) -> Image.Image:
    """The full tower for a state: layered states (tower-turning proof)
    ship as <state>_base.png + <state>_top.png splits, so composite the
    pair; the layers themselves are not states and are skipped."""
    stem = png.stem
    if stem.endswith(("_base", "_top", "_top_raised", "_top_down")):
        return None
    base = png.with_name(f"{stem}_base.png")
    if base.exists():
        merged = Image.open(base).convert("RGBA")
        merged.alpha_composite(Image.open(png.with_name(f"{stem}_top.png")).convert("RGBA"))
        return merged
    return Image.open(png)


def main() -> None:
    widths = {}
    for png in sorted(ART.glob("*/battlefield_256/*.png")):
        im = state_image(png)
        if im is None:
            continue
        with im:
            alpha = im.convert("RGBA").getchannel("A")
            bbox = alpha.getbbox()
            if bbox is None:
                raise SystemExit(f"fully transparent artwork: {png}")
            widths[f"tower_{png.stem}"] = round(
                (bbox[2] - bbox[0]) / im.width, 4
            )
    OUT.write_text(json.dumps(widths, indent=1, sort_keys=True) + "\n")
    values = sorted(widths.values())
    print(
        f"wrote {len(widths)} states to {OUT.relative_to(ROOT)} "
        f"(min {values[0]}, median {values[len(values) // 2]}, max {values[-1]})"
    )


if __name__ == "__main__":
    main()
