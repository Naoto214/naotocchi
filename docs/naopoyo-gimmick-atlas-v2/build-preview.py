"""Package exact source painters and catalog into an existing owner-private Site checkout.
No generated reference copies are committed to the game repository.
"""
from pathlib import Path
import re,json,shutil,hashlib,sys
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];OUT=Path(sys.argv[1]).resolve();OUT.mkdir(parents=True,exist_ok=True)
for p in HERE.iterdir():
 if p.is_file() and p.suffix in ['.html','.css','.mjs','.json','.md','.csv']:shutil.copyfile(p,OUT/p.name)
shutil.copytree(ROOT/'docs/naopoyo-gimmick-atlas-v1',OUT/'v1',dirs_exist_ok=True)
REF=OUT/'ref';manifest={};seen=set()
seeds=['prototypes/naopoyo-time-hand-chapter1/draw.mjs','prototypes/naopoyo-time-hand-chapter1/stages.mjs','prototypes/naopoyo-time-hand-chapter1/engine.mjs','prototypes/naopoyo-castle-forest/draw.mjs','prototypes/naopoyo-castle-forest/stages.mjs','prototypes/naopoyo-castle-forest/runtime.mjs','prototypes/naopoyo-world/stages.mjs','prototypes/naopoyo-world/render.mjs','prototypes/naopoyo-rescue/sprites.mjs']
def cp(rel):
 rel=Path(rel).as_posix()
 if rel in seen:return
 seen.add(rel);src=HERE/'source'/Path(rel).name if rel.startswith('prototypes/naopoyo-castle-forest/') else ROOT/rel
 if not src.exists():raise FileNotFoundError(str(src))
 dest=REF/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest)
 source_ref = 'PR #535 gate comparison; content identified by sha256' if rel.startswith('prototypes/naopoyo-shared/') else '8f64cf0e2f5915671c7931ec54ac1842214d877f' if rel.startswith(('prototypes/naopoyo-100/','docs/naopoyo-gimmick-atlas-v2/')) else '9ebcda6d40d57634fe94dc7e80b5e7b66be65a18' if 'castle-forest' in rel else 'e0120c58f36394c9acff6507d72ceb3a1f48e1e2'
 manifest[rel]={'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'source':source_ref}
 if src.suffix=='.mjs':
  text=src.read_text()
  for dep in re.findall(r'(?:from\s*|import\s*)[\'\"](\.[^\'\"]+)[\'\"]',text):
   destrel=(ROOT/rel).parent/dep;cp(destrel.resolve().relative_to(ROOT))
seeds += ['prototypes/naopoyo-shared/gate-design.mjs','prototypes/naopoyo-shared/gate-choice.mjs','prototypes/naopoyo-100/stages.mjs']
for seed in seeds:cp(seed)
sprite=(ROOT/'prototypes/naopoyo-rescue/sprite-data.mjs').read_text()
for asset in re.findall(r'"path":"([^"]+)"',sprite):
 if asset.endswith('owl-sulky-v1.png'):continue
 cp(asset)
for name,folder in [('owl','companions'),('forest_bear','partners'),('otter','companions'),('squirrel','companions'),('penguin_friend','companions')]:cp(f'assets/characters/{folder}/{name}.png')
cp('prototypes/naopoyo-time-hand-chapter1/assets/gravity-wood-approved.webp')
(OUT/'reference-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Packaged {len(manifest)} referenced source/assets with hashes')
