"""Aggregates the breakup-penalty runs (read-only).
Usage: python3 analyze.py results/summary.json   (reads runs/<N1|N2|F|P>-shard*.jsonl.gz)
Score rate: win 1, draw 0.5, loss 0, from the lover side (X). Paired differences use the same base group
and the same seat order (common seeds) across arms; 95% CI = mean +- 1.96 sd / sqrt(n)."""
import json,gzip,glob,sys,math,collections,os
HERE=os.path.dirname(os.path.abspath(__file__))
def load(name):
  rows=[]
  for f in sorted(glob.glob(f'{HERE}/runs/{name}-shard*.jsonl.gz')):
    rows+=[json.loads(l) for l in gzip.open(f,'rt')]
  return rows
SC={'win':1,'draw':.5,'loss':0}
def key(r):  # base group + seat order, independent of the arm
  g=r['group'];arm=r['arm'];return g[:-(len(arm)+1)]+'|'+r['first']
def mean(xs):xs=list(xs);return round(sum(xs)/len(xs),4) if xs else None
def ci(xs):
  xs=list(xs);n=len(xs)
  if n<2:return dict(n=n,mean=mean(xs),lo=None,hi=None)
  m=sum(xs)/n;sd=math.sqrt(sum((x-m)**2 for x in xs)/(n-1));h=1.96*sd/math.sqrt(n)
  return dict(n=n,mean=round(m,4),lo=round(m-h,4),hi=round(m+h,4),halfwidth=round(h,4))
def rate_ci(xs):
  xs=list(xs);n=len(xs);m=sum(xs)/n if n else 0;h=1.96*math.sqrt(m*(1-m)/n) if n else 0
  return dict(n=n,mean=round(m,4),lo=round(m-h,4),hi=round(m+h,4))
def xseat(r):return r['seat'][r['xSeat']]
def yseat(r):return r['seat']['B' if r['xSeat']=='A' else 'A']
def dating(x):return [l for l in x['leaves'] if l['stage']<4]
def divorce(x):return [l for l in x['leaves'] if l['stage']==4]
def seat_metrics(rows,side):
  S=[side(r) for r in rows];n=len(S)
  placed=[x for x in S if x['placements']]
  leaves=[l for x in S for l in x['leaves']]
  res=[l['residence'] for x in S for l in x['leaves']]+[x['partnerAtEnd']['residence'] for x in S if x.get('partnerAtEnd')]
  stage=collections.Counter(str(l['stage']) if l['stage']<4 else 'married' for l in leaves)
  cause=collections.Counter('opponent' if l['byOpponent'] else 'own_amicable' if l['byOwnAmicable'] else 'own_other' for l in leaves)
  mar=[x['marriage'] for x in S if x['marriage']]
  return dict(seats=n,score_rate=rate_ci([SC[x['result']] for x in S]) if n else None,
    mean_growth=mean(x['growth'] for x in S),
    breakups_dating=sum(len(dating(x)) for x in S),divorces=sum(len(divorce(x)) for x in S),
    leaves_per_seat=mean(len(x['leaves']) for x in S),seats_with_leave=sum(bool(x['leaves']) for x in S),
    leaves_by_stage=dict(sorted(stage.items())),leaves_by_cause=dict(cause),
    growth_lost_total=sum(l['applied'] for l in leaves),growth_lost_per_leave=mean(l['applied'] for l in leaves),
    nominal_penalty_total=sum(l['penalty'] for l in leaves),
    placed_seats=len(placed),placements=sum(len(x['placements']) for x in S),
    marriage_rate_of_placed=round(len(mar)/len(placed),4) if placed else None,married_at_end=sum(1 for x in S if x.get('partnerAtEnd') and x['partnerAtEnd']['stage']==4),
    marriage_round_mean=mean(m['round'] for m in mar),marriage_turns_from_placement_mean=mean(m['turnsFromPlacement'] for m in mar),
    residence_own_turns_mean=mean(res),
    second_lover_placed_seats=sum(1 for x in placed if len(x['placements'])>=2),
    second_lover_placed_rate_of_placed=round(sum(1 for x in placed if len(x['placements'])>=2)/len(placed),4) if placed else None,
    replacements_after_leave=sum(1 for x in S for p in x['placements'] if p['afterLeave']),
    same_card_replaced=sum(1 for x in S for p in x['placements'] if p['sameCard']),same_instance_replaced=sum(1 for x in S for p in x['placements'] if p['sameInstance']),
    lovers_in_hand_end_mean=mean(x['handEnd']['lovers'] for x in S),seats_with_lover_in_hand_end_of_placed=round(sum(1 for x in placed if x['handEnd']['lovers']>0)/len(placed),4) if placed else None,
    cat_ceo_triggers=sum(x['triggers'].get('P-cat_ceo',0) for x in S),cat_ceo_retriggers=sum(max(0,x['triggers'].get('P-cat_ceo',0)-1) for x in S),
    plays={k:sum(x['plays'].get(k,0) for x in S) for k in ['E-misunderstanding','E-amicable-breakup','E-first-date','E-reconciliation','E-wedding-anniversary','I-c_match','E-new-encounter','G-connect-four']},
    lovepaper_equips=sum(x['equips'].get('I-partner1',0) for x in S),
    replacements_used={k:sum(x['replacements'].get(k,0) for x in S) for k in sorted({k for x in S for k in x['replacements']})},
    amicable_responses=sum(x['amicableResponses'] for x in S),loop_plays=sum(x.get('loopPlays',0) for x in S),
    misunderstanding_received=sum(x['misSeen'] for x in S),
    by_first_seat={str(f):rate_ci([SC[x['result']] for x in S if x['firstSeat']==f]) for f in (True,False)},
    by_opener_lover={str(f):rate_ci([SC[x['result']] for x in S if (x['opener']['lovers']>0)==f]) for f in (True,False)})
