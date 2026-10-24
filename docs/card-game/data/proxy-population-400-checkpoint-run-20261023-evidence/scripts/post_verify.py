"""Independent read-only verification of the results branch: ledger chain + play equality with diag31."""
import sys,json,gzip,os,subprocess,tempfile,hashlib
R='/home/user/naotocchi';sys.path.insert(0,R+'/docs/card-game/tools');sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import proxy_population_checkpoint_operator as op,proxy_population_checkpoint_ledger as ledger,proxy_population_results_store as results,proxy_population_checkpoint_supervisor as sup
from play_digest import KEYS
S=os.path.dirname(os.path.abspath(__file__));saved=json.load(open(S+'/launch-request-ckpt/context.json'))
B='docs/card-game/data/proxy-population-effective-application/verification/fixed400-checkpoint-binding-7d181ce3-20261023'
ctx=op.load_context(R,saved['publication']['commit'],B)
claim=dict(comment_id=6365642150,commit='99237d9098b4ef5b26c336d4b9b09b8773d5a52c',tree='00afddee95630313a41b98c39aaafdab0fe1ddb1')
attempt=saved['resume']['attempt_id']
store=results.Store(R,attempt,tempfile.mkdtemp(dir=S),generation=0)
head=store.remote_head()
subprocess.run(['git','-C',R,'fetch','-q','origin','refs/heads/'+store.branch],check=True)
rows=store.load_rows(head)
descriptor=ledger.attempt_descriptor(attempt,ctx['bundle'],ctx['certificate'],claim)
plan=ledger.verify_ledger(rows,descriptor,ctx['bundle'])
def digest(raw):
  r=json.loads(raw);rt=r['runtime']
  parts=dict(events=[{k:e.get(k) for k in KEYS} for e in rt['events']],decisions=[(d.get('selected_candidate'),d.get('decision_kind')) for d in rt['decisions']],final_game_state=rt['final_envelope']['legacy_continuation']['game_state'],completed=rt.get('completed'),result=rt.get('result'),stop=rt.get('stop'))
  return hashlib.sha256(json.dumps(parts,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
out=[];eq=0;statuses={}
for i in sorted(rows):
  entry,receipt,compressed,start=rows[i];rec=json.loads(gzip.decompress(compressed));mid=rec['binding']['match_id']
  st=json.loads(receipt)['execution_status'];statuses[st]=statuses.get(st,0)+1
  d=gzip.open(S+'/diag31/'+mid+'/record.json.gz').read();same=digest(gzip.decompress(compressed))==digest(d);eq+=same
  out.append(dict(schedule_index=i,match_id=mid,execution_status=st,completed=rec.get('completed'),winner=(rec['runtime'].get('result') or {}).get('winner'),events=len(rec['runtime']['events']),entry_sha256=entry['entry_sha256'],play_equal_diag31=same))
summary=dict(results_branch=store.branch,results_head=head,saved_rows=len(rows),ledger_completed_rows=plan['completed_rows'],statuses=statuses,play_equal_diag31=eq,last_entry_sha256=out[-1]['entry_sha256'] if out else None)
print(json.dumps(summary))
if len(sys.argv)>1:json.dump(dict(summary=summary,rows=out),open(sys.argv[1],'w'),indent=1,ensure_ascii=False)
