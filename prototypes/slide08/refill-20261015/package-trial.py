"""Build an isolated static trial; never alter GitHub Pages or game rules."""
from pathlib import Path
import shutil,sys,json
root=Path(__file__).resolve().parents[3]
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
files=['prototypes/slide08/engine.mjs','prototypes/slide08/player-model.mjs','prototypes/slide08/animation.mjs','prototypes/naopoyo/settings.mjs','prototypes/naopoyo/series.css','prototypes/growth-chain/roster.mjs','prototypes/growth-chain/catalog.mjs']
lab=Path('prototypes/slide08/refill-20261015')
files += [str(lab/x) for x in ['engine.mjs','session.mjs','trial-metrics.mjs','ui/index.html','ui/player.css','ui/player.mjs','ui/animation.mjs']]
for folder in (root/'assets/characters').iterdir():
 if folder.is_dir():
  files += [str(p.relative_to(root)) for p in folder.glob('[0-9][0-9].png')]
for name in files:
 dest=out/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,dest)
(out/'index.html').write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおぽよ E/B/C比較</title><meta http-equiv="refresh" content="0;url=prototypes/slide08/refill-20261015/ui/index.html"><a href="prototypes/slide08/refill-20261015/ui/index.html">比較試遊を開く</a>')
# The isolated trial has no unrelated mode selector.
index=out/lab/'ui/index.html';index.write_text(index.read_text().replace('href="../naopoyo/"','href="/"').replace('← モード選択','← 比較試遊の入口'))
(out/'trial-manifest.json').write_text(json.dumps({'entry':'prototypes/slide08/refill-20261015/ui/index.html','files':files},ensure_ascii=False,indent=2))
print(json.dumps({'files':len(files),'output':str(out)}))
