"""Rasterize the original illustration. Requires free CairoSVG, only for authoring."""
from pathlib import Path
import cairosvg
root = Path(__file__).resolve().parents[1]
source = root / 'public/icons/tiny-siege-source.svg'
for name, size in [('apple-touch-icon',180),('icon-192',192),('icon-512',512),('icon-source-1024',1024),('favicon',32)]:
    cairosvg.svg2png(url=str(source),write_to=str(source.parent / f'{name}.png'),output_width=size,output_height=size)
# Full-bleed artwork has all meaningful features inside the central safe area.
cairosvg.svg2png(url=str(source),write_to=str(source.parent/'maskable-512.png'),output_width=512,output_height=512)
