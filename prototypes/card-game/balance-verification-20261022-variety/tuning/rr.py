import json,glob,sys,collections,math
R=[json.loads(l) for f in glob.glob(sys.argv[1]+'/*.jsonl') for l in open(f)]
print('games',len(R),'abnormal',sum(r['status']!='completed' for r in R))
M=collections.defaultdict(lambda:[0.0,0]);O=collections.defaultdict(lambda:[0.0,0]);G=collections.defaultdict(list)
for r in R:
  w=r['result']['winner']
  for s,t in (('A','B'),('B','A')):
    x=.5 if w is None else float(w==s);M[(r['deck'][s],r['deck'][t])][0]+=x;M[(r['deck'][s],r['deck'][t])][1]+=1;G[r['deck'][s]].append(r['growth'][s])
    if r['deck'][s]!=r['deck'][t]:O[r['deck'][s]][0]+=x;O[r['deck'][s]][1]+=1
ids=sorted(O,key=lambda d:-O[d][0]/O[d][1])
print('deck      vs-others  growth   '+' '.join(i[:5] for i in ids))
for a in ids: print(f'{a:10s} {O[a][0]/O[a][1]:.3f}    {sum(G[a])/len(G[a]):5.1f}   '+' '.join(f'{M[(a,b)][0]/M[(a,b)][1]:.2f} ' if M[(a,b)][1] else ' -   ' for b in ids))
