"""Re-run V1 matches (stage 4) that do not involve the partner deck on the current code and compare
the final save hash and result with the saved records. Usage: reproduce_v1.py <n> <scratch_dir> <out.json>"""
import json,gzip,subprocess,sys,os
HERE=os.path.dirname(os.path.abspath(__file__));V=os.path.join(HERE,'../balance-verification-20261022-variety/runs')
n,tmp,out=int(sys.argv[1]),sys.argv[2],sys.argv[3]
M=json.load(open(f'{V}/V1-manifest.json'));saved={}
for k in range(4):
  for l in gzip.open(f'{V}/V1-shard{k}.jsonl.gz','rt'):r=json.loads(l);saved[r['match']]=r
cand=[m for m in M['matches'] if 'partner' not in (m['deckA'],m['deckB'])];pick=cand[::max(1,len(cand)//n)][:n]
M['matches']=pick;mp=os.path.join(tmp,'repro-v1.json');jo=os.path.join(tmp,'repro-v1.jsonl');json.dump(M,open(mp,'w'))
if os.path.exists(jo):os.remove(jo)
subprocess.run(['node','../balance-verification-20261020/run.mjs',mp,jo,'0','1'],check=True,cwd=HERE,stdout=subprocess.DEVNULL)
rows=[json.loads(l) for l in open(jo)];ok=[r['saveSha256']==saved[r['match']]['saveSha256'] and r['result']==saved[r['match']]['result'] for r in rows]
json.dump(dict(source='balance-verification-20261022-variety/runs/V1',rerun=len(rows),identical=sum(ok),matches=[r['match'] for r in rows]),open(out,'w'),indent=1)
print(sum(ok),'/',len(rows))
