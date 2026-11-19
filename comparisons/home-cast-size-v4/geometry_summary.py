"""Validate raw measurements, retain individual residents, and produce same-seed comparisons."""
import argparse
from collections import Counter,defaultdict
import csv
import gzip
import io
from itertools import product
import json
from pathlib import Path
from statistics import median
import tarfile

from geometry_collect import HEIGHTS,REGIONS,read

BASE=Path(__file__).resolve().parent
NAMES=dict(zip(REGIONS,['もり','みずべ','とかい','おうち','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞらのていりゅうじょ','きおくのみずうみ']))
POLICIES=('current','A','B','C')
CURVES=('linear','step')
LAYOUTS=('fixed','optimized')
KEYS=('width','region','count','layout','curve','policy')
CONTROLS=tuple(range(18,29))
ALL_COUNT=tuple(range(19,29))
def pct(x,y):
    return round(100*x/y,4) if y else 0
def quantile(values,q):
    s=sorted(values)
    k=(len(s)-1)*q
    j=int(k)
    return round(s[j]+(s[min(j+1,len(s)-1)]-s[j])*(k-j),4)

def row(trajectory,phase,gain):
    paint=phase['gains'][gain]
    pairs,lost,distinct,total,shadow,gear,gear_error,foot_error=paint['scene']
    aa=phase['actors']; vals=paint['residents']
    assert len(aa)==len(vals)==len(paint['hitTargets'])
    assert all(0<=v[2]<=v[1] and v[3]==v[1]-v[2] and v[4]==t.count(i) for i,(v,t) in enumerate(zip(vals,paint['hitTargets'])))
    assert total==sum(v[1] for v in vals) and lost==sum(v[2] for v in vals) and 0<=distinct<=lost
    assert pairs<=len(aa)*(len(aa)-1)/2
    exp=[pct(v[3],v[1]) for v in vals]
    by_kind={role:[i for i,a in enumerate(aa) if a['kind']==role] for role in ('pet','partner','companion')}
    hero,=by_kind['pet'];partner,=by_kind['partner'];comp=by_kind['companion']
    assert len(comp)==len(aa)-2
    cexp=[exp[i] for i in comp]; c_hits=sum(vals[i][4] for i in comp)
    worst=min(comp,key=lambda i:exp[i])
    counts=Counter(v[4] for i,v in enumerate(vals) if i in comp)
    return dict(pairs=pairs,overlapPct=pct(lost,total),hiddenPx2=lost,distinctOverlapPx2=distinct,totalInkPx2=total,
        heroHeight=vals[hero][0],partnerHeight=vals[partner][0],compMedianHeight=median(vals[i][0] for i in comp),
        compMinHeight=min(vals[i][0] for i in comp),compMaxHeight=max(vals[i][0] for i in comp),
        heroVisible=exp[hero],partnerVisible=exp[partner],compMinVisible=min(cexp),compP10Visible=quantile(cexp,.1),
        compMedianVisible=median(cexp),compUnder50=sum(v<50 for v in cexp),compUnder90=sum(v<90 for v in cexp),
        compFullyHidden=sum(v==0 for v in cexp),compWorstKey=aa[worst]['key'],
        compMedianExposedInk=median(vals[i][3] for i in comp),compTotalExposedInk=sum(vals[i][3] for i in comp),
        compTotalInk=sum(vals[i][1] for i in comp),compZeroHits=counts[0],compOneHit=counts[1],
        compTwoHits=counts[2],compThreeHits=counts[3],compHitPct=pct(c_hits,len(comp)*3),
        heroHits=vals[hero][4],partnerHits=vals[partner][4],allHitPct=pct(sum(v[4] for v in vals),len(aa)*3),
        allZeroHits=sum(not v[4] for v in vals),clipped=sum(v[5] for v in vals),
        allHidden=sum(not v[3] for v in vals),shadowsMissing=shadow,gear=gear,gearError=gear_error,
        frameFootError=foot_error,chrome=trajectory['browser'],modelDistance=round(phase['modelStats']['distance'],4),
        modelMoves=phase['modelStats']['moves'])

