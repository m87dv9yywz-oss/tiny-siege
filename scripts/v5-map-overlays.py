"""Compare supplied paintings with exact, unmodified game geometry.
Run from repository root: python scripts/v5-map-overlays.py (Pillow required).
Magenta is nominal path, cyan is the interpolated enemy centerline, red is
an existing obstacle, and the dashed red outer circle is its center clearance.
These are diagnostics, never runtime assets or new placement restrictions.
"""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
js = """
import { MAP, TRAILS, OBSTACLES } from './src/data/map.js';
console.log(JSON.stringify({MAP, OBSTACLES, trails: Object.fromEntries(
 Object.entries(TRAILS).map(([id,t])=>[id,{PATH:t.PATH,PATH_LENGTH:t.PATH_LENGTH}]))}));
"""
data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js]))
out = Path('docs/qa/v5/maps'); out.mkdir(parents=True, exist_ok=True)
(out/'geometry.json').write_text(json.dumps(data, indent=2)+'\n')
contact=Image.new('RGB',(960,1280))
for i, (map_id, trail) in enumerate(data['trails'].items()):
 image = Image.open(f'public/assets/v5/maps/map_{map_id}.png').convert('RGBA').resize((960,640),Image.Resampling.LANCZOS)
 overlay=Image.new('RGBA',image.size); draw=ImageDraw.Draw(overlay)
 points=[(p['x'],p['y']) for p in trail['PATH']]
 draw.line(points, fill=(245,38,161,75), width=data['MAP']['pathWidth'], joint='curve')
 draw.line(points, fill=(0,240,250,240), width=2, joint='curve')
 for o in data['OBSTACLES'].get(map_id,[]):
  x,y,r=o['x'],o['y'],o['r']; draw.ellipse((x-r,y-r,x+r,y+r),outline=(255,70,70,255),width=3)
  r+=data['MAP']['towerRadius']; draw.ellipse((x-r,y-r,x+r,y+r),outline=(255,70,70,150),width=1)
 image=Image.alpha_composite(image,overlay).convert('RGB')
 draw=ImageDraw.Draw(image);draw.rectangle((0,0,490,33),fill='#152b35');draw.text((8,5),f'{map_id}: cyan route | pink path | red obstacle + clearance',fill='white')
 image.save(out/f'{map_id}-geometry-overlay.png',optimize=True)
 contact.paste(image.resize((480,320)),((i%2)*480,(i//2)*320))
contact.save(out/'all-maps-contact.jpg',quality=90)
