"""Index actual browser captures (never produce mockups)."""
from pathlib import Path
from html import escape
root=Path('docs/qa/v5')
groups={
 'Eight contact sheets of actual tower-state renders':sorted((root/'contacts').glob('*.png')),
 'Running game and upgrade panels':sorted((root/'rendered').glob('*.png')),
 'Menus across devices':sorted((root/'layout').glob('*.png')),
 'All seven painted routes':sorted((root/'maps').glob('*-geometry-overlay.png')),
 'Existing production baseline (6afec04)':sorted((root/'production-baseline').glob('*.png')),
 'Before fixes (audit findings)':sorted((root/'initial').glob('*.png')),
 '200 paid tower-state captures, cropped at real gameplay size':sorted((root/'rendered/towers').glob('*.png')),
}
md=['# Actual rendered V5 screenshots','', 'These are real Phaser Canvas/HTML screenshots. Development fixtures inspect', 'individual artwork, combat and end screens; funded balance results are separate.','', '[Full audit](README.md) · [HTML gallery](gallery.html)','']
html=['<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tiny Siege V5 audit screenshots</title>', '<style>body{font:16px system-ui;background:#eaf5df;color:#193a35;margin:20px}h2{clear:both}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}figure{margin:0;padding:10px;background:white;border-radius:10px}img{width:100%;height:auto;object-fit:contain}figcaption{overflow-wrap:anywhere}a{color:#176f63}.crops img{width:auto;min-width:52px;max-height:100px}</style>', '<h1>Tiny Siege V5 — actual rendered screenshots</h1><p>Debug inspection fixtures are separate from earned-gold campaigns. Click a capture for original pixels. No production deployment.</p>']
for title,files in groups.items():
 if not files:continue
 md+=['## '+title,'']
 html+=['<h2>'+escape(title)+'</h2><div class="grid '+('crops' if '200 paid' in title else '')+'">']
 for p in files:
  rel=p.relative_to(root).as_posix();label=p.stem
  md.append(f'- [{label}]({rel})')
  html.append(f'<figure><a href="{rel}"><img loading="lazy" src="{rel}" alt="{escape(label)}"></a><figcaption>{escape(label)}</figcaption></figure>')
 md.append('');html.append('</div>')
(root/'screenshots.md').write_text('\n'.join(md)+'\n');(root/'gallery.html').write_text('\n'.join(html)+'\n')
print({title:len(files) for title,files in groups.items()})
