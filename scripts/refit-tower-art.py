"""Reframe cut-off tower illustrations with headroom (owner report,
2026-10-18: storm clouds / wind swirls / flame plumes ran off the top
edge of several tower masters).

Pipeline for each regenerated state:
  1. Key the white-background generation (edge flood-fill over
     near-white, soft alpha ramp, white despill — the same rule as the
     tower set's enclosed-white fix and scripts/ascended-art.py).
  2. Compose the keyed content into a fresh 1254x1254 master with the
     framing every healthy state uses: content height ~95% of frame,
     bottom edge at ~97.5%, horizontally centered. The master lands in
     artwork/towers/<type>/states/ alongside the Archer masters.
  3. Export card_512 / battlefield_256 by plain LANCZOS resize (the
     established export rule) and refresh the type's manifest.json.

Usage: refit-tower-art.py <type> <state> [<type> <state> ...]
Reads artwork/refit/raw/<type>_<state>.png for each pair.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "artwork" / "refit" / "raw"
MASTER_SIZE = 1254
CONTENT_HEIGHT = 0.95
BOTTOM_AT = 0.975


def key_content(image: Image.Image) -> Image.Image:
    """White-background generation -> tight-cropped RGBA content."""
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
    if bbox is None:
        raise ValueError("keying produced an empty image")
    return master.crop(bbox)


def compose_master(content: Image.Image) -> Image.Image:
    target_h = round(MASTER_SIZE * CONTENT_HEIGHT)
    scale = target_h / content.height
    target_w = round(content.width * scale)
    if target_w > MASTER_SIZE * 0.99:
        scale = (MASTER_SIZE * 0.99) / content.width
        target_w = round(content.width * scale)
        target_h = round(content.height * scale)
    resized = content.resize((target_w, target_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    x = (MASTER_SIZE - target_w) // 2
    y = round(MASTER_SIZE * BOTTOM_AT) - target_h
    canvas.paste(resized, (x, y), resized)
    return canvas


def export(tower: str, state: str, master: Image.Image) -> None:
    stem = f"{tower}_{state}"
    master_dir = ROOT / "artwork" / "towers" / tower / "states"
    master_dir.mkdir(parents=True, exist_ok=True)
    master_path = master_dir / f"{stem}.png"
    master.save(master_path, optimize=True)
    target = ROOT / "public" / "assets" / "v5" / "towers" / tower
    entry = {
        "masterSha256": hashlib.sha256(master_path.read_bytes()).hexdigest(),
        "exports": {},
    }
    for folder, size in [("card_512", 512), ("battlefield_256", 256)]:
        out = target / folder / f"{stem}.png"
        master.resize((size, size), Image.Resampling.LANCZOS).save(
            out, optimize=True
        )
        entry["exports"][folder] = {
            "bytes": out.stat().st_size,
            "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        }
    manifest_path = target / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["states"][state] = entry
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n")
    print(tower, state, "master + exports + manifest updated")


def main() -> None:
    args = sys.argv[1:]
    if len(args) % 2:
        raise SystemExit("usage: refit-tower-art.py <type> <state> [...]")
    for i in range(0, len(args), 2):
        tower, state = args[i], args[i + 1]
        raw = Image.open(RAW / f"{tower}_{state}.png")
        export(tower, state, compose_master(key_content(raw)))


if __name__ == "__main__":
    main()
