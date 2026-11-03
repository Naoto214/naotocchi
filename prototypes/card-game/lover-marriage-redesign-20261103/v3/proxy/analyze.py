# Usage: python3 analyze.py [v3 results] [v2 results with the A0 arms]
import json,gzip,sys,collections,statistics as st,math
def load(p):return [json.loads(l) for l in gzip.open(p,'rt')]
R=load(sys.argv[1] if len(sys.argv)>1 else 'results.jsonl.gz')+load(sys.argv[2] if len(sys.argv)>2 else '../../v2/proxy/results.jsonl.gz')
by=collections.defaultdict(dict)
for d in R:
  x=d['xSeat'];s=d['seat'][x];sc={'win':1,'draw':.5,'loss':0}[s['result']]
  by[d['arm']][d['group'].rsplit(':',2)[0]+':'+d['first']]=dict(score=sc,growth=s['growth'],first=s['firstSeat'],trig=s['triggers'],replay=d.get('replay'))
def ci(x):m=st.mean(x);se=st.pstdev(x)/math.sqrt(len(x));return m,m-1.96*se,m+1.96*se
print('replay',collections.Counter(v['replay'] for a in by.values() for v in a.values()))
for X,v,ref in [('partner','SW3','SW'),('partner-robot','RB3','RB')]:
  A=by[X+':A0'];B=by[X+':'+v];C=by[X+':'+ref];ks=sorted(A)
  t=lambda arm:dict(collections.Counter(c for z in arm.values() for c,n in z['trig'].items() for _ in range(n)))
  print(X,v,'score %.3f vs A0 %.3f'%(st.mean(z['score'] for z in B.values()),st.mean(z['score'] for z in A.values())),
   '| V3-A0 %.3f (%.3f..%.3f)'%ci([B[k]['score']-A[k]['score'] for k in ks]),'| V3-V2A %.3f (%.3f..%.3f)'%ci([B[k]['score']-C[k]['score'] for k in ks]),
   '| growth %.1f'%st.mean([B[k]['growth']-A[k]['growth'] for k in ks]),'| first/second %.3f/%.3f'%(st.mean([B[k]['score']-A[k]['score'] for k in ks if A[k]['first']]),st.mean([B[k]['score']-A[k]['score'] for k in ks if not A[k]['first']])))
  print('   triggers',t(B))
