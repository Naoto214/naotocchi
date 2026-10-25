"""Re-run a fixed subset of saved matches and compare the final save hash and result.
Usage: reproduce.py <manifest> <shards.jsonl.gz,...> <variant> <n> <scratch_dir>"""
import json,gzip,subprocess,sys,os
man,shards,variant,n,tmp=sys.argv[1],sys.argv[2].split(','),sys.argv[3],int(sys.argv[4]),sys.argv[5]
M=json.load(open(man));saved={}
for f in shards:
  for l in gzip.open(f,'rt'):r=json.loads(l);saved[r['match']]=r
pick=[m for m in M['matches'] if m['group'].endswith(':'+variant)][::max(1,len([m for m in M['matches'] if m['group'].endswith(':'+variant)])//n)][:n]
M['matches']=pick;mp=os.path.join(tmp,f'repro-{variant}.json');out=os.path.join(tmp,f'repro-{variant}.jsonl')
json.dump(M,open(mp,'w'))
if os.path.exists(out):os.remove(out)
subprocess.run(['node','../balance-verification-20261020/run.mjs',mp,out,'0','1'],check=True,cwd=os.path.dirname(os.path.abspath(__file__)))
rows=[json.loads(l) for l in open(out)];same=[r['saveSha256']==saved[r['match']]['saveSha256'] and r['result']==saved[r['match']]['result'] for r in rows]
print(json.dumps(dict(variant=variant,rerun=len(rows),identical=sum(same),matches=[r['match'] for r in rows])))
