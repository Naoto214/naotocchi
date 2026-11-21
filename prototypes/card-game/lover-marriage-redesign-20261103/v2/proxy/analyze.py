# Usage: python3 analyze.py [results.jsonl.gz] [v1 results for the A0 equivalence check]
import json,gzip,sys,collections,statistics as st,math
R=[json.loads(l) for l in gzip.open(sys.argv[1] if len(sys.argv)>1 else 'results.jsonl.gz','rt')]
v1=sys.argv[2] if len(sys.argv)>2 else '../../proxy/results.jsonl.gz'
old={json.loads(l)['match'].replace(':A0:',':'): json.loads(l)['saveSha256'] for l in gzip.open(v1,'rt') if json.loads(l)['variant']=='A0'}
by=collections.defaultdict(dict);eq=[0,0]
for d in R:
  x=d['xSeat'];s=d['seat'][x];o=d['seat']['B' if x=='A' else 'A'];sc={'win':1,'draw':.5,'loss':0}[s['result']]
  X,v=d['arm'].split(':');key=d['group'].split(':partner')[0]+':'+d['first']
  by[d['arm']][d['base'] if 'base' in d else d['group'].rsplit(':',2)[0]+':'+d['first']]=None
  k=d['group'].rsplit(':',2)[0]+':'+d['first']
  by[d['arm']][k]=dict(score=sc,growth=s['growth'],first=s['firstSeat'],trig=s['triggers'],mr=(s.get('marriage') or {}).get('round'),y=d['deck']['B' if x=='A' else 'A'],replay=d.get('replay'))
  if X=='partner' and v=='A0':
    key1=d['match'].replace(':partner:A0:',':')
    eq[0]+=1;eq[1]+=old.get(key1)==d['saveSha256']
print('replay',collections.Counter(v['replay'] for a in by.values() for v in a.values() if v),' v1-A0 equivalence %d/%d'%(eq[1],eq[0]))
def ci(x):m=st.mean(x);se=st.pstdev(x)/math.sqrt(len(x));return m,m-1.96*se,m+1.96*se
for X,v in [('partner','SW'),('partner-scorp','SC'),('partner-robot','RB')]:
  A={k:z for k,z in by[X+':A0'].items() if z};B={k:z for k,z in by[X+':'+v].items() if z};ks=sorted(A)
  t=lambda arm:collections.Counter(c for z in arm.values() for c,n in z['trig'].items() for _ in range(n))
  print(X,'A0 %.3f'%st.mean(z['score'] for z in A.values()),v,'%.3f'%st.mean(z['score'] for z in B.values()),
    '| diff %.3f (%.3f..%.3f)'%ci([B[k]['score']-A[k]['score'] for k in ks]),'growth %.1f (%.1f..%.1f)'%ci([B[k]['growth']-A[k]['growth'] for k in ks]),
    '| married R %.2f'%st.mean([z['mr'] for z in B.values() if z['mr']]),'| first/second diff %.3f/%.3f'%(st.mean([B[k]['score']-A[k]['score'] for k in ks if A[k]['first']]),st.mean([B[k]['score']-A[k]['score'] for k in ks if not A[k]['first']])))
  print('   triggers A0',dict(t(A)),' ',v,dict(t(B)))
