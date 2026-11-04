# 最終検証の集計：シカの先攻・後攻差、公式7デッキにない恋人12種類、せいれいの CPU 評価の修正。
# 使い方: python3 sim/final_check.py <V4 results.jsonl.gz> <V5 final.jsonl.gz> <fv.jsonl.gz> <rc.jsonl.gz> [out.json]
import json,gzip,sys,collections as C,statistics as st,math
ld=lambda p:[json.loads(l) for l in (gzip.open(p,'rt') if p.endswith('.gz') else open(p))]
args=[a for a in sys.argv[1:] if not a.endswith('.json')];outp=[a for a in sys.argv[1:] if a.endswith('.json')]
R=[r for p in args for r in ld(p)];by={(r['group'],r['arm'],r['first']):r for r in R}
def ci(x):
    if not x:return None
    m=st.mean(x);se=st.pstdev(x)/math.sqrt(len(x)) if len(x)>1 else 0;return [round(m,4),round(m-1.96*se,4),round(m+1.96*se,4),len(x)]
side=lambda r,d:r['x'] if r['X']==d else r['y']
opp=lambda r,d:r['y'] if r['X']==d else r['x']
first_of=lambda r,d:(r['first']=='X')==(r['X']==d)  # d が先攻か
out={}
# ---- 1. シカ：恋人デッキ（RR、30群×6相手×先後） ----
D='partner';groups=sorted({g for (g,a,f) in by if g.startswith('RR:') and D in g.split(':')[1:3] and a=='V5off-grove_deer'})
deer={}
for arm in ['A0','V5','V5off-grove_deer']:
    gaps=[];S=[];ok=[g for g in groups if (g,arm,'X') in by and (g,arm,'Y') in by]
    for g in ok:
        rs=[by[(g,arm,f)] for f in 'XY'];fr=[side(r,D)['result'] for r in rs if first_of(r,D)][0];sr=[side(r,D)['result'] for r in rs if not first_of(r,D)][0]
        gaps.append(fr-sr);S+= [side(r,D) for r in rs]
    deer[arm]={'groups':len(ok),'score':round(st.mean(s['result'] for s in S),4),'first':round(st.mean(s['result'] for s in S if s['first']),4),'second':round(st.mean(s['result'] for s in S if not s['first']),4),
     'seatGap':ci(gaps),'married':round(sum(bool(s['married']) for s in S)/len(S),3),'marriedRound':round(st.mean([s['marriedRound'] for s in S if s['marriedRound']]),2),
     'deerV4UsesPerGame':round(sum(c=='P-grove_deer' for s in S for c in s.get('loverUse',s['v4']))/len(S),3),
     'deerFirst':round(sum(c=='P-grove_deer' for s in S if s['first'] for c in s.get('loverUse',s['v4']))/max(1,sum(1 for s in S if s['first'])),3),
     'deerSecond':round(sum(c=='P-grove_deer' for s in S if not s['first'] for c in s.get('loverUse',s['v4']))/max(1,sum(1 for s in S if not s['first'])),3)}
def pairdiff(a,b,key):
    xs=[]
    for g in groups:
        if all((g,arm,f) in by for arm in (a,b) for f in 'XY'):
            if key=='score':xs.append(st.mean(side(by[(g,a,f)],D)['result'] for f in 'XY')-st.mean(side(by[(g,b,f)],D)['result'] for f in 'XY'))
            else:
                gap=lambda arm:sum((1 if first_of(by[(g,arm,f)],D) else -1)*side(by[(g,arm,f)],D)['result'] for f in 'XY')
                xs.append(gap(a)-gap(b))
    return ci(xs)
deer['V5-off_score']=pairdiff('V5','V5off-grove_deer','score');deer['V5-off_seatGap']=pairdiff('V5','V5off-grove_deer','gap')
deer['V5-A0_seatGap']=pairdiff('V5','A0','gap');deer['V5-A0_score']=pairdiff('V5','A0','score')
out['deer']=deer
# ---- 2. 公式7デッキにない恋人12種類（恋人デッキのシカ3枚を入れ替え、6相手×6群×先後） ----
lv={}
for (g,a,f),r in by.items():
    if not g.startswith('LV:') or a!='V5':continue
    lover=r['X'].split('/')[1];off='V5off-'+lover[2:]
    if (g,off,f) not in by:continue
    o=by[(g,off,f)];e=lv.setdefault(lover,{'v5':[],'off':[],'d':[],'S':[],'O':[],'a0':[],'byOpp':C.defaultdict(list)})
    e['v5'].append(r['x']['result']);e['off'].append(o['x']['result']);e['d'].append(r['x']['result']-o['x']['result']);e['S'].append(r['x']);e['O'].append(o['x'])
    e['byOpp'][r['Y']].append(r['x']['result']-o['x']['result'])
    if (g,'A0',f) in by:e['a0'].append(by[(g,'A0',f)]['x']['result'])
