"""Build the owner-only prototype from tracked source and unchanged referenced art."""
from pathlib import Path
import hashlib,json,re,shutil,subprocess,sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OUT=Path(sys.argv[1]).resolve()
OUT.mkdir(parents=True,exist_ok=True)
seen=set();manifest={}
def copy(rel):
    rel=Path(rel).as_posix()
    if rel in seen:return
    seen.add(rel);src=ROOT/rel
    if not src.is_file():raise FileNotFoundError(src)
    dest=OUT/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
    manifest[rel]=hashlib.sha256(src.read_bytes()).hexdigest()
    if src.suffix=='.mjs':
        for dep in re.findall(r'(?:from\s*|import\s*)[\'\"](\.[^\'\"]+)[\'\"]',src.read_text()):
            copy((src.parent/dep).resolve().relative_to(ROOT))
for src in HERE.iterdir():
    if src.suffix in ('.mjs','.json','.html','.css') and src.name!='build-stages.mjs':copy(src.relative_to(ROOT))
copy('docs/naopoyo-gimmick-atlas-v2/catalog.json')
for src in (ROOT/'docs/naopoyo-100-v1').iterdir():
    if src.is_file():copy(src.relative_to(ROOT))
sprite=(ROOT/'prototypes/naopoyo-rescue/sprite-data.mjs').read_text()
for asset in re.findall(r'"path":"([^"]+)"',sprite):
    if 'owl-' not in asset:copy(asset)
for name,folder in [('owl','companions'),('forest_bear','partners'),('otter','companions'),('squirrel','companions'),('penguin_friend','companions')]:copy(f'assets/characters/{folder}/{name}.png')
copy('prototypes/naopoyo-time-hand-chapter1/assets/gravity-wood-approved.webp')
subprocess.run([sys.executable,str(ROOT/'docs/naopoyo-gimmick-atlas-v2/build-preview.py'),str(OUT/'atlas')],check=True)
(OUT/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおぽよ。</title><script>location.replace("prototypes/naopoyo-100/"+location.search+location.hash)</script><a href="prototypes/naopoyo-100/">100の小さな冒険をひらく</a></html>')
(OUT/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'files':len(manifest),'output':str(OUT)}))
