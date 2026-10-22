"""Render precise pixel-center masks from exported JS segments; check Game.canPlace samples.
Requires Pillow + NumPy only to regenerate reference files, never for game builds.
"""
from pathlib import Path
import json, math, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path('docs/artwork/map-art-reference')
data=json.loads((root/'geometry.json').read_text())
manifest={'world':[960,640],'maps':{},'sourceCommit':data['sourceCommit'],'sources':data['sources'],'maskCoordinates':'pixel center: ((column+0.5)/scale, (row+0.5)/scale)'}
for id,m in data['maps'].items():
    entry={'name':m['name'],'files':{},'obstacles':m['obstacles'],'spawn':m['spawn'],'end':m['end'],'routeLength':m['length']}
    for scale in [1,2]:
        w,h=960*scale,640*scale
        xx=np.arange(w,dtype=np.float64)[None,:]/scale+0.5/scale
        yy=np.arange(h,dtype=np.float64)[:,None]/scale+0.5/scale
        blocked=np.zeros((h,w),dtype=bool)
        clearance_radius=data['placement']['pathClearance']
        for seg in m['segments']:
            a,b=seg['a'],seg['b'];dx=b['x']-a['x'];dy=b['y']-a['y']
            # Only a segment's exact radius-expanded box can contain pixels
            # closer than the clearance radius. This preserves the same
            # segment projection while avoiding full-canvas distance arrays.
            left=max(0,math.floor((min(a['x'],b['x'])-clearance_radius)*scale))
            right=min(w,math.ceil((max(a['x'],b['x'])+clearance_radius)*scale))
            top=max(0,math.floor((min(a['y'],b['y'])-clearance_radius)*scale))
            bottom=min(h,math.ceil((max(a['y'],b['y'])+clearance_radius)*scale))
            if left>=right or top>=bottom:continue
            sx,sy=xx[:,left:right],yy[top:bottom,:]
            t=np.clip(((sx-a['x'])*dx+(sy-a['y'])*dy)/(seg['length']**2),0,1)
            blocked[top:bottom,left:right]|=np.hypot(sx-a['x']-t*dx,sy-a['y']-t*dy)<clearance_radius
        valid=(xx>=30)&(xx<=930)&(yy>=60)&(yy<=610)&(~blocked)
        for o in m['obstacles']:
            valid&=np.hypot(xx-o['x'],yy-o['y'])>=o['r']+data['placement']['obstaclePadding']
        for s in m['validatorSamples']:
            if s['scale']==scale: assert bool(valid[s['y'],s['x']])==s['valid'],(id,s)
        mask=Image.fromarray((valid*255).astype('uint8'))
        mask.save(root/f'{id}-valid-centers-{w}x{h}.png',optimize=True)
        rgba=np.empty((h,w,4),dtype=np.uint8);rgba[:]=[40,49,61,255];rgba[valid]=[119,189,135,255]
        clearance=blocked&(xx>=30)&(xx<=930)&(yy>=60)&(yy<=610)
        rgba[clearance]=[182,135,85,255]
        image=Image.fromarray(rgba);paint=Image.open(root/f'{id}-painted-path-{w}x{h}.png').convert('RGBA');image.alpha_composite(paint)
        grid=Image.new('RGBA',(w,h),(0,0,0,0));grid_draw=ImageDraw.Draw(grid)
        font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12*scale)
        for x in range(0,961,60):grid_draw.line([(x*scale,0),(x*scale,h)],fill=(230,242,255,45),width=scale)
        for y in range(0,641,60):grid_draw.line([(0,y*scale),(w,y*scale)],fill=(230,242,255,45),width=scale)
        image.alpha_composite(grid);draw=ImageDraw.Draw(image)
        # Keep the actual sampled polyline: never draw a new spline through knots.
        draw.line([(p['x']*scale,p['y']*scale) for p in m['points']],fill='#56e2f3',width=2*scale)
        for a in m['arrows']:
            x,y,angle=a['x']*scale,a['y']*scale,a['angle']
            v=lambda along,side:(x+scale*(math.cos(angle)*along-math.sin(angle)*side),y+scale*(math.sin(angle)*along+math.cos(angle)*side))
            draw.polygon([v(8,0),v(-5,4),v(-5,-4)],fill='#004957')
        for i,o in enumerate(m['obstacles']):
            x,y,r=o['x']*scale,o['y']*scale,o['r']*scale
            pad=r+23*scale
            draw.ellipse((x-pad,y-pad,x+pad,y+pad),outline='#ffbca3',width=scale)
            draw.ellipse((x-r,y-r,x+r,y+r),fill='#c25967',outline='#ffdde2',width=2*scale)
            draw.text((x-12*scale,y-7*scale),f'O{i+1}',font=font,fill='white')
        draw.rectangle((30*scale,60*scale,930*scale,610*scale),outline='#f0efff',width=scale)
        draw.text((12*scale,14*scale),f'{id.upper()} — {m["name"]} | 960 × 640 world | {scale}x',font=font,fill='#ffffff')
        draw.text((12*scale,620*scale),'GREEN valid centers · CYAN enemy route · TAN painted path · RED obstacles · PEACH keepout',font=font,fill='white')
        image.save(root/f'{id}-guide-{w}x{h}.png',optimize=True)
        for kind in ['guide','valid-centers','painted-path']:
            name=f'{id}-{kind}-{w}x{h}.png';p=root/name
            entry['files'][name]={'dimensions':[w,h],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
        print(id,scale,'valid raster centers',int(valid.sum()),flush=True)
    manifest['maps'][id]=entry
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Sampling points are validation inputs, not enduring map geometry.
for m in data['maps'].values(): m.pop('validatorSamples')
(root/'geometry.json').write_text(json.dumps(data,indent=2)+'\n')
