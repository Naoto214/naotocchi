"""Edition-independent play digest: decisions + event skeleton + final game state."""
import json,gzip,hashlib,sys,os
KEYS=('seq','action_type','actor','selected_candidate','source_instance_id','chain_link_id','game_state_before_sha256','game_state_after_sha256','continuation_state_after_sha256')
def digest(path):
  r=json.loads(gzip.open(path).read());rt=r['runtime']
  ev=[{k:e.get(k) for k in KEYS} for e in rt['events']]
  dec=[(d.get('selected_candidate'),d.get('decision_kind')) for d in rt['decisions']]
  g=rt['final_envelope']['legacy_continuation']['game_state']
  parts=dict(events=ev,decisions=dec,final_game_state=g,completed=rt.get('completed'),result=rt.get('result'),stop=rt.get('stop'))
  return hashlib.sha256(json.dumps(parts,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
if __name__=='__main__':
  a,b=sys.argv[1],sys.argv[2];out={}
  for m in sorted(set(os.listdir(a))&set(os.listdir(b))):
    pa,pb=a+'/'+m+'/record.json.gz',b+'/'+m+'/record.json.gz'
    if os.path.exists(pa) and os.path.exists(pb):out[m]=dict(before=digest(pa),after=digest(pb));out[m]['play_equal']=out[m]['before']==out[m]['after']
  print(json.dumps({m:v['play_equal'] for m,v in out.items()}))
  if len(sys.argv)>3:json.dump(out,open(sys.argv[3],'w'),indent=1)
