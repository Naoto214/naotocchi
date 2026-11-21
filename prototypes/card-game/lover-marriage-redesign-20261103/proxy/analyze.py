# Usage: python3 analyze.py [results.jsonl.gz]
import json,gzip,sys,collections,statistics as st,math
R=[json.loads(l) for l in gzip.open(sys.argv[1] if len(sys.argv)>1 else 'results.jsonl.gz','rt')]
by=collections.defaultdict(dict)
for d in R:
  x=d['xSeat'];s=d['seat'][x];sc={'win':1,'draw':.5,'loss':0}[s['result']]
  key=d['group'].rsplit(':',1)[0]+':'+d['first']
  by[d['arm']][key]=dict(score=sc,growth=s['growth'],opp=d['seat']['B' if x=='A' else 'A']['growth'],married=(s.get('partnerAtEnd') or {}).get('stage')==4,mr=(s.get('marriage') or {}).get('round'),first=s['firstSeat'],y=d['deck']['B' if x=='A' else 'A'],replay=d.get('replay'))
def ci(diffs):
  m=st.mean(diffs);se=st.pstdev(diffs)/math.sqrt(len(diffs));return m,m-1.96*se,m+1.96*se
A=by['A0']
print('replay', collections.Counter(v['replay'] for a in by.values() for v in a.values()))
for arm in ['A0','MD','MG','MS']:
  v=list(by[arm].values());fs=[x['score'] for x in v if x['first']];ss=[x['score'] for x in v if not x['first']]
  print(arm,'score %.3f growth %.1f opp %.1f marriedEnd %d/%d mr %.2f | first %.3f second %.3f'%(st.mean(x['score'] for x in v),st.mean(x['growth'] for x in v),st.mean(x['opp'] for x in v),sum(x['married'] for x in v),len(v),st.mean([x['mr'] for x in v if x['mr']]),st.mean(fs),st.mean(ss)))
  if arm!='A0':
    ks=sorted(A);print('   diff score %.3f (%.3f..%.3f)'%ci([by[arm][k]['score']-A[k]['score'] for k in ks]),' growth %.1f (%.1f..%.1f)'%ci([by[arm][k]['growth']-A[k]['growth'] for k in ks]))
    per=collections.defaultdict(list)
    for k in ks: per[A[k]['y']].append(by[arm][k]['score']-A[k]['score'])
    print('   by opp',{y:round(st.mean(l),3) for y,l in per.items()})
per=collections.defaultdict(list)
for x in A.values(): per[x['y']].append(x['score'])
print('A0 by opp',{y:round(st.mean(l),3) for y,l in per.items()})
