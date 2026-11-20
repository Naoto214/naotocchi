# Storage clean-up for the repository's storage check (tools/work/check_storage.py), VERSION 6 (ARCHIVE.md).
# Lists every file of this experiment that the check flags, classifies it, writes results/archive-index.json (path, sha256,
# bytes, category, the commit that still contains it) and removes the files from HEAD with `git rm` (they stay in this branch's
# history). Restore with: sh lib/restore-archive.sh  (or regenerate: lib/run-all.sh with the manifests, see ARCHIVE.md).
# Usage (from the repository root): python3 prototypes/card-game/variable-life-20261031/lib/archive.py <commit-containing-files>
import hashlib, json, subprocess, sys
from pathlib import Path
ROOT = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel']).decode().strip())
EXP = 'prototypes/card-game/variable-life-20261031'
commit = subprocess.check_output(['git', 'rev-parse', sys.argv[1]]).decode().strip()
base = subprocess.check_output(['git', 'merge-base', 'origin/main', commit]).decode().strip()
out = subprocess.run(['python3', 'tools/work/check_storage.py', '--merge-base', base, '--head', commit], cwd=ROOT, capture_output=True, text=True).stdout
flagged = [l.split(' ', 2)[1] for l in out.splitlines() if l.startswith('REVIEW ')]
# Also the screenshots in evidence-v2/-v4/-v5 (not flagged only because of the directory name; same kind of regenerable QA output).
flagged += [p for p in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', commit, EXP + '/trial-time'], cwd=ROOT).decode().split() if '/evidence-v' in p and p.endswith('.png') and p not in flagged]
assert all(p.startswith(EXP + '/') for p in flagged), 'a flagged file is outside this experiment'
def category(p):
    rel = p[len(EXP) + 1:]
    if rel.startswith('runs/') and rel.endswith('.jsonl.gz'): return '復元に必要な資料（CPU 対戦の記録。seed とビルドから再生成も可能）'
    if rel.startswith('runs/') and rel.endswith('-manifest.json'): return '再現に必要な設定（大きなマニフェスト。make-manifest で再生成可能）'
    if rel.startswith('ref/'): return '復元に必要な資料（PR #495 の比較記録の写し）'
    if rel.endswith('.png'): return '再生成可能な画像（ブラウザ確認の画面。確認スクリプトで再生成可能）'
    return 'その他'
index = []
for p in flagged:
    data = subprocess.check_output(['git', 'show', f'{commit}:{p}'], cwd=ROOT)
    index.append({'path': p, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'category': category(p), 'commit': commit})
(ROOT / EXP / 'results/archive-index.json').write_text(json.dumps({'commit': commit, 'files': index}, ensure_ascii=False, indent=1) + '\n')
subprocess.check_call(['git', 'rm', '-q', '--cached', *flagged], cwd=ROOT)
for p in flagged: (ROOT / p).unlink(missing_ok=True)
from collections import Counter
print(json.dumps({'commit': commit, 'removedFromHead': len(index), 'bytes': sum(x['bytes'] for x in index), 'byCategory': Counter(x['category'] for x in index)}, ensure_ascii=False, indent=1))