L12={}
for lover,e in sorted(lv.items()):
    S=e['S'];n=len(S);mine=lambda s:[c for c in s['loverUse'] if c.startswith(lover)]
    L12[lover]={'n':n,'V5':round(st.mean(e['v5']),4),'V5off':round(st.mean(e['off']),4),'V5-off':ci(e['d']),'A0_g1to4':round(st.mean(e['a0']),4) if e['a0'] else None,
     'first':round(st.mean(s['result'] for s in S if s['first']),4),'second':round(st.mean(s['result'] for s in S if not s['first']),4),
     'married':round(sum(bool(s['married']) for s in S)/n,3),'marriedRound':round(st.mean([s['marriedRound'] for s in S if s['marriedRound']] or [0]),2),
     'marriedAbilityUsesPerGame':round(sum(sum(1 for c in mine(s) if not c.endswith('*')) for s in S)/n,3),
     'loverUsesWhileMarriedPerGame':round(sum(len(mine(s)) for s in S)/n,3),
     'gamesWithMarriedUse':round(sum(1 for s in S if any(not c.endswith('*') for c in mine(s)))/n,3),
     'maxHand':max(s['hand'] for s in S),'maxHandOff':max(s['hand'] for s in e['O']),'perTurnMax':max(s.get('perTurnMax',0) for s in S),
     'byOpp':{k:round(st.mean(v),3) for k,v in sorted(e['byOpp'].items())}}
out['L12']=L12
fv=[r for r in R if r['arm'] in ('V5',) or r['arm'].startswith('V5off')]
out['fv_integrity']={'games':len(fv),'abnormal':sum(r['status']!='completed' for r in fv),'replay':dict(C.Counter(r['replay'] for r in fv)),'maxHand':max(max(r['x']['hand'],r['y']['hand']) for r in fv),
 'deckOut':sum(r['x']['deck']==0 or r['y']['deck']==0 for r in fv),'perTurnMax':max(max(r['x'].get('perTurnMax',0),r['y'].get('perTurnMax',0)) for r in fv)}
# ---- 3. せいれいの CPU 評価の修正（V5c）と、直す前（V5） ----
decks=['main','companion','partner','challenge','growth','item','balance'];rg=sorted({g for (g,a,f) in by if g.startswith('RR:') and a=='V5c'})
if rg:
    rc={}
    for d in decks:
        sc=lambda arm:[side(by[(g,arm,f)],d)['result'] for g in rg for f in 'XY' if d in g.split(':')[1:3]]
        diff=[sum(s['result'] for dd,s in [(by[(g,'V5c',f)]['X'],by[(g,'V5c',f)]['x']),(by[(g,'V5c',f)]['Y'],by[(g,'V5c',f)]['y'])] if dd==d)-sum(s['result'] for dd,s in [(by[(g,'V5',f)]['X'],by[(g,'V5',f)]['x']),(by[(g,'V5',f)]['Y'],by[(g,'V5',f)]['y'])] if dd==d) for g in rg for f in 'XY' if d in g.split(':')[1:3]]
        S=[side(by[(g,'V5c',f)],d) for g in rg for f in 'XY' if d in g.split(':')[1:3]]
        rc[d]={'V5':round(st.mean(sc('V5')),4),'V5c':round(st.mean(sc('V5c')),4),'V5c-V5':ci(diff),'first':round(st.mean(s['result'] for s in S if s['first']),4),'second':round(st.mean(s['result'] for s in S if not s['first']),4),
               'married':round(sum(bool(s['married']) for s in S)/len(S),3),'marriedRound':round(st.mean([s['marriedRound'] for s in S if s['marriedRound']]),2)}
    out['cpuFix']={'decks':rc,'width':{a:round(max(rc[d][a] for d in decks)-min(rc[d][a] for d in decks),4) for a in ['V5','V5c']},
      'games':sum(1 for (g,a,f) in by if a=='V5c'),'abnormal':sum(1 for (g,a,f),r in by.items() if a=='V5c' and r['status']!='completed'),
      'replay':dict(C.Counter(r['replay'] for (g,a,f),r in by.items() if a=='V5c'))}
js=json.dumps(out,ensure_ascii=False,indent=1);print(js)
if outp:open(outp[0],'w',encoding='utf-8').write(js+'\n')
