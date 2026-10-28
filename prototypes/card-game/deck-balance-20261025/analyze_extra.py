"""Extra check results. X1: adopted partner list vs six decks on independent seeds; X2: beginner vs
intermediate partner mirror. Usage: analyze_extra.py <out.json>"""
import json,gzip,sys,os,collections,math
H=os.path.dirname(os.path.abspath(__file__))
rows=[json.loads(l) for k in range(4) for l in gzip.open(f'{H}/runs/X-shard{k}.jsonl.gz','rt')]
bad=[r['match'] for r in rows if r['status']!='completed' or r.get('replay')!='match']
r3=lambda x:round(x,3)
x1=collections.defaultdict(list);seat_first=[];x2=[]
for r in rows:
  w=(r.get('result') or {}).get('winner')
  if r['group'].endswith(':X1'):
    s='A' if r['deck']['A']=='partner' else 'B';o=r['deck']['B' if s=='A' else 'A'];c=r['cards'][s];L={k:v for k,v in c.items() if k.startswith('P-')}
    placed=sum(v['played'] for v in L.values());steps=r['kinds'][s].get('relationship',0)
    x1[o].append(dict(score=1.0 if w==s else 0.5 if w is None else 0.0,first=s=='A',married=placed>0 and steps>=4,placed=placed>0,
      lovers_hand_end=sum(v['handEnd'] for v in L.values()),lover_activations=sum(v['activated'] for v in L.values()),
      connect_four=c.get('G-connect-four',{}).get('played',0)))
  else:
    s='A' if r['difficulty']['A']=='intermediate' else 'B';x2.append(1.0 if w==s else 0.5 if w is None else 0.0)
allx=[g for v in x1.values() for g in v];m=lambda a,f:sum(f(x) for x in a)/len(a)
def summ(a):p=m(a,lambda x:x['score']);return dict(games=len(a),score_rate=r3(p),se=r3(math.sqrt(p*(1-p)/len(a))),first=r3(m([x for x in a if x['first']],lambda x:x['score'])),second=r3(m([x for x in a if not x['first']],lambda x:x['score'])),
  placed_rate=r3(m(a,lambda x:x['placed'])),married_rate=r3(m(a,lambda x:x['married'])),lovers_hand_end=r3(m(a,lambda x:x['lovers_hand_end'])),surplus_rate=r3(m(a,lambda x:x['lovers_hand_end']>0)),
  lover_activations=r3(m(a,lambda x:x['lover_activations'])),connect_four_played=r3(m(a,lambda x:x['connect_four'])))
out=dict(schema='deck_balance_extra.v1',completed=len(rows)-len(bad),abnormal_or_replay_mismatch=bad,
 X1=dict(overall=summ(allx),by_opponent={o:summ(v) for o,v in x1.items()}),
 X2=dict(games=len(x2),intermediate_score=r3(sum(x2)/len(x2)),note='stage-4 V2 partner mirror (old list): 0.500'))
json.dump(out,open(sys.argv[1],'w'),indent=1,ensure_ascii=False);print(json.dumps(out,ensure_ascii=False,indent=1))
