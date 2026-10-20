#!/usr/bin/env python3
"""Integration check: a fresh 14-match pilot run must equal the stored stage-4 pilot (runs/pilot-a.jsonl.gz),
ignoring elapsedMs. Proves the integrated CPU judgment is the verified one. Usage: python3 verify-pilot.py <fresh.jsonl>"""
import gzip, json, sys
strip = lambda l: {k: v for k, v in json.loads(l).items() if k != 'elapsedMs'}
stored = {r['match']: r for r in map(strip, gzip.open('runs/pilot-a.jsonl.gz', 'rt'))}
fresh = {r['match']: r for r in map(strip, open(sys.argv[1]))}
bad = [m for m in stored if fresh.get(m) != stored[m]]
print(json.dumps({'stored': len(stored), 'fresh': len(fresh), 'mismatch': bad}, ensure_ascii=False))
sys.exit(1 if bad or len(fresh) != len(stored) else 0)
