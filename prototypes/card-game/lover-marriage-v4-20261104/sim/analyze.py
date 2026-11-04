# VERSION 4 対戦比較の集計。使い方: python3 sim/analyze.py <results.jsonl.gz> [summary.json]
import json,gzip,sys,collections,statistics as st,math
R=[json.loads(l) for l in gzip.open(sys.argv[1],'rt')]
out={}
def ci(x):
    if not x:return [None,None,None]
    m=st.mean(x);se=(st.pstdev(x)/math.sqrt(len(x))) if len(x)>1 else 0;return [round(m,4),round(m-1.96*se,4),round(m+1.96*se,4)]
out['games']=len(R);out['abnormal']=sum(r['status']!='completed' for r in R);out['replay']=dict(collections.Counter(r['replay'] for r in R))
key=lambda r:(r['group'],r['first'])
by={}
for r in R:by.setdefault(r['set'],{}).setdefault(r['arm'],{})[key(r)]=r
# 各試合から（デッキ, そのデッキ側の行）を取り出す
def sides(r):return [(r['X'],r['x']),(r['Y'],r['y'])]
# RR：7デッキの得点率
rr=by.get('RR',{});decks=sorted({d for r in rr.get('A0',{}).values() for d,_ in sides(r)})
tab={}
for arm in ['A0','V4']:
    for d in decks:
        xs=[s['result'] for r in rr[arm].values() for dd,s in sides(r) if dd==d];tab.setdefault(d,{})[arm]=round(st.mean(xs),4)
for d in decks:
    diffs=[sum(s['result'] for dd,s in sides(rr['V4'][k]) if dd==d)-sum(s['result'] for dd,s in sides(rr['A0'][k]) if dd==d) for k in rr['A0'] if d in (rr['A0'][k]['X'],rr['A0'][k]['Y'])]
    tab[d]['diff']=ci(diffs);tab[d]['n']=len(diffs)
out['RR']={'decks':tab,'width':{arm:round(max(tab[d][arm] for d in decks)-min(tab[d][arm] for d in decks),4) for arm in ['A0','V4']}}
def seatsOf(arm_rows,deck):return [(s,r) for r in arm_rows.values() for d,s in sides(r) if d==deck]
for arm in ['A0','V4']:
    S=seatsOf(rr[arm],'partner')
    out['RR'][arm+'_partner']={'first':round(st.mean(s['result'] for s,_ in S if s['first']),4),'second':round(st.mean(s['result'] for s,_ in S if not s['first']),4),
     'marriedRate':round(sum(1 for s,_ in S if s['married'])/len(S),4),'marriedRound':round(st.mean(s['marriedRound'] for s,_ in S if s['marriedRound']),3),
     'v4PerGame':round(sum(len(s['v4']) for s,_ in S)/len(S),3),'v4ByCard':dict(collections.Counter(c for s,_ in S for c in s['v4'])),'maxHand':max(s['hand'] for s,_ in S),'growth':round(st.mean(s['growth'] for s,_ in S),2)}
    allS=[(d,s) for r in rr[arm].values() for d,s in sides(r)]
    out['RR'][arm+'_all']={'first':round(st.mean(s['result'] for d,s in allS if s['first']),4),'maxHand':max(s['hand'] for d,s in allS),'hand15':sum(s['hand']>=15 for d,s in allS),'deckOut':sum(s['deck']==0 for d,s in allS)}
# LV：恋人ごと
lv=by.get('LV',{});per={}
for k,r in lv.get('A0',{}).items():
    lover=r['X'].split('/')[1];v=lv['V4'][k]
    e=per.setdefault(lover,{'a0':[],'v4':[],'d':[],'v4n':0,'married':0,'n':0,'mr':[]})
    e['a0'].append(r['x']['result']);e['v4'].append(v['x']['result']);e['d'].append(v['x']['result']-r['x']['result']);e['v4n']+=len(v['x']['v4']);e['married']+=bool(v['x']['married']);e['n']+=1
    if v['x']['marriedRound']:e['mr'].append(v['x']['marriedRound'])
out['LV']={l:{'A0':round(st.mean(e['a0']),4),'V4':round(st.mean(e['v4']),4),'diff':ci(e['d']),'n':e['n'],'v4PerGame':round(e['v4n']/e['n'],3),'marriedRate':round(e['married']/e['n'],3),'marriedRound':round(st.mean(e['mr']),2) if e['mr'] else None} for l,e in sorted(per.items())}
# SX：すれちがい入りの相手
sx=by.get('SX',{});out['SX']={}
for arm in ['A0','V4','V4cpu0']:
    if arm not in sx:continue
    xs=[r['x'] for r in sx[arm].values()];ys=[r['y'] for r in sx[arm].values()]
    br=[b for s in xs for b in s['breakups']];yb=[b for s in ys for b in s['breakups']]
    out['SX'][arm]={'score':round(st.mean(s['result'] for s in xs),4),'growth':round(st.mean(s['growth'] for s in xs),2),'marriedRate':round(sum(bool(s['married']) for s in xs)/len(xs),3),
     'breakupsPerGame':round(len(br)/len(xs),3),'byStage':dict(sorted(collections.Counter(b['stage'] for b in br).items())),'divorces':sum(b['stage']==4 for b in br),
     'oppBreakupsPerGame':round(len(yb)/len(ys),3),'v4PerGame':round(sum(len(s['v4']) for s in xs)/len(xs),3)}
for a,b in [('V4','A0'),('V4cpu0','A0'),('V4','V4cpu0')]:
    if a in sx and b in sx:out['SX'][a+'-'+b]=ci([sx[a][k]['x']['result']-sx[b][k]['x']['result'] for k in sx[b]])
js=json.dumps(out,ensure_ascii=False,indent=1);print(js)
if len(sys.argv)>2:open(sys.argv[2],'w',encoding='utf-8').write(js+'\n')
