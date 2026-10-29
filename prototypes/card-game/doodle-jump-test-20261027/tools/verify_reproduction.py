#!/usr/bin/env python3
"""Compare re-run records with the saved ones by saveSha256 and result.
Usage: python3 tools/verify_reproduction.py <label> <rerun.jsonl> [<label> <rerun.jsonl> ...] > results/reproduction.json"""
import glob, gzip, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
saved = {}
for f in sorted(glob.glob(os.path.join(HERE, '..', 'runs', 'shard*.jsonl*'))):
    for l in (gzip.open(f, 'rt') if f.endswith('.gz') else open(f)):
        r = json.loads(l); saved[r['match']] = r
out = {}
args = sys.argv[1:]
for label, path in zip(args[::2], args[1::2]):
    rows = [json.loads(l) for l in open(path) if l.strip()]
    out[label] = {'matches': len(rows), 'save_sha256_equal': sum(saved[r['match']]['saveSha256'] == r['saveSha256'] for r in rows),
                  'result_equal': sum(saved[r['match']]['result'] == r['result'] for r in rows),
                  'match_ids': [r['match'] for r in rows]}
print(json.dumps(out, ensure_ascii=False, indent=1))
