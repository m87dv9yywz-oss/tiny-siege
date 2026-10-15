"""Inspect approved files without modifying their artwork."""
from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import json, hashlib
root=Path('public/assets/v5'); records=[]; problems=[]
for folder in ['towers','enemies','heroes','maps','ui']:
 for path in sorted((root/folder).rglob('*.png')):
  im=Image.open(path);im.load();alpha=im.getchannel('A') if im.mode=='RGBA' else None
  r={'path':str(path),'bytes':path.stat().st_size,'size':list(im.size),'mode':im.mode,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
  if alpha:
   r['alphaExtrema']=alpha.getextrema();r['bounds']=alpha.getbbox()
  if folder=='towers' and path.parent.name in ['battlefield_256','card_512']:
   expected=256 if path.parent.name=='battlefield_256' else 512
   if im.size!=(expected,expected) or not alpha or alpha.getextrema()[0]!=0 or alpha.getextrema()[1]!=255:problems.append(str(path)+' invalid dimensions/transparency')
   if alpha and any(alpha.getpixel(p)>8 for p in [(0,0),(0,im.height-1),(im.width-1,0),(im.width-1,im.height-1)]):problems.append(str(path)+' nontransparent corner')
  records.append(r)
for tower in sorted((root/'towers').iterdir()):
 if not tower.is_dir():continue
 images=list((tower/'battlefield_256').glob('*.png'))
 if len(images)!=25:problems.append(tower.name+' does not have 25 appearances')
 if len({hashlib.sha256(p.read_bytes()).hexdigest() for p in images})!=25:problems.append(tower.name+' duplicate appearances')
output={'records':records,'problems':problems,'bytesByGroup':{f:sum(r['bytes'] for r in records if r['path'].startswith(str(root/f)+'/')) for f in ['towers','enemies','heroes','maps','ui']}}
Path('docs/qa/v5').mkdir(parents=True,exist_ok=True);Path('docs/qa/v5/asset-audit.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({'files':len(records),'issues':problems,'bytes':output['bytesByGroup']},indent=2))
assert not problems
