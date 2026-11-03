"""Extra cuts for the report (read-only). Usage: python3 analyze_extra.py results/extra.json
- natural runs: score rate by what happened to the lover side in arm A; paired differences restricted to the
  pairs whose A-arm game had a breakup before marriage (the only games B can change), by X deck and Y deck.
- F2: loss of one breakup by stage and the share each plan gives back, on the pairs that reached the injection point."""
import json,sys,collections
from analyze import load,key,xseat,yseat,SC,ci,rate_ci,mean
def pairs(rows,a,b,filt=lambda ra,rb:True):
  A={key(r):r for r in rows if r['arm']==a};B={key(r):r for r in rows if r['arm']==b}
  return [(A[k],B[k]) for k in A if k in B and filt(A[k],B[k])]
def d(ps,side=xseat):return dict(score=ci([SC[side(rb)['result']]-SC[side(ra)['result']] for ra,rb in ps]),growth=ci([side(rb)['growth']-side(ra)['growth'] for ra,rb in ps]))
dating=lambda r:any(l['stage']<4 for l in xseat(r)['leaves'])
early=lambda r:any(l['stage']<=1 for l in xseat(r)['leaves'])
out={}
for name in ['N1','N2']:
  rows=load(name);A=[r for r in rows if r['arm']=='A'];o={}
  grp=collections.defaultdict(list)
  for r in A:
    x=xseat(r);s=set('dating' if l['stage']<4 else 'divorce' for l in x['leaves'])
    grp['none' if not s else '+'.join(sorted(s))].append(SC[x['result']])
  o['A_score_by_leave_kind']={k:rate_ci(v) for k,v in sorted(grp.items())}
  o['A_married_at_end_rate']=round(sum(1 for r in A if xseat(r).get('partnerAtEnd') and xseat(r)['partnerAtEnd']['stage']==4)/len(A),4)
  o['A_seats_with_dating_breakup']=sum(dating(r) for r in A);o['A_seats_with_divorce']=sum(any(l['stage']==4 for l in xseat(r)['leaves']) for r in A)
  for b in ['B','C','C2','Cx']:
    if any(r['arm']==b for r in rows):
      o[f'{b}-A_if_A_had_dating_breakup']=d(pairs(rows,'A',b,lambda ra,rb:dating(ra)))
      o[f'{b}-A_if_A_had_stage0or1_breakup']=d(pairs(rows,'A',b,lambda ra,rb:early(ra)))
      o[f'{b}-A_by_x_deck']={xd:d(pairs([r for r in rows if r['deck'][r['xSeat']].split('+')[0]==xd],'A',b)) for xd in ['partner','balance']}
      o[f'{b}-A_by_y_deck']={yd:d(pairs([r for r in rows if r['deck']['B' if r['xSeat']=='A' else 'A']==yd],'A',b)) for yd in ['challenge+S','growth+S','item+S','partner+S']}
  # the opponent of the lover deck: does B make すれちがい weaker for the side that plays it?
  o['B-A_for_misunderstanding_side']=d(pairs(rows,'A','B'),side=yseat)
  o['misunderstanding_plays_per_Y_seat']={arm:mean(yseat(r)['plays'].get('E-misunderstanding',0) for r in rows if r['arm']==arm) for arm in sorted({r['arm'] for r in rows})}
  o['first_seat_score_A']={'X_first':rate_ci([SC[xseat(r)['result']] for r in A if r['first']=='X']),'Y_first':rate_ci([SC[xseat(r)['result']] for r in A if r['first']=='Y'])}
  o['opener_Y_has_misunderstanding_A']={str(f):rate_ci([SC[xseat(r)['result']] for r in A if (yseat(r)['opener']['misunderstanding']>0)==f]) for f in (True,False)}
  out[name]=o
rows=load('F2')
if rows:
  reached=lambda ra,rb:bool(ra.get('injectPoint') and rb.get('injectPoint'))
  f2={}
  for k in range(5):
    R=[r for r in rows if r['stage']==k];st={}
    st['injection_point_reached']={arm:sum(1 for r in R if r['arm']==arm and r.get('injectPoint')) for arm in ['A:none','A:inject','B:inject','Cx:none','Cx:inject','C:inject']}
    st['round_of_point_mean']=mean(r['injectPoint']['round'] for r in R if r['arm']=='A:inject' and r.get('injectPoint'))
    st['actual_breakups']={arm:collections.Counter(str(l['stage']) for r in R if r['arm']==arm for l in xseat(r)['leaves'] if l['byOpponent']) for arm in ['A:inject','B:inject','Cx:inject','C:inject']}
    st['protected_by_lovepaper']={arm:sum(xseat(r)['replacements'].get('I-partner1',0) for r in R if r['arm']==arm) for arm in ['A:inject','B:inject','Cx:inject','C:inject']}
    st['amicable_responses_C']=sum(xseat(r)['amicableResponses'] for r in R if r['arm']=='C:inject')
    st['married_at_end']={arm:round(sum(1 for r in R if r['arm']==arm and xseat(r).get('partnerAtEnd') and xseat(r)['partnerAtEnd']['stage']==4)/max(1,sum(r['arm']==arm for r in R)),3) for arm in ['A:none','A:inject','B:inject','Cx:none','Cx:inject','C:inject']}
    for a,b in [('A:none','A:inject'),('A:inject','B:inject'),('A:none','B:inject'),('Cx:none','Cx:inject'),('Cx:inject','C:inject'),('Cx:none','C:inject')]:
      st[f'{b} - {a}']=d(pairs(R,a,b,reached))
    f2[str(k)]=st
  out['F2']=f2
json.dump(out,open(sys.argv[1],'w'),indent=1,ensure_ascii=False,default=dict)
print(json.dumps(out,ensure_ascii=False,default=dict)[:200])
