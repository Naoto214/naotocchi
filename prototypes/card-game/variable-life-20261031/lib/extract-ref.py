# Copies the PR #495 records reused as A0 (G-A) and A5 (G-D) — read-only, from the PR #495 commit — into ref/.
# Each record gets its seed label `base` from the PR #495 manifest. PR #495's own files are not changed.
# Usage: python3 lib/extract-ref.py [commit=0eb96d8c980805e5431b1c71714f1a316e425f12]
import gzip, json, subprocess, sys, hashlib, io
C = sys.argv[1] if len(sys.argv) > 1 else '0eb96d8c980805e5431b1c71714f1a316e425f12'
P = 'prototypes/card-game/round12-comparison-20261030/runs/'
show = lambda f: subprocess.run(['git', 'show', f'{C}:{P}{f}'], capture_output=True, check=True).stdout
out, src = {}, {}
for name in ['G120', 'G120E8']:
    man = show(f'{name}-manifest.json'); src[f'{name}-manifest.json'] = hashlib.sha256(man).hexdigest()
    base = {m['match']: m['base'] for m in json.loads(man)['matches']}
    rows = []
    for k in range(4):
        raw = show(f'{name}-shard{k}.jsonl.gz'); src[f'{name}-shard{k}.jsonl.gz'] = hashlib.sha256(raw).hexdigest()
        for l in gzip.open(io.BytesIO(raw), 'rt'):
            r = json.loads(l)
            if r['variant'] in ('G-A', 'G-D') and (name == 'G120' or r['deck']['A'] == 'main+8' or r['deck']['B'] == 'main+8'):
                r['base'] = base[r['match']]; rows.append(r)
    rows.sort(key=lambda r: r['match'])
    with gzip.open(f'ref/{name}-AD.jsonl.gz', 'wt') as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + '\n')
    out[name] = len(rows)
json.dump({'commit': C, 'path': P, 'sourceSha256': src, 'records': out, 'variants': ['G-A', 'G-D']}, open('ref/ref-manifest.json', 'w'), indent=1)
print(out)
