#!/bin/sh
# Restores the experiment records removed from HEAD by lib/archive.py (ARCHIVE.md) from this branch's history, and checks each
# file's SHA-256 against results/archive-index.json. The restored files are ignored by .gitignore (they are not committed again).
# Usage: sh prototypes/card-game/variable-life-20261031/lib/restore-archive.sh
set -e
cd "$(git rev-parse --show-toplevel)"
python3 - <<'PY'
import hashlib, json, subprocess
from pathlib import Path
import glob
files = [f for ix in sorted(glob.glob('prototypes/card-game/variable-life-20261031/results/archive-index*.json')) for f in json.load(open(ix))['files']]
idx = {'files': files}
bad = 0
for f in idx['files']:
    data = subprocess.check_output(['git', 'show', f"{f['commit']}:{f['path']}"])
    if hashlib.sha256(data).hexdigest() != f['sha256']: bad += 1; print('MISMATCH', f['path']); continue
    p = Path(f['path']); p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
print(f"restored {len(idx['files']) - bad} / {len(idx['files'])} files" + (' (mismatches!)' if bad else ''))
PY
