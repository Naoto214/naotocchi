"""Read-only asset audit; writes this QA directory's verification.json only."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BASE = '1bde42db88ec06206cd1a6bca3633fde345b0e21'
def sha(p):
    return hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
def read(p):
    return json.loads((ROOT / p).read_text())
def tree(ref):
    rows = subprocess.check_output(['git', 'ls-tree', '-r', ref], cwd=ROOT).decode().splitlines()
    return {p: meta.split()[2] for meta, p in (r.split('\t') for r in rows)}
locked = read('docs/qa/starfish-bubble-final-approval-20260928.json')['locked16']
repairs = read('docs/qa/step4-local-repair-20260927.json')
records = []
for r in repairs['records']:
    assert sha(r['path']) == r['after_sha256'] == locked[r['path']], r['path']
    records.append({'path': r['path'], 'sha256': sha(r['path']), 'authority': 'approved after hash / locked16'})
for r in read('docs/qa/antlion08-production-final-20260929/manifest.json')['records']:
    assert sha(r['production']) == sha(r['source']) == r['production_sha256'], r['production']
    records.append({'path': r['production'], 'sha256': sha(r['production']), 'source': r['source'], 'candidate': r['candidate_id']})
assert len(records) == 26
for manifest in ['starfish-expressions-20260917-manifest.json', 'antlion-expressions-20260918-manifest.json']:
    for r in read('docs/qa/' + manifest)['records']:
        if r.get('final') in locked:
            assert r['final_sha256'] == locked[r['final']] == sha(r['final'])
            assert r['original_generation_final_sha256']
targets = {r['path'] for r in records}
old = tree(repairs['source_head'])
protected = {p: v for p, v in old.items() if p.startswith('assets/characters/') and p.endswith('.png') and p not in targets}
current = tree(BASE)
for p, blob in protected.items():
    assert current[p] == blob, p
images = {p: v for p, v in current.items() if p.lower().endswith(('.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif'))}
for p, blob in images.items():
    actual = subprocess.check_output(['git', 'hash-object', p], cwd=ROOT).decode().strip()
    assert actual == blob, p
runtime = ['pet-expression.js', 'pet-expression.css', 'care-attention.css', 'script.js', 'cast-bounds.js', 'cast-layout.js', 'emotion-state.js']
for p in runtime:
    assert subprocess.check_output(['git', 'hash-object', p], cwd=ROOT).decode().strip() == current[p], p
subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
result = {'resume_head': BASE, 'step4_baseline': repairs['source_head'], 'step4_complete': True,
          'approved_production_matches': records, 'step4_non_target_character_png_unchanged': len(protected),
          'all_existing_image_files_unchanged_this_step': len(images), 'production_image_changes_this_step': 0,
          'protected_runtime_unchanged': runtime, 'git_diff_check': 'PASS'}
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'approved_production_matches'}, ensure_ascii=False))
