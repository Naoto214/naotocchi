#!/usr/bin/env python3
"""Compare re-executed match records with the stored runs/*.jsonl.gz (ignoring elapsedMs)."""
import gzip, glob, json, sys
stored = {}
for f in glob.glob('runs/*-shard*.jsonl.gz'):
    for l in gzip.open(f, 'rt'):
        r = json.loads(l); r.pop('elapsedMs', None); stored[r['match']] = r
checked = mismatch = missing = 0
for f in sys.argv[1:]:
    for l in open(f):
        r = json.loads(l); r.pop('elapsedMs', None)
        if r['match'] not in stored: missing += 1; continue
        checked += 1
        if r != stored[r['match']]: mismatch += 1; print('MISMATCH', r['match'])
print(json.dumps({'checked': checked, 'mismatch': mismatch, 'not_in_store': missing}))
sys.exit(1 if mismatch or not checked else 0)
