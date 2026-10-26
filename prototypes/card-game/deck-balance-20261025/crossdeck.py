"""Seven-deck balance before/after the partner-deck change, from saved records only.

before_v1 : stage-4 V1 round robin as run (old partner list, V1 seeds).
before_pd : V1 games without the partner deck + partner games of the old list (L10) from the
            partner-deck comparison (PD seeds).
after     : V1 games without the partner deck + partner games of the adopted list (L6cf, same PD seeds).
after_all : after + the adopted list's games on the independent seeds of the extra check (runs/X-shard*, X1).
before_pd and after differ only in the partner deck's 40 cards. Mirror games are excluded from deck
score rates. Usage: crossdeck.py <out.json>
"""
import json,gzip,sys,os,collections,math
H=os.path.dirname(os.path.abspath(__file__));VR=os.path.join(H,'../balance-verification-20261022-variety/runs');PR=os.path.join(H,'../partner-deck-20261025/runs')
def load(path):return [json.loads(l) for l in gzip.open(path,'rt')]
v1=[r for k in range(4) for r in load(f'{VR}/V1-shard{k}.jsonl.gz')]
pd={'L10':[r for k in range(4) for r in load(f'{PR}/PD-shard{k}.jsonl.gz') if ':L10:' in r['match']],
    'L6cf':[r for k in range(4) for r in load(f'{PR}/PD2-shard{k}.jsonl.gz') if ':L6cf:' in r['match']]}
norm=lambda d:'partner' if d.startswith('partner') else d
def games(rows):
  out=[]
  for r in rows:
    if r['status']!='completed':raise SystemExit('abnormal record '+r['match'])
    w=(r.get('result') or {}).get('winner');first='A'   # seat A always moves first in these runs
    out.append(dict(match=r['match'],A=norm(r['deck']['A']),B=norm(r['deck']['B']),winner=w,first=first,growth=r['growth']))
  return out
def table(gs):
  decks=sorted({g['A'] for g in gs}|{g['B'] for g in gs},key=['main','companion','partner','challenge','growth','item','balance'].index)
  pair=collections.defaultdict(lambda:[0.0,0]);deck=collections.defaultdict(lambda:[0.0,0]);firstS=[0.0,0];deckFirst=collections.defaultdict(lambda:{'first':[0.0,0],'second':[0.0,0]})
  for g in gs:
    for s,o in (('A','B'),('B','A')):
      sc=1.0 if g['winner']==s else 0.5 if g['winner'] is None else 0.0
      if g[s]!=g[o]:
        pair[(g[s],g[o])][0]+=sc;pair[(g[s],g[o])][1]+=1;deck[g[s]][0]+=sc;deck[g[s]][1]+=1
        k='first' if s==g['first'] else 'second';deckFirst[g[s]][k][0]+=sc;deckFirst[g[s]][k][1]+=1
    sc=1.0 if g['winner']==g['first'] else 0.5 if g['winner'] is None else 0.0;firstS[0]+=sc;firstS[1]+=1
  r3=lambda x:round(x,3)
  se=lambda p,n:r3(math.sqrt(p*(1-p)/n)) if n else None
  ds={d:dict(games=deck[d][1],score_rate=r3(deck[d][0]/deck[d][1]),se=se(deck[d][0]/deck[d][1],deck[d][1]),
     first=r3(deckFirst[d]['first'][0]/deckFirst[d]['first'][1]),second=r3(deckFirst[d]['second'][0]/deckFirst[d]['second'][1])) for d in decks}
  rates=[v['score_rate'] for v in ds.values()]
  return dict(decks=ds,range=dict(min=min(rates),max=max(rates),width=r3(max(rates)-min(rates))),first_player_score=r3(firstS[0]/firstS[1]),games=len(gs),
   pairs={f'{a}|{b}':dict(games=n,score=r3(s/n)) for (a,b),(s,n) in sorted(pair.items())})
base=[g for g in games(v1) if 'partner' not in (g['A'],g['B'])]
res=dict(schema='cpu_seven_deck_balance.v1',sources=dict(v1='balance-verification-20261022-variety/runs/V1-shard*.jsonl.gz',pd_L10='partner-deck-20261025/runs/PD-shard*.jsonl.gz (L10)',pd_L6cf='partner-deck-20261025/runs/PD2-shard*.jsonl.gz (L6cf)'),
 before_v1=table(games(v1)),before_pd=table(base+games(pd['L10'])),after=table(base+games(pd['L6cf'])))
xr=[r for k in range(4) for r in load(f'{H}/runs/X-shard{k}.jsonl.gz') if r['group'].endswith(':X1')]
if xr:res['after_all']=table(base+games(pd['L6cf'])+games(xr));res['sources']['x1']='deck-balance-20261025/runs/X-shard*.jsonl.gz (X1)'
json.dump(res,open(sys.argv[1],'w'),indent=1,ensure_ascii=False)
for k in [k for k in ('before_v1','before_pd','after','after_all') if k in res]:
  t=res[k];print(k,t['games'],'first',t['first_player_score'],'range',t['range'])
  for d,v in t['decks'].items():print('  ',d.ljust(10),v)
print('partner vs each (before_pd -> after):')
for o in ['main','companion','challenge','growth','item','balance']:print('  ',o,res['before_pd']['pairs'][f'partner|{o}'],'->',res['after']['pairs'][f'partner|{o}'],' all:',res.get('after_all',{}).get('pairs',{}).get(f'partner|{o}'),' v1:',res['before_v1']['pairs'][f'partner|{o}'])
