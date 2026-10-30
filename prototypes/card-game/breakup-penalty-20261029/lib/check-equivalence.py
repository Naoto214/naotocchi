"""A-variant copy vs the official engine: re-run a fixed subset of the A matches of a manifest with the
official runner (../../balance-verification-20261020/run.mjs, official modules) and compare save hash and result
with the saved isolated-runner records. Usage: python3 lib/check-equivalence.py <name> <every_k> <out.json> <scratch_dir>"""
import json,gzip,glob,subprocess,sys,os
name,k,out,tmp=sys.argv[1],int(sys.argv[2]),sys.argv[3],sys.argv[4]
here=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M=json.load(open(f'{here}/runs/{name}-manifest.json'))
saved={}
for f in glob.glob(f'{here}/runs/{name}-shard*.jsonl.gz'):
  for l in gzip.open(f,'rt'):r=json.loads(l);saved[r['match']]=r
pick=[m for m in M['matches'] if m['arm']=='A'][::k]
M['matches']=pick;mp=os.path.join(tmp,f'eq-{name}.json');res=os.path.join(tmp,f'eq-{name}.jsonl')
json.dump(M,open(mp,'w'))
if os.path.exists(res):os.remove(res)
subprocess.run(['node',f'{here}/../balance-verification-20261020/run.mjs',mp,res,'0','1'],check=True,stderr=subprocess.DEVNULL)
rows=[json.loads(l) for l in open(res)]
same=[r['match'] for r in rows if r['saveSha256']==saved[r['match']]['saveSha256'] and r['result']==saved[r['match']]['result']]
withLeave=sum(1 for r in rows if saved[r['match']]['seat']['A']['leaves'] or saved[r['match']]['seat']['B']['leaves'])
json.dump(dict(manifest=name,rerun_with_official_engine=len(rows),identical_save_and_result=len(same),of_which_games_with_breakup=withLeave,matches=[r['match'] for r in rows]),open(out,'w'),indent=1)
print(len(rows),len(same),withLeave)
