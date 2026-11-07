# R10 build (logging hooks only) vs the unmodified official modules: same save sha256 and result for every pair.
# Usage: python3 lib/check-equivalence.py runs/EQ-*.jsonl.gz runs/MAIN-*.jsonl.gz > results/equivalence.json
import gzip,json,sys
rows=[json.loads(l) for f in sys.argv[1:] for l in (gzip.open(f,'rt') if f.endswith('.gz') else open(f))]
off={(r['base'] if 'base' in r else r['group'].rsplit(':',1)[0],r['first']):r for r in rows if r['variant']=='OFFICIAL'}
r10={(r['group'].rsplit(':',1)[0],r['first']):r for r in rows if r['variant']=='R10'}
keys=[k for k in off if k in r10]
bad=[k for k in keys if off[k].get('saveSha256')!=r10[k].get('saveSha256') or off[k]['result']!=r10[k]['result']]
print(json.dumps({'compared':len(keys),'mismatch':len(bad),'mismatches':[':'.join(k) for k in bad][:20]},ensure_ascii=False,indent=1))