def reasons(ref,cur,n):
    # V3 shape/hit criteria, without its independent drag metric.
    fail=[]
    hi=lambda k,rows:max(r[k] for r in rows)
    lo=lambda k,rows:min(r[k] for r in rows)
    for name,delta in [('clipped',0),('allHidden',0),('overlapPct',3),('pairs',max(2,n//8)),('allZeroHits',1)]:
        if hi(name,cur)>hi(name,ref)+delta+1e-5:fail.append(name)
    for name in ('heroVisible','partnerVisible'):
        if lo(name,cur)<min(85,lo(name,ref)-5)-1e-5:fail.append(name)
    if sum(r['allHitPct'] for r in cur)/3 < sum(r['allHitPct'] for r in ref)/3-5-1e-5:fail.append('allHitPct')
    return fail

def compact_json(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def save_csv(path,rows):
    with path.open('wb') as dst,gzip.GzipFile(fileobj=dst,mode='wb',mtime=0) as compressed,io.TextIOWrapper(compressed,encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)
def archive(path,files):
    with path.open('wb') as dst,gzip.GzipFile(fileobj=dst,mode='wb',mtime=0) as compressed,tarfile.open(fileobj=compressed,mode='w|') as tar:
        for name,src in sorted(files.items()):
            data=src.read_bytes()
            info=tarfile.TarInfo(name);info.size=len(data);info.mtime=0
            tar.addfile(info,io.BytesIO(data))

def aggregate(sampled):
    return dict(observations=len(sampled),heroHeight=median(r['heroHeight'] for r in sampled),
        partnerHeight=median(r['partnerHeight'] for r in sampled),compHeight=median(r['compMedianHeight'] for r in sampled),
        compMedianExposedInk=median(r['compMedianExposedInk'] for r in sampled),
        compP10OfSceneMin=quantile([r['compMinVisible'] for r in sampled],.1),
        compMinVisible=min(r['compMinVisible'] for r in sampled),partnerMinVisible=min(r['partnerVisible'] for r in sampled),
        heroMinVisible=min(r['heroVisible'] for r in sampled),overlapMedian=median(r['overlapPct'] for r in sampled),
        overlapMax=max(r['overlapPct'] for r in sampled),pairsMax=max(r['pairs'] for r in sampled),
        compHitPct=pct(sum(3*r['compThreeHits']+2*r['compTwoHits']+r['compOneHit'] for r in sampled),sum(3*(r['count']-2) for r in sampled)),
        compUnder50=sum(r['compUnder50'] for r in sampled),compFullyHidden=sum(r['compFullyHidden'] for r in sampled),
        compZeroHits=sum(r['compZeroHits'] for r in sampled),compObservations=sum(r['count']-2 for r in sampled))

def main(a):
    files={};raws={}
    for root in a.roots:
        for p in root.rglob('*.json.gz'):
            if p.parent.name not in LAYOUTS:continue
            d=read(p);f=d['fixture'];key=(f['width'],f['region'],f['count'],p.parent.name)
            if key in raws and raws[key]!=d:raise ValueError(f'Conflicting duplicate fixture {key}')
            raws[key]=d;files[p.parent.name+'/'+p.name]=p
    rows=[];diagnostics=[];obs={};ntraj=0;moving=[];equivalents=0;versions=Counter();layout_mismatch=[]
    fixed_inputs={}
    for (w,r,n,layout),d in sorted(raws.items()):
        if d['phaseSeconds']!=[0,8,30]:raise ValueError(f'Missing observation {w,r,n,layout}')
        for tr in d['trajectories']:
            ntraj+=1
            versions[tr['browser']]+=1
            if len(tr['phases'])!=3:raise ValueError('Need 0, 8 and 30 seconds')
            moving.append(tr['phases'][-1]['modelStats']['distance'])
            if layout=='optimized' and any(p is not None for p in tr['plan']):
                for t,phase in zip((0,8,30),tr['phases'],strict=True):
                    if '0' not in phase['gains']:continue
                    diagnostics.append(dict(width=w,region=r,count=n,layout='optimized-at-zero-diagnostic',
                        seconds=t,**row(tr,phase,'0')))
            for k in tr['conditions']:
                l,c,p=k.split('/')
                assert l==layout
                records=[]
                for t,phase in zip((0,8,30),tr['phases']):
                    assert abs(phase['modelStats']['clock']-t)<.001 and len(phase['actors'])==n
                    s=phase['settings'][c+'/'+p]
                    g=float(s[0])
                    factor=max(0,min(1,(w-320)/55));factor*=factor*(3-2*factor)
                    e={'current':0,'A':10,'B':15,'C':20}[p]*factor*(0 if n<=18 else 1 if c=='step' else (n-18)/10)
                    assert abs(g-e)<1e-8 and all(abs(x-base*(100+e)/100)<1e-6 for x,base in zip(s[1:],[120,120,105]))
                    values=dict(zip(KEYS,[w,r,n,l,c,p]),seconds=t,extra=round(g,8),heroScale=s[1],partnerScale=s[2],compScale=s[3],**row(tr,phase,s[0]))
                    records.append(values)
                obs[w,r,n,l,c,p]=records
        for name,ref in d['references'].items():
            l,c,p=name.split('/')
            axis=(w,r,n,'fixed',c,p)
            if axis not in obs:continue
            assert ref=='/'.join(axis[-3:])
            obs[w,r,n,l,c,p]=[dict(v,layout=l) for v in obs[axis]]
            equivalents+=1
    missing=['/'.join(map(str,k)) for k in product(HEIGHTS,REGIONS,CONTROLS,LAYOUTS,CURVES,POLICIES) if k not in obs]
    if missing and not a.partial:raise ValueError(f'{len(missing)} missing conditions; first {missing[:6]}')
    if not obs:raise ValueError('No valid geometry')
    for k in obs:
        base=obs.get((*k[:3],'fixed','linear','current'))
        if base and k[3]=='optimized' and any(r['chrome']!=s['chrome'] for r,s in zip(base,obs[k])):
            layout_mismatch.append(k)
    for k in sorted(obs):rows+=obs[k]
    dir=a.out;dir.mkdir(parents=True,exist_ok=True)
    save_csv(dir/'geometry-scenes.csv.gz',rows)
    archive(dir/'geometry-fixtures.tar.gz',files)
    if diagnostics:
        save_csv(dir/'geometry-layout-only.csv.gz',diagnostics)
    issues={}
    for (w,r,n,l,c,p),values in obs.items():
        ref=obs.get((w,r,n,'fixed','linear','current'))
        if ref:issues['/'.join(map(str,[w,r,n,l,c,p]))]=reasons(ref,values,n)
    clusters=defaultdict(list)
    for v in rows:
        if v['count'] not in ALL_COUNT:continue
        l,c,p,w,n,r=(v[k] for k in ('layout','curve','policy','width','count','region'))
        for prefix in ('all',f'w{w}',f'n{n}',f'r-{r}',f'{w}/{r}',f'{w}/n{n}'):
            clusters[f'{prefix}/{l}/{c}/{p}'].append(v)
    grouped={k:aggregate(v) for k,v in clusters.items()}
    def select(w,r,n,l,c,p,sec=0):
        v=obs.get((w,r,n,l,c,p))
        return v[{0:0,8:1,30:2}[sec]] if v else None
    def arrays(name,keys,eligible):
        values=[r for r in rows if eligible(r)]
        return {k:max(values,key=lambda r:r[k]) if k.startswith(('compUnder','compZero','overlap','pairs','clipped','gearError','frameFoot','shadowsMissing','allHidden'))
            else min(values,key=lambda r:r[k]) for k in keys} if values else {}
    summary={'sceneObservations':len(rows),'distinctNativeTrajectories':ntraj,'zeroDistanceAt30s':sum(x<=0 for x in moving),
        'minimumNativeDistanceAt30s':min(moving),'distinctBrowserVersions':dict(versions),'aliasConditions':equivalents,
        'missingConditionCount':len(missing),'missingConditions':missing,'chromePatchMismatch':layout_mismatch,
        'diagnosticZeroGainObservations':len(diagnostics),'rawFileCount':len(files),'caseCount':len(obs),'aggregate':grouped,'relativeShapeAndHitReasons':issues}
    summary['extremes']={p:arrays(p,['heroVisible','partnerVisible','compMinVisible','compHitPct','compUnder50','compZeroHits','overlapPct','pairs','clipped','allHidden','shadowsMissing','gearError','frameFootError'],
        lambda v: v['policy']==p and v['curve']=='linear' and v['layout']=='optimized' and v['count']>=19) for p in POLICIES}
    compact_json(dir/'geometry-summary.json',summary)
    if a.compact:
        a.compact.parent.mkdir(parents=True,exist_ok=True)
        compact=[]
        for dimension,levels in [('width',list(HEIGHTS)),('count',list(ALL_COUNT)),('region',list(REGIONS))]:
            for value in levels:
                for l,c,p in product(LAYOUTS,CURVES,POLICIES):
                    group={'width':'w','count':'n','region':'r-'}[dimension]+str(value)
                    d=grouped.get(f'{group}/{l}/{c}/{p}')
                    if d:compact.append(dict(dimension=dimension,value=value,layout=l,curve=c,policy=p,**d))
        with a.compact.open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=compact[0]);writer.writeheader();writer.writerows(compact)
    report(a.report,summary,obs,rows)
    print(f'{len(files)} raw files, {ntraj} native trajectory groups, {len(obs)} conditions, {len(rows)} observations; {len(missing)} missing.')

def report(path,summary,obs,rows):
    grouped=summary['aggregate']
    def table(header):return ['| '+' | '.join(header)+' |','|'+'|'.join(['---']*len(header))+'|']
    out=['# 住民数に応じた拡大と実際の見え方','',
      f'実際のホームで {summary["distinctNativeTrajectories"]:,} 種類の開始状態を測った。幅・地域・人数・配置・増やし方・候補の組み合わせは {summary["caseCount"]:,} 件、開始時・8秒後・30秒後を合わせて {summary["sceneObservations"]:,} 場面。欠測は {summary["missingConditionCount"]:,} 条件。'+
      '主人公は成犬、恋人はもりのクマさん、時刻は昼、乱数シードは214。各住民の元画像・反転・描画順・実際の画像枠を各候補の倍率で取得した。','',
      '全6端末幅は320×568、348×692、360×746、375×812、390×844、430×932 CSS px。下段操作欄の52pxを除いたホームの高さは516、640、694、760、792、880px。DPRは2。18体は境界の対照、19～28体は10通りすべて実人数で読み込んだ。','',
      '同じ住民・同じ足元・同じ奥行きのまま実際の倍率を切り替え、各段階で座標と当たり判定寸法の一致を検査した。最適配置で開始位置の候補が変わる場合は独立にホームを開いた。全員の配置候補が同一の条件は同じネイティブ軌跡を共有する。解決後の初期座標・足元・装備・影・各人の試験結果は生記録に収録した。','',
      '本体はアルファ96/255以上で、前景と画面の切り取りを反映する。2人の本体が4 CSS画素以上同じ位置を占める場合に1組と数えた。重なり率は隠れた住民画素の延べ面積／本体面積総和。見切れは1 CSS pxを超える本体のはみ出し。仲間の可視率は個々の本体のうち他の住民に覆われず残った面積。表の「最小」は最も隠れた1人で、平均ではない。','',
      'タップは各人の不透明な3点（原画アルファ200/255以上）を画面へ投影し、その場のelementFromPointと正式なホームのhit関数で本人に解決した数。実際の指の操作、画面を見て狙う難しさ、および端末の発熱はこの測定の範囲外。','',
      '## 19～28体の全地域・全幅を合わせた値','',
      '高さは各場面のCSS pxの中央値。仲間の高さは先に場面内で中央値を取り、その後各場面の中央値を求めた。仲間タップは全仲間・全時点の比率。50%未満は同じ住民を別時点では別に数える。','',
      *table(['配置・増やし方・候補','主人公／恋人／仲間の高さ','仲間の可視面積中央値 px²¹','最大重なり率','最低の恋人／仲間可視率','仲間タップ','50%未満の仲間／全仲間観測数'])]
    for l in LAYOUTS:
        for c in CURVES:
            for p in POLICIES:
                d=grouped.get(f'all/{l}/{c}/{p}')
                if not d:continue
                name=('固定' if l=='fixed' else '最適')+'・'+('段階' if c=='step' else '線形')+'・'+p
                out.append(f'| {name} | {d["heroHeight"]:g}／{d["partnerHeight"]:g}／{d["compHeight"]:g} | {d["compMedianExposedInk"]:g} | {d["overlapMax"]:.2f}% | {d["partnerMinVisible"]:.1f}／{d["compMinVisible"]:.1f}% | {d["compHitPct"]:.2f}% | {d["compUnder50"]:,}／{d["compObservations"]:,} |')
    out+=['','¹ 先に場面内で仲間1体ずつの露出面積の中央値を取り、その後、全場面の中央値を求めた。','',
      '## 地域別のBとC','',
      '線形・最適配置、19～28体、375・390・430pxを合算。仲間タップ・重なりの上限・最も見えにくかった仲間を並べた。幅別・段階式・固定配置の全値は集計ファイルにある。','',
      *table(['地域','B 仲間タップ','C 仲間タップ','B／C 最大重なり率','B／C 仲間の最低可視率','B／C 仲間の可視面積中央値 px²¹'])]
    for region in REGIONS:
        bcs=[]
        for p in ('B','C'):
            select=[r for r in rows if r['region']==region and r['width']>=375 and r['layout']=='optimized' and r['curve']=='linear' and r['policy']==p and r['count']>=19]
            if select:bcs.append(aggregate(select))
        if len(bcs)!=2:continue
        b,c=bcs
        out.append(f'| {NAMES[region]} | {b["compHitPct"]:.2f}% | {c["compHitPct"]:.2f}% | {b["overlapMax"]:.2f}／{c["overlapMax"]:.2f}% | {b["compMinVisible"]:.1f}／{c["compMinVisible"]:.1f}% | {b["compMedianExposedInk"]:g}／{c["compMedianExposedInk"]:g} |')
    out+=['','## 固定配置の現行に対する変化','',
      '同じ人数・地域・端末幅の固定配置＋0%と、各条件の3時点で比較した。V3で使った相対目安のうち、この表は輪郭と本人タップだけを扱う。増えないほうがよい指標は見切れと完全消失。重なり面積の上限は基準＋3ポイント、組数は＋max(2,人数÷8の整数部)。主人公・恋人の露出は85%と「現行の最低−5ポイント」の低い方が下限。本人タップは3時点の平均で低下5ポイントまで、3点とも通らない住民は現行から1人増まで。','',
      *table(['条件（19～28体、全幅・全地域）','対象数','輪郭・タップの相対目安超過','見切れ／消失増','面積／組数超過','主人公／恋人の露出低下','本人タップ率低下／全滅人数増'])]
    issue=summary['relativeShapeAndHitReasons']
    for l,c,p in product(LAYOUTS,CURVES,('A','B','C')):
        relevant=[why for key,why in issue.items() if key.split('/')[3:]==[l,c,p] and int(key.split('/')[2])>=19]
        if not relevant:continue
        totals=Counter(k for v in relevant for k in v)
        name=('固定' if l=='fixed' else '最適')+'・'+('線形' if c=='linear' else '段階')+'・'+p
        out.append(f'| {name} | {len(relevant)} | {sum(bool(x) for x in relevant)} | {totals["clipped"]}／{totals["allHidden"]} | {totals["overlapPct"]}／{totals["pairs"]} | {totals["heroVisible"]}／{totals["partnerVisible"]} | {totals["allHitPct"]}／{totals["allZeroHits"]} |')
    out+=['','## 人数による変化','',
      '375px・もり・固定配置・開始時。現行も合わせて読むと、1体増えたことによる元のカメラと奥行きの差と、表示中の同じ足元への倍率差を区別できる。各セルは主人公／恋人／仲間中央値の本体高（CSS px）。','',
      *table(['人数','現行','段階 B','線形 A','線形 B','線形 C','線形Bの倍率加算'])]
    for n in CONTROLS:
        samples=[obs.get((375,'forest',n,'fixed',c,p)) for c,p in [('linear','current'),('step','B'),('linear','A'),('linear','B'),('linear','C')]]
        if any(s is None for s in samples):continue
        vals=[s[0] for s in samples]
        sizes=[f'{v["heroHeight"]}／{v["partnerHeight"]}／{v["compMedianHeight"]:g}' for v in vals]
        out+=['| '+' | '.join([str(n),*sizes,f'{vals[3]["extra"]:g}%'])+' |']
    out+=['','## 19体の境界と28体の上端','',
      '375・390・430px、13地域の固定配置。18→19の高さ差は同じ地域・同じ幅・同じ観測時点での差の中央値。入力上の倍率が同じでも、実際の人数によるカメラ・奥行きの影響が差に含まれる。右端は19体の同じ姿勢で段階式から線形式に変えた差。','',
      *table(['候補','18→19 線形の高さ差 主／恋／仲','18→19 段階の高さ差 主／恋／仲','19体で線形−段階 主／恋／仲'])]
    for policy in POLICIES:
        change=[[],[],[]]
        for w,r in product((375,390,430),REGIONS):
            rows18=obs.get((w,r,18,'fixed','linear','current'))
            linear=obs.get((w,r,19,'fixed','linear',policy));step=obs.get((w,r,19,'fixed','step',policy))
            if not rows18 or not linear or not step:continue
            for a,b,c in zip(rows18,linear,step):
                for j,(large,small) in enumerate(((b,a),(c,a),(b,c))):
                    change[j].append([large[k]-small[k] for k in ('heroHeight','partnerHeight','compMedianHeight')])
        if change[0]:
            values=['／'.join(f'{median(xs):+g}' for xs in zip(*cs)) for cs in change]
            out.append('| '+' | '.join([policy,*values])+' |')
    out+=['','28体では各方式の倍率が一致する。同一の最適配置・同一の時点におけるCのBに対する差を、375・390・430pxの全13地域で集計した。','',
      *table(['人数','比較場面数','C−B 主／恋／仲の高さ中央値','C−B 仲間の可視面積中央値 px²','Cで増えた／同じ／減った仲間の最低可視率¹','仲間のタップ3点全滅が増えた場面'])]
    for n in ALL_COUNT:
        pairs=[]
        for w,r in product((375,390,430),REGIONS):
            b=obs.get((w,r,n,'optimized','linear','B'));c=obs.get((w,r,n,'optimized','linear','C'))
            if b and c:pairs.extend(zip(b,c))
        if not pairs:continue
        dif=lambda k:[c[k]-b[k] for b,c in pairs]
        hs='／'.join(f'{median(dif(k)):+g}' for k in ('heroHeight','partnerHeight','compMedianHeight'))
        dn=dif('compMinVisible')
        out.append(f'| {n} | {len(pairs)} | {hs} | {median(dif("compMedianExposedInk")):+g} | {sum(x>0 for x in dn)}／{sum(x==0 for x in dn)}／{sum(x<0 for x in dn)} | {sum(x>0 for x in dif("compZeroHits"))} |')
    out+=['','¹ 場面ごとに最も隠れた仲間1体の露出割合を比較。同じ場面のBとCの間で、最も隠れる住民が入れ替わる場合もある。','',
      '## 足元・装備・自律移動','']
    if rows:
        distance=summary['minimumNativeDistanceAt30s']
        out+=[f'全観測で影の欠落は最大{max(r["shadowsMissing"] for r in rows)}体。倍率を足元に掛けた場合の期待位置と実表示との差は、装備矩形が最大{max(r["gearError"] for r in rows):.4f}、本体の画像枠が最大{max(r["frameFootError"] for r in rows):.4f} CSS px。30秒までの移動距離は累計で最小{distance:.3f} native px、移動距離0の開始状態は{summary["zeroDistanceAt30s"]}件。各時点はV5の通常の自律ステップを0.1秒ずつ進めて測定した。実時間のフレーム間隔は性能測定を参照。','']
    out+=['[全場面の集計CSV](evidence/geometry-scenes.csv.gz) ／ [個別の仲間・解決先・自律移動・足元を含むブラウザー記録](evidence/geometry-fixtures.tar.gz) ／ [地域・人数・幅別の数値とV3相対基準の該当理由](evidence/geometry-summary.json)','']
    if summary['diagnosticZeroGainObservations']:
        out += [f'最適配置に切り替えた足元を保ち、拡大だけを0に戻した診断を{summary["diagnosticZeroGainObservations"]:,}場面で追加した。正式な現行設定はV2配置に戻る。この診断と固定の現行設定を比較すると、配置だけの効果が分かる。 [配置だけ変えた診断](evidence/geometry-layout-only.csv.gz)','']
    content='\n'.join(out)
    for name in ('geometry-scenes.csv.gz','geometry-fixtures.tar.gz','geometry-summary.json','geometry-layout-only.csv.gz'):
        content=content.replace('](evidence/'+name+')','](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4/'+name+')')
    path.write_text(content)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('roots',nargs='+',type=Path);p.add_argument('--out',type=Path,default=BASE/'evidence');p.add_argument('--report',type=Path,default=BASE/'GEOMETRY.md');p.add_argument('--compact',type=Path,help='Optional small, human-readable subgroup CSV for the repository');p.add_argument('--partial',action='store_true')
    main(p.parse_args())
