"""Lover (partner) metrics from saved CPU-vs-CPU match records (read-only).

Usage: cpu_lover.py <out.json> <label=path.jsonl.gz> ...
Each record carries per-seat card counters (deck/drawn/played/activated/handEnd), decision kinds
(including 'relationship' = one dating step or the marriage step) and the final growth.
No CPU deck in these runs contains a card that removes or replaces a lover, so a seat keeps the
first lover it places; four relationship steps on that lover are exactly the marriage.
"""
import json,gzip,sys,collections
out=sys.argv[1];srcs=[a.split('=',1) for a in sys.argv[2:]]
seats=[];bad=collections.Counter()
for label,path in srcs:
  for line in gzip.open(path,'rt'):
    r=json.loads(line)
    if r.get('status')!='completed' or 'cards' not in r:bad[(label,r.get('status'))]+=1;continue
    w=(r.get('result') or {}).get('winner')
    for p in 'AB':
      cards=r['cards'][p];P={c:v for c,v in cards.items() if c.startswith('P-')}
      placed=sum(v['played'] for v in P.values());rel=(r['kinds'].get(p) or {}).get('relationship',0)
      seats.append(dict(src=label,match=r['match'],seat=p,deck=r['deck'][p],diff=r['difficulty'][p],
        partners_in_deck=sum(v['deck'] for v in P.values()),partner_kinds_in_deck=len(P),partners_drawn=sum(v['drawn'] for v in P.values()),placed=placed,
        placed_card=next((c for c,v in P.items() if v['played']),None),relationship_steps=rel,activated=sum(v['activated'] for v in P.values()),
        partners_hand_end=sum(v['handEnd'] for v in P.values()),growth=r['growth'][p],result='win' if w==p else 'draw' if w in(None,'draw') else 'loss'))
def rate(n,d):return round(n/d,3) if d else None
def summ(g):
  n=len(g);return dict(seats=n,win_rate=rate(sum(s['result']=='win' for s in g),n),draw_rate=rate(sum(s['result']=='draw' for s in g),n),mean_growth=round(sum(s['growth'] for s in g)/n,2) if n else None)
assert all(s['placed']<=1 for s in seats),'a seat placed more than one lover'
assert all(s['relationship_steps']<=4 for s in seats),'more than four relationship steps'
lov=[s for s in seats if s['partners_in_deck']];placed=[s for s in lov if s['placed']]
stage=collections.Counter(min(s['relationship_steps'],4) for s in placed)
card=collections.defaultdict(collections.Counter)
for s in seats:
  if s['placed_card']:card[s['placed_card']]['placements']+=1;card[s['placed_card']]['marriages']+=s['relationship_steps']>=4;card[s['placed_card']]['activations']+=s['activated']
by_deck=collections.defaultdict(list)
for s in lov:by_deck[(s['src'] if s['src'] in('V1','V2') else 'E',s['deck'])].append(s)
deck_rows={f'{k[0]}|{k[1]}':dict(seats=len(v),lover_copies=v[0]['partners_in_deck'],placed_rate=rate(sum(bool(s['placed']) for s in v),len(v)),
  married_rate=rate(sum(s['relationship_steps']>=4 for s in v),len(v)),mean_steps_if_placed=round(sum(s['relationship_steps'] for s in v if s['placed'])/max(1,sum(bool(s['placed']) for s in v)),2),
  unusable_lover_in_hand_at_end=rate(sum(1 for s in v if s['placed'] and s['partners_hand_end']>0),len(v)),**{'win_rate':summ(v)['win_rate']}) for k,v in sorted(by_deck.items())}
summary=dict(sources=sorted({l for l,_ in srcs}),files=[p.split('/prototypes/')[-1] for _,p in srcs],records_skipped={f'{a}|{b}':n for (a,b),n in bad.items()},seats=len(seats),games=len(seats)//2,
  seats_with_lover_in_deck=len(lov),placed=len(placed),placed_rate_of_lover_decks=rate(len(placed),len(lov)),
  relationship_steps_reached_if_placed={str(k) if k<4 else 'married':v for k,v in sorted(stage.items())},
  marriages=sum(s['relationship_steps']>=4 for s in placed),marriage_rate_of_placed=rate(sum(s['relationship_steps']>=4 for s in placed),len(placed)),
  lover_drawn_but_never_placed=sum(1 for s in lov if s['partners_drawn']>0 and not s['placed']),
  lover_never_drawn=sum(1 for s in lov if s['partners_drawn']==0),
  seats_ending_with_unusable_lover_in_hand=sum(1 for s in placed if s['partners_hand_end']>0),
  by_outcome=dict(married=summ([s for s in placed if s['relationship_steps']>=4]),placed_not_married=summ([s for s in placed if s['relationship_steps']<4]),
    lover_in_deck_not_placed=summ([s for s in lov if not s['placed']]),no_lover_in_deck=summ([s for s in seats if not s['partners_in_deck']])),
  by_source={l:dict(seats=sum(s['src']==l for s in seats),placed=sum(1 for s in placed if s['src']==l),married=sum(1 for s in placed if s['src']==l and s['relationship_steps']>=4)) for l in sorted({l for l,_ in srcs})})
json.dump(dict(schema='cpu_lover_metrics.v1',summary=summary,by_deck=deck_rows,cards={c:dict(v) for c,v in sorted(card.items())}),open(out,'w'),indent=1,ensure_ascii=False)
print(json.dumps(summary,ensure_ascii=False,indent=1));print(json.dumps(deck_rows,ensure_ascii=False,indent=1));print(json.dumps({c:dict(v) for c,v in sorted(card.items())},ensure_ascii=False))
