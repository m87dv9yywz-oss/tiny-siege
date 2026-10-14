"""Derive runtime PNGs without cropping, re-registering or altering approved masters.
Requires Pillow; not needed to play or build the checked-in exports.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json

source = Path('artwork/towers/archer/states')
target = Path('public/assets/v5/towers/archer')
entries = {}
for path in sorted(source.glob('*.png')):
    image = Image.open(path)
    assert image.mode == 'RGBA' and image.size == (1254, 1254)
    assert image.getchannel('A').getextrema() == (0, 255)
    entry = {'masterSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'exports': {}}
    for folder, size in [('card_512', 512), ('battlefield_256', 256)]:
        output = target / folder / path.name
        output.parent.mkdir(parents=True, exist_ok=True)
        # Pillow resizes RGBA in premultiplied-alpha space: no white edge matte.
        image.resize((size, size), Image.Resampling.LANCZOS).save(output, optimize=True)
        entry['exports'][folder] = {'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
    entries[path.stem.removeprefix('archer_')] = entry
assert len(entries) == 16
(target / 'manifest.json').write_text(json.dumps({'masterSize':1254, 'origin':[0.5,0.96], 'displaySize':80, 'states':entries}, indent=2) + '\n')
print(json.dumps({folder: sum(e['exports'][folder]['bytes'] for e in entries.values()) for folder in ['card_512','battlefield_256']}))