def paired(rows,a,b,filt=None):
  A={key(r):r for r in rows if r['arm']==a};B={key(r):r for r in rows if r['arm']==b}
  ks=[k for k in A if k in B and (filt is None or filt(A[k],B[k]))]
  return ci([SC[xseat(B[k])['result']]-SC[xseat(A[k])['result']] for k in ks])|dict(growth=ci([xseat(B[k])['growth']-xseat(A[k])['growth'] for k in ks]))
def anyleave(ra,rb):return bool(xseat(ra)['leaves'] or xseat(rb)['leaves'])
def summarize(name,rows,base='A'):
  arms=sorted({r['arm'] for r in rows},key=lambda a:['A','B','C','C2','Cx','C:loop','C:noloop','C2:loop','A:none','A:inject','B:inject','Cx:none','Cx:inject','C:inject'].index(a))
  out=dict(matches=len(rows),status=dict(collections.Counter(r['status'] for r in rows)),replay=dict(collections.Counter(r.get('replay') for r in rows)),
    elapsed_ms_mean=mean(r['elapsedMs'] for r in rows),arms={})
  for arm in arms:
    R=[r for r in rows if r['arm']==arm]
    out['arms'][arm]=dict(matches=len(R),x=seat_metrics(R,xseat),y=seat_metrics(R,yseat))
    if 'stage' in R[0] and R[0]['stage'] is not None:
      out['arms'][arm]['by_stage']={str(k):seat_metrics([r for r in R if r['stage']==k],xseat) for k in sorted({r['stage'] for r in R})}
    xs=sorted({r['deck'][r['xSeat']] for r in R})
    out['arms'][arm]['by_x_deck']={d:seat_metrics([r for r in R if r['deck'][r['xSeat']]==d],xseat) for d in xs}
    ys=sorted({r['deck']['B' if r['xSeat']=='A' else 'A'] for r in R})
    out['arms'][arm]['by_y_deck']={d:seat_metrics([r for r in R if r['deck']['B' if r['xSeat']=='A' else 'A']==d],xseat) for d in ys}
  comps=[(a,b) for a,b in [('A','B'),('A','C'),('A','C2'),('A','Cx'),('Cx','C'),('Cx','C2'),('C:noloop','C:loop'),('C:noloop','C2:loop'),('C:loop','C2:loop'),('A:none','A:inject'),('A:inject','B:inject'),('Cx:none','Cx:inject'),('Cx:inject','C:inject'),('A:none','B:inject'),('Cx:none','C:inject')] if a in arms and b in arms]
  out['paired']={f'{b}-{a}':dict(all=paired(rows,a,b),with_any_leave=paired(rows,a,b,anyleave)) for a,b in comps}
  if any(r.get('stage') is not None for r in rows):
    out['paired_by_stage']={str(k):{f'{b}-{a}':paired([r for r in rows if r['stage']==k],a,b) for a,b in comps} for k in sorted({r['stage'] for r in rows})}
  return out
if __name__=='__main__':
  res={}
  for name in ['N1','N2','F','P','F2']:
    rows=load(name)
    if rows:res[name]=summarize(name,rows)
  json.dump(res,open(sys.argv[1],'w'),indent=1,ensure_ascii=False)
  for n,v in res.items():
    print(n,v['matches'],v['status'],v['replay'])
    for arm,a in v['arms'].items():
      x=a['x'];print(f"  {arm:9} X score {x['score_rate']['mean']:.3f} growth {x['mean_growth']} dating {x['breakups_dating']} divorce {x['divorces']} lost {x['growth_lost_total']} marry {x['marriage_rate_of_placed']} 2nd {x['second_lover_placed_rate_of_placed']} amicResp {x['amicable_responses']} loop {x['loop_plays']} repl {x['replacements_used']}")
    for k,p in v['paired'].items():print('   ',k,'all',p['all'],'\n      leave',p['with_any_leave'])
