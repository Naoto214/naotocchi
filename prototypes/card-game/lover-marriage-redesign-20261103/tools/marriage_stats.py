# Aggregates marriage timing from the saved PR #481 runs (read-only). Usage: python3 marriage_stats.py <breakup-penalty-20261029 dir>
import gzip,json,glob,sys,statistics as st,collections
base=sys.argv[1]
for run,variants in [('N1',['A','B']),('N2',['A','B'])]:
  rows=[]
  for f in sorted(glob.glob(f'{base}/runs/{run}-shard*.jsonl.gz')):
    for line in gzip.open(f,'rt'):
      d=json.loads(line); rows.append(d)
  for v in variants:
    R=[d for d in rows if d['arm']==v and d['status']=='completed']
    mr=[];left=[];first=collections.defaultdict(list);wins=[];growth=[];oppg=[];endmarried=0;n=0;placed=0
    for d in R:
      x=d['xSeat'];s=d['seat'][x];o=d['seat']['B' if x=='A' else 'A'];n+=1
      growth.append(s['growth']);oppg.append(o['growth'])
      if s['placements']:placed+=1
      m=s.get('marriage')
      if m:
        mr.append(m['round']);left.append(10-m['round'])  # own turns after marriage turn
        first[s['firstSeat']].append(m['round'])
      if (s.get('partnerAtEnd') or {}).get('stage')==4:endmarried+=1
    c=collections.Counter(mr)
    print(run,v,'seats',n,'placed',placed,'married',len(mr),'endMarried',endmarried)
    print('  marriage round mean %.2f median %s dist %s'%(st.mean(mr),st.median(mr),sorted(c.items())))
    print('  own turns after marriage turn: mean %.2f'%st.mean(left))
    print('  first-seat marriage round %.2f (n=%d) second %.2f (n=%d)'%(st.mean(first[True]),len(first[True]),st.mean(first[False]),len(first[False])))
    print('  X growth mean %.1f opp %.1f'%(st.mean(growth),st.mean(oppg)))
