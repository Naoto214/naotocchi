# Long-term storage of the experiment records (REPRODUCE.md, VERSION 7). Works without this branch once the bundle exists.
#   pack <out.tar.gz>     : every file listed in results/archive-index*.json, read from the commit that holds it (git history),
#                           SHA-256 checked, plus the index files themselves, into one tar.gz OUTSIDE the repository
#                           (for a GitHub Release asset or another store chosen by the owner; this script uploads nothing).
#   restore <in.tar.gz>   : puts the files back at their paths and checks every SHA-256 against the index inside the bundle.
# Usage (repository root): python3 prototypes/card-game/variable-life-20261031/lib/archive-bundle.py pack /path/outside/repo/x.tar.gz
import hashlib, io, json, subprocess, sys, tarfile
from pathlib import Path
ROOT = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel']).decode().strip())
EXP = 'prototypes/card-game/variable-life-20261031'
sha = lambda b: hashlib.sha256(b).hexdigest()
def indexes():
    return sorted((ROOT / EXP / 'results').glob('archive-index*.json'))
def pack(out):
    out = Path(out).resolve()
    if str(out).startswith(str(ROOT) + '/'): sys.exit('write the bundle outside the repository')
    n = 0
    with tarfile.open(out, 'w:gz') as tar:
        for ix in indexes():
            data = ix.read_bytes(); info = tarfile.TarInfo(f'{EXP}/results/{ix.name}'); info.size = len(data); tar.addfile(info, io.BytesIO(data))
            for f in json.loads(data)['files']:
                blob = subprocess.check_output(['git', 'show', f"{f['commit']}:{f['path']}"], cwd=ROOT)
                if sha(blob) != f['sha256']: sys.exit('MISMATCH ' + f['path'])
                info = tarfile.TarInfo(f['path']); info.size = len(blob); tar.addfile(info, io.BytesIO(blob)); n += 1
    print(json.dumps({'bundle': str(out), 'files': n, 'bytes': out.stat().st_size, 'sha256': sha(out.read_bytes())}))
def restore(src):
    with tarfile.open(src, 'r:gz') as tar:
        members = {m.name: m for m in tar.getmembers()}
        idx = [json.loads(tar.extractfile(m).read()) for name, m in members.items() if name.startswith(f'{EXP}/results/archive-index')]
        bad = n = 0
        for ix in idx:
            for f in ix['files']:
                blob = tar.extractfile(members[f['path']]).read()
                if sha(blob) != f['sha256']: bad += 1; print('MISMATCH', f['path']); continue
                p = ROOT / f['path']; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(blob); n += 1
    print(f'restored {n} files' + (f', {bad} mismatches' if bad else ''))
    sys.exit(1 if bad else 0)
if __name__ == '__main__':
    {'pack': pack, 'restore': restore}[sys.argv[1]](sys.argv[2])
