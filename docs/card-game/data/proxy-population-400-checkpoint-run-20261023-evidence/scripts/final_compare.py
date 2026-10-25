"""Production 400 vs diag31 (400) and vs baseline census completed rows (frozen tree c1966ae4), play digests."""
import json,os,sys,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from play_digest import digest
S=os.path.dirname(os.path.abspath(__file__));RUN='/home/user/naotocchi/docs/card-game/data/proxy-population-400-checkpoint-run-20261023'
census=json.load(open('/home/user/naotocchi/docs/card-game/data/proxy-population-400-restart-20261020/diagnostics/census.json'))
base={r['match_id'] for r in census['rows'] if r['diagnostic_status']=='completed'}
sup=json.load(open(RUN+'/supervisor.json'))
rows=[];c=collections.Counter();winners=collections.Counter()
for i in range(1,401):
  res=json.load(open(RUN+f'/result-{i:04d}.json'))['result'];m=res['match_id']
  rec=json.loads(__import__('gzip').open(RUN+f'/attempt-{i:04d}/record.json.gz').read());rt=rec['runtime']
  p=digest(RUN+f'/attempt-{i:04d}/record.json.gz');d=digest(S+'/diag31/'+m+'/record.json.gz')
  b=digest(S+'/diag/'+m+'/record.json.gz') if m in base else None
  w=(rt.get('result') or {}).get('winner');winners[str(w)]+=1
  row=dict(schedule_index=i,match_id=m,execution_status=res['execution_status'],persisted=res['persisted'],results_commit=res['results_commit'],completed=rec.get('completed'),winner=w,decisions=len(rt['decisions']),events=len(rt['events']),play_digest=p,equal_diag31=p==d,baseline_completed=m in base,equal_baseline=(p==b) if b else None)
  rows.append(row);c['equal_diag31']+=row['equal_diag31'];c['baseline_rows']+=m in base;c['equal_baseline']+=bool(row['equal_baseline']);c['completed']+=row['completed'] is True
summary=dict(rows=len(rows),completed=c['completed'],equal_diag31=c['equal_diag31'],baseline_completed_rows=c['baseline_rows'],equal_baseline=c['equal_baseline'],winners=dict(winners),status=sup['status'],results_head=sup['results_head'])
print(json.dumps(summary))
json.dump(dict(schema='fixed400_production_comparison.v1',summary=summary,rows=rows),open(sys.argv[1],'w'),indent=1,ensure_ascii=False)
