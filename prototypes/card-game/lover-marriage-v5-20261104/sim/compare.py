# V5 の案の比較。V4 の結果（同じ seed・同じ組）と V5 の結果を合わせ、組ごとに対にして差を出す。
# 使い方: python3 sim/compare.py <V4 results.jsonl.gz> <V5 results...jsonl(.gz)> [out.json]
import json,gzip,sys,collections as C,statistics as st,math
def load(p):
    f=gzip.open(p,'rt') if p.endswith('.gz') else open(p)
    return [json.loads(l) for l in f]
args=[a for a in sys.argv[1:] if not a.endswith('.json')]
outp=[a for a in sys.argv[1:] if a.endswith('.json')]
R=[r for p in args for r in load(p)]
by={}
for r in R:by[(r['group'],r['arm'],r['first'])]=r
def ci(x):
    if not x:return None
    m=st.mean(x);se=st.pstdev(x)/math.sqrt(len(x)) if len(x)>1 else 0
    return [round(m,4),round(m-1.96*se,4),round(m+1.96*se,4),len(x)]
def side(r,deck):
    return r['x'] if r['X']==deck else r['y']
def focus(set_,deck,arms,ref='A0'):
    groups=sorted({k[0] for k in by if k[0].startswith(set_+':') and deck in k[0].split(':')[1:3]})
    res={}
    for arm in arms:
        rows=[(by.get((g,arm,f)),by.get((g,ref,f))) for g in groups for f in 'XY']
        rows=[(a,b) for a,b in rows if a and b]
        if not rows:continue
        S=[side(a,deck) for a,_ in rows];O=[(a['y'] if a['X']==deck else a['x']) for a,_ in rows]
        uses=C.Counter(c for s in S for c in s.get('loverUse',s['v4']))
        per=C.defaultdict(list)
        for a,b in rows:per[(a['Y'] if a['X']==deck else a['X'])].append(side(a,deck)['result']-side(b,deck)['result'])
        res[arm]={'score':round(st.mean(s['result'] for s in S),4),'diff_vs_'+ref:ci([side(a,deck)['result']-side(b,deck)['result'] for a,b in rows]),
          'growth':round(st.mean(s['growth'] for s in S),2),'oppGrowth':round(st.mean(o['growth'] for o in O),2),
          'married':round(sum(bool(s['married']) for s in S)/len(S),3),'marriedRound':round(st.mean([s['marriedRound'] for s in S if s['marriedRound']] or [0]),2),
          'v4PerGame':round(sum(len(s['v4']) for s in S)/len(S),3),'uses':dict(uses),'oppV4PerGame':round(sum(len(o['v4']) for o in O)/len(O),3),
          'first':round(st.mean(s['result'] for s in S if s['first']),4),'second':round(st.mean(s['result'] for s in S if not s['first']),4),
          'byOpp':{k:round(st.mean(v),3) for k,v in sorted(per.items())},'abnormal':sum(a['status']!='completed' for a,_ in rows),
          'replay':dict(C.Counter(a['replay'] for a,_ in rows)),'maxHand':max(s['hand'] for s in S)}
    return res
spec=json.loads(open(outp[0]).read()) if outp and False else None
out={}
out['gorilla']=focus('RR','challenge',['V4','Gnone','Gv2b','Gv3n','Gg4'])
out['gorilla_vsV4']={a:ci([side(by[(g,a,f)],'challenge')['result']-side(by[(g,'V4',f)],'challenge')['result'] for (g,arm,f) in by if arm==a and g.startswith('RR:') and 'challenge' in g.split(':')[1:3] and (g,'V4',f) in by]) for a in ['Gnone','Gv2b','Gv3n','Gg4']}
out['snow']=focus('RR','main',['V4','Snone','Sdraw','Sb'])
out['snow_vsV4']={a:ci([side(by[(g,a,f)],'main')['result']-side(by[(g,'V4',f)],'main')['result'] for (g,arm,f) in by if arm==a and g.startswith('RR:') and 'main' in g.split(':')[1:3] and (g,'V4',f) in by]) for a in ['Snone','Sdraw','Sb']}
D='partner/P-oasis_cactus'
out['cactus']=focus('LV',D,['V4','Cnone','Cb','Cc3'])
out['cactus_vsV4']={a:ci([side(by[(g,a,f)],D)['result']-side(by[(g,'V4',f)],D)['result'] for (g,arm,f) in by if arm==a and g.startswith('LV:'+D) and (g,'V4',f) in by]) for a in ['Cnone','Cb','Cc3']}
for deck,arm in [('item','Ktop'),('item','Xspider'),('partner','Xeagle'),('partner','Xdeer')]:
    out[arm]=focus('RR',deck,[arm,'V4'])
    out[arm+'_vsV4']=ci([side(by[(g,arm,f)],deck)['result']-side(by[(g,'V4',f)],deck)['result'] for (g,a,f) in by if a==arm and deck in g.split(':')[1:3] and (g,'V4',f) in by])
js=json.dumps(out,ensure_ascii=False,indent=1);print(js)
if outp:open(outp[0],'w',encoding='utf-8').write(js+'\n')
