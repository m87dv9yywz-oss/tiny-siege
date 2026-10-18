"""Export the ascended tower illustrations to runtime PNGs.

The masters in artwork/ascended/masters/ are the canonical sources
(1560px-ish RGBA, already keyed). They were produced from white-
background generations by edge flood-fill keying: only near-white
regions connected to an image edge became transparent, so enclosed
whites in the art (snow, foam, crystal glints) survived — the same
rule as the tower set's transparency fix. The keying step (kept below
as key_out for provenance) is not needed for ordinary exports.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / "artwork" / "ascended" / "masters"
TOWERS = [
    "archer",
    "cannon",
    "frost",
    "fire",
    "lightning",
    "grove",
    "wind",
    "rune",
    "tidecaller",
]


def key_out(image: Image.Image) -> Image.Image:
    """White-background generation -> RGBA master (see module docstring)."""
    rgb = np.asarray(image.convert("RGB")).astype(np.int16)
    whiteness = rgb.min(axis=2)
    near_white = whiteness > 205
    labels, _ = ndimage.label(near_white)
    edge_ids = set()
    for side in (labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]):
        edge_ids.update(int(v) for v in np.unique(side) if v)
    background = (
        np.isin(labels, list(edge_ids)) if edge_ids else np.zeros_like(near_white)
    )
    alpha = np.full(whiteness.shape, 255, dtype=np.float32)
    soft = np.clip((245 - whiteness) / 45.0, 0, 1)
    alpha[background] = (soft[background] * 255).astype(np.float32)
    out = np.asarray(image.convert("RGB")).astype(np.float32)
    a = (alpha / 255.0)[..., None]
    with np.errstate(invalid="ignore", divide="ignore"):
        un = np.where(a > 0.02, (out - 255 * (1 - a)) / np.maximum(a, 0.02), out)
    rgba = np.dstack([np.clip(un, 0, 255), alpha]).astype(np.uint8)
    master = Image.fromarray(rgba, "RGBA")
    bbox = master.getchannel("A").getbbox()
    master = master.crop(bbox)
    side = max(master.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(master, ((side - master.width) // 2, side - master.height))
    return canvas


def main():
    for tower in sys.argv[1:] or TOWERS:
        master = Image.open(MASTERS / f"{tower}_ascended.png")
        for folder, size in [("card_512", 512), ("battlefield_256", 256)]:
            out = (
                ROOT
                / "public"
                / "assets"
                / "v5"
                / "towers"
                / tower
                / folder
                / f"{tower}_ascended.png"
            )
            out.parent.mkdir(parents=True, exist_ok=True)
            master.resize((size, size), Image.Resampling.LANCZOS).save(
                out, optimize=True
            )
        print(tower, "exported")


if __name__ == "__main__":
    main()
