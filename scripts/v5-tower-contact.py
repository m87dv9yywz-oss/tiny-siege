"""Contact sheets from real device-size browser crops, not source artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
root=Path('docs/qa/v5');out=root/'contacts';out.mkdir(exist_ok=True)
states=['0-0-0','1-0-0','0-1-0','0-0-1','1-1-0','1-0-1','0-1-1','2-0-0','0-2-0','0-0-2','2-1-0','2-0-1','1-2-0','0-2-1','1-0-2','0-1-2','3-0-0','0-3-0','0-0-3','3-1-0','3-0-1','1-3-0','0-3-1','1-0-3','0-1-3']
for tower in ['archer','cannon','frost','fire','lightning','grove','wind','rune']:
 sheet=Image.new('RGB',(600,770),'#142f32');draw=ImageDraw.Draw(sheet)
 draw.text((10,8),f'{tower}: 25 real rendered states (2x inspection enlargement)',fill='white')
 for i,state in enumerate(states):
  image=Image.open(root/'rendered/towers'/f'{tower}-{state}.png').convert('RGB')
  image=image.resize((image.width*2,image.height*2),Image.Resampling.LANCZOS)
  x=(i%5)*120;y=30+(i//5)*148;sheet.paste(image,(x,y));draw.text((x+4,y+130),state,fill='white')
 sheet.save(out/f'{tower}-25-states.png',optimize=True)
