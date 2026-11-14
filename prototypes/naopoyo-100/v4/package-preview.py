"""Add V4 to an existing owner-private V3 dist, preserving every old byte."""
from pathlib import Path
import sys,shutil,hashlib,json,re
root=Path(__file__).resolve().parents[3]
site=Path(sys.argv[1]).resolve();dist=site/'dist'
assert json.loads((site/'.openai/hosting.json').read_text())['project_id']=='appgprj_6af1a5042c5c8191be1e9c356976ef6f'
before={str(p.relative_to(dist)):hashlib.sha256(p.read_bytes()).hexdigest() for p in dist.rglob('*') if p.is_file() and '/v4/' not in str(p) and '/naopoyo-100-v4/' not in str(p) and '/naopoyo-100-v5/' not in str(p)}
for folder in ['prototypes/naopoyo-100/v4','docs/naopoyo-100-v4','docs/naopoyo-100-v5']:
    shutil.copytree(root/folder,dist/folder,dirs_exist_ok=True,ignore=shutil.ignore_patterns('tests','audit*.mjs','build-puzzles.mjs','package-preview.py','__pycache__'))
for name,h in before.items():assert hashlib.sha256((dist/name).read_bytes()).hexdigest()==h,name
for p in (dist/'prototypes/naopoyo-100/v4').rglob('*.mjs'):
    for ref in re.findall(r'(?:from\s*|import\s*)[\'\"](\.[^\'\"]+)[\'\"]',p.read_text()):
        assert (p.parent/ref).is_file(),(p,ref)
for p in (dist/'prototypes/naopoyo-100/v4').rglob('*.html'):
    for ref in re.findall(r'(?:href|src)="([^"#?]+)',p.read_text()):
        if ref.startswith(('http:', 'https:')):continue
        assert (p.parent/ref).exists(),(p,ref)
print(json.dumps({'preservedV3Files':len(before),'v4Files':sum(1 for p in (dist/'prototypes/naopoyo-100/v4').rglob('*') if p.is_file())}))
