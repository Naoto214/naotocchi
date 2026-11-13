# VERSION 5 の最終集計。V4 の結果（A0・V4、同じ seed・同じ組）と V5 の結果を対にする。
# 使い方: python3 sim/analyze.py <V4 results.jsonl.gz> <V5 final.jsonl(.gz)> [summary.json]
import json,gzip,sys,collections as C,statistics as st,math
ld=lambda p:[json.loads(l) for l in (gzip.open(p,'rt') if p.endswith('.gz') else open(p))]
args=[a for a in sys.argv[1:] if not a.endswith('.json')];outp=[a for a in sys.argv[1:] if a.endswith('.json')]
R=[r for p in args for r in ld(p)];by={(r['group'],r['arm'],r['first']):r for r in R}
V5=[r for r in ld(args[1])]
def ci(x):
    m=st.mean(x);se=st.pstdev(x)/math.sqrt(len(x));return [round(m,4),round(m-1.96*se,4),round(m+1.96*se,4),len(x)]
def wilson(k,n):
    p=k/n;z=1.96;d=1+z*z/n;c=(p+z*z/(2*n))/d;h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [round(p,4),round(c-h,4),round(c+h,4)]
sides=lambda r:[(r['X'],r['x']),(r['Y'],r['y'])]
groups=sorted({g for (g,a,f) in by if g.startswith('RR:') and a=='V5'})
decks=['main','companion','partner','challenge','growth','item','balance'];ARMS=['A0','V4','V5','V5cpu0']
out={'games_v5':len(V5),'abnormal_v5':sum(r['status']!='completed' for r in V5),'replay_v5':dict(C.Counter(r['replay'] for r in V5))}
tab={}
for d in decks:
    row={}
    for arm in ARMS:
        xs=[s['result'] for g in groups for f in 'XY' for dd,s in sides(by[(g,arm,f)]) if dd==d];row[arm]=round(st.mean(xs),4);row['n']=len(xs)
    for a,b in [('V5','A0'),('V5','V4'),('V5','V5cpu0')]:
        row[a+'-'+b]=ci([sum(s['result'] for dd,s in sides(by[(g,a,f)]) if dd==d)-sum(s['result'] for dd,s in sides(by[(g,b,f)]) if dd==d) for g in groups for f in 'XY' if d in g.split(':')[1:3]])
    S=[s for g in groups for f in 'XY' for dd,s in sides(by[(g,'V5',f)]) if dd==d]
    row['V5_first']=round(st.mean(s['result'] for s in S if s['first']),4);row['V5_second']=round(st.mean(s['result'] for s in S if not s['first']),4)
    row['V5_married']=wilson(sum(bool(s['married']) for s in S),len(S));mr=[s['marriedRound'] for s in S if s['marriedRound']];row['V5_marriedRound']=round(st.mean(mr),2) if mr else None
    row['V5_uses']=dict(C.Counter(c for s in S for c in s['loverUse']));row['V5_v4PerGame']=round(sum(len(s['v4']) for s in S)/len(S),3)
    row['V5_ci']=wilson(sum(s['result'] for s in S),len(S))  # 引き分けは 0.5 で数えるので近似
    tab[d]=row
out['RR']=tab
out['width']={a:round(max(tab[d][a] for d in decks)-min(tab[d][a] for d in decks),4) for a in ARMS}
out['max_min']={a:[max(decks,key=lambda d:tab[d][a]),min(decks,key=lambda d:tab[d][a])] for a in ARMS}
allS=lambda arm:[s for g in groups for f in 'XY' for dd,s in sides(by[(g,arm,f)])]
out['seat']={a:{'first':round(st.mean(s['result'] for s in allS(a) if s['first']),4)} for a in ARMS}
out['hand']={a:{'max':max(s['hand'] for s in allS(a)),'ge15':sum(s['hand']>=15 for s in allS(a)),'deckOut':sum(s['deck']==0 for s in allS(a))} for a in ARMS}
out['marriage']={a:{'rate':round(sum(bool(s['married']) for s in allS(a))/len(allS(a)),4),'round':round(st.mean(s['marriedRound'] for s in allS(a) if s['marriedRound']),2)} for a in ARMS}
out['uses_all_V5']=dict(sorted(C.Counter(c for s in allS('V5') for c in s['loverUse']).items()))
out['rounds']={a:round(st.mean(by[(g,a,f)]['round'] for g in groups for f in 'XY'),2) for a in ARMS}
# 先攻・後攻：恋人デッキの差（V4 で目立った）
# LV：V5 の恋人（ゴリラ・クモ・せいれい）を恋人デッキに入れた時（V4 の A0・V4 と同じ組）。
lv={}
for (g,a,f),r in by.items():
    if g.startswith('LV:') and a=='V5':
        lover=r['X'].split('/')[1];e=lv.setdefault(lover,{'d0':[],'d4':[],'s':[],'uses':C.Counter()})
        e['s'].append(r['x']['result']);e['uses'].update(r['x']['loverUse'])
        if (g,'A0',f) in by:e['d0'].append(r['x']['result']-by[(g,'A0',f)]['x']['result'])
        if (g,'V4',f) in by:e['d4'].append(r['x']['result']-by[(g,'V4',f)]['x']['result'])
out['LV']={k:{'V5':round(st.mean(e['s']),4),'V5-A0':ci(e['d0']),'V5-V4':ci(e['d4']),'uses':dict(e['uses'])} for k,e in sorted(lv.items())}
js=json.dumps(out,ensure_ascii=False,indent=1);print(js)
if outp:open(outp[0],'w',encoding='utf-8').write(js+'\n')
