"""Validate raw measurements, retain individual residents, and produce same-seed comparisons."""
import argparse
from collections import Counter,defaultdict
import csv
import gzip
import hashlib
import io
from itertools import product
import json
import math
from pathlib import Path
from statistics import median
import tarfile

from geometry_collect import HEIGHTS,REGIONS,read
import geometry_transitions

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
        compHiddenKeys='|'.join(aa[i]['key'] for i in comp if not vals[i][3]),
        compNoHitKeys='|'.join(aa[i]['key'] for i in comp if not vals[i][4]),
        compUnderHalfKeys='|'.join(aa[i]['key'] for i in comp if exp[i]<50),
        compMedianExposedInk=median(vals[i][3] for i in comp),compTotalExposedInk=sum(vals[i][3] for i in comp),
        compTotalInk=sum(vals[i][1] for i in comp),compZeroHits=counts[0],compOneHit=counts[1],
        compTwoHits=counts[2],compThreeHits=counts[3],compHitPct=pct(c_hits,len(comp)*3),
        heroHits=vals[hero][4],partnerHits=vals[partner][4],allHitPct=pct(sum(v[4] for v in vals),len(aa)*3),
        allZeroHits=sum(not v[4] for v in vals),clipped=sum(v[5] for v in vals),
        allHidden=sum(not v[3] for v in vals),shadowsMissing=shadow,gear=gear,gearError=gear_error,
        frameFootError=foot_error,chrome=trajectory['browser'],modelDistance=round(phase['modelStats']['distance'],4),
        modelMoves=phase['modelStats']['moves'])

def individual_distributions(raws):
    # Bin resident exposure to 0.01 percentage point and exposed area to 1 CSS pixel.
    # Each companion at each phase has one vote, including fully hidden residents.
    rankings=defaultdict(lambda:(Counter(),Counter()))
    for (w,r,n,layout),d in raws.items():
        if n<19:continue
        for curve,policy in product(CURVES,POLICIES):
            condition='/'.join((layout,curve,policy))
            source=d
            if condition in d['references']:
                condition=d['references'][condition]
                source=raws.get((w,r,n,'fixed'))
            if not source:continue
            tr=next((t for t in source['trajectories'] if condition in t['conditions']),None)
            if not tr:continue
            visibility=Counter();area=Counter()
            for phase in tr['phases']:
                gain=phase['settings'][curve+'/'+policy][0]
                for a,v in zip(phase['actors'],phase['gains'][gain]['residents'],strict=True):
                    if a['kind']!='companion':continue
                    visibility[round(10000*v[3]/v[1]) if v[1] else 0]+=1
                    area[v[3]]+=1
            for group in ['all',str(w)]+(['375-430'] if w>=375 else []):
                visible_hist,area_hist=rankings['/'.join((group,layout,curve,policy))]
                visible_hist.update(visibility);area_hist.update(area)
    def nearest(hist,q):
        target=max(1,math.ceil(sum(hist.values())*q))
        accum=0
        for x,v in sorted(hist.items()):
            accum+=v
            if accum>=target:return x
    return {k:{'companionPhaseObservations':sum(v.values()),
               'visiblePercentP01P10P50P90':[nearest(v,q)/100 for q in (.01,.10,.50,.90)],
               'exposedInkCssPx2P01P10P50P90':[nearest(a,q) for q in (.01,.10,.50,.90)]}
            for k,(v,a) in rankings.items()}

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

def seating_effects(obs,diagnostics):
    # Each diagnostic row is the extra 0% paint of a genuine optimized trajectory.
    # The controls use the native fixed opening at the same region/count/size and phase.
    bucket=defaultdict(list)
    for d in diagnostics:
        axes=(d['width'],d['region'],d['count'])
        index=(0,8,30).index(d['seconds'])
        for curve,policy in [('linear','current'),('linear','A'),('linear','B'),('linear','C'),('step','B'),('step','C')]:
            fix=obs.get((*axes,'fixed',curve,policy))
            live=obs.get((*axes,'optimized',curve,policy))
            if not fix or not live:continue
            base=fix[index];optimized=d if policy=='current' else live[index]
            if base['chrome']!=optimized['chrome']:continue
            hits=lambda r:3*r['compThreeHits']+2*r['compTwoHits']+r['compOneHit']
            bucket[(curve,policy,d['seconds'])].append((optimized['compMinVisible']-base['compMinVisible'],
                optimized['overlapPct']-base['overlapPct'],optimized['pairs']-base['pairs'],hits(optimized)-hits(base)))
    output=[]
    for (curve,policy,t),data in sorted(bucket.items()):
        visible,overlap,pairs,hits=zip(*data)
        output.append(dict(curve=curve,policy=policy,seconds=t,matchedChangedLayouts=len(data),
            worstCompanionExposureImproved=sum(x>0 for x in visible),worstCompanionExposureUnchanged=sum(x==0 for x in visible),
            worstCompanionExposureReduced=sum(x<0 for x in visible),worstCompanionExposureDeltaMedianPp=median(visible),
            worstCompanionExposureDeltaMinPp=round(min(visible),4),worstCompanionExposureDeltaMaxPp=round(max(visible),4),
            overlapDeltaMedianPp=median(overlap),overlapDeltaMinPp=round(min(overlap),4),overlapDeltaMaxPp=round(max(overlap),4),
            fewerOverlappingPairs=sum(x<0 for x in pairs),equalOverlappingPairs=sum(x==0 for x in pairs),
            moreOverlappingPairs=sum(x>0 for x in pairs),netCorrectCompanionHitPoints=sum(hits),
            fewerCorrectCompanionHitPoints=sum(x<0 for x in hits),moreCorrectCompanionHitPoints=sum(x>0 for x in hits)))
    return output

def compact_json(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def save_csv(path,rows):
    with path.open('wb') as dst,gzip.GzipFile(fileobj=dst,mode='wb',mtime=0) as compressed,io.TextIOWrapper(compressed,encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,lineterminator="\n",fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)
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
    files={};raws={};origins={}
    if a.labels and len(a.labels)!=len(a.roots):raise ValueError('Need exactly one source label per input directory')
    for root,label in zip(a.roots,a.labels or [p.name for p in a.roots],strict=True):
        for p in root.rglob('*.json.gz'):
            if p.parent.name not in LAYOUTS or p.parent.parent.name=='errors':continue
            d=read(p)
            if a.controller_sha and d['source']['home-production-diorama-population.js']!=a.controller_sha:
                raise ValueError(f'Unexpected controller SHA for {p}')
            f=d['fixture'];key=(f['width'],f['region'],f['count'],p.parent.name)
            if key in raws and raws[key]!=d:raise ValueError(f'Conflicting duplicate fixture {key}')
            rawname=p.parent.name+'/'+p.name
            raws[key]=d;files[rawname]=p
            origins[rawname]={'source':label,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
                'controllerSha256':d['source']['home-production-diorama-population.js'],
                'browsers':sorted({t['browser'] for t in d['trajectories']})}
    rows=[];diagnostics=[];camera_recoveries={};obs={};ntraj=0;moving=[];equivalents=0;versions=Counter();layout_mismatch=[]
    for (w,r,n,layout),d in sorted(raws.items()):
        if d['phaseSeconds']!=[0,8,30]:raise ValueError(f'Missing observation {w,r,n,layout}')
        for tr in d['trajectories']:
            ntraj+=1
            versions[tr['browser']]+=1
            if len(tr['phases'])!=3:raise ValueError('Need 0, 8 and 30 seconds')
            moving.append(tr['phases'][-1]['modelStats']['distance'])
            if 'populationFitRecoveries' in tr['phases'][0]:
                camera_recoveries['/'.join(map(str,[w,r,n,layout]))]=max(p['populationFitRecoveries'] for p in tr['phases'])
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
    supplemental={}
    if a.supplement:
        for p in a.supplement.rglob('*.json.gz'):
            if a.controller_sha and read(p)['source']['home-production-diorama-population.js']!=a.controller_sha:
                raise ValueError(f'Unexpected supplemental controller SHA for {p}')
            supplemental['extra/'+p.relative_to(a.supplement).as_posix()]=p
        if not a.partial and len(supplemental)!=10:raise ValueError('Expected five additional profiles in each layout')
    archive(dir/'geometry-fixtures.tar.gz',{**files,**supplemental})
    if diagnostics:
        save_csv(dir/'geometry-layout-only.csv.gz',diagnostics)
    issues={}
    for (w,r,n,l,c,p),values in obs.items():
        ref=obs.get((w,r,n,'fixed','linear','current'))
        if ref and all(r['chrome']==v['chrome'] for r,v in zip(ref,values)):
            issues['/'.join(map(str,[w,r,n,l,c,p]))]=reasons(ref,values,n)
    clusters=defaultdict(list)
    for v in rows:
        if v['count'] not in ALL_COUNT:continue
        l,c,p,w,n,r=(v[k] for k in ('layout','curve','policy','width','count','region'))
        for prefix in ('all',f'w{w}',f'n{n}',f'r-{r}',f'{w}/{r}',f'{w}/n{n}'):
            clusters[f'{prefix}/{l}/{c}/{p}'].append(v)
    grouped={k:aggregate(v) for k,v in clusters.items()}
    individuals=defaultdict(Counter)
    for (w,r,n,l,c,p),conditions in obs.items():
        base=obs.get((w,r,n,'fixed','linear','current'))
        if not base or n<19 or base[0]['chrome']!=conditions[0]['chrome']:continue
        tally=individuals[f'{l}/{c}/{p}']
        for baseline,candidate in zip(base,conditions):
            tally['actorObservations']+=n-2
            for k in ('compHiddenKeys','compNoHitKeys','compUnderHalfKeys'):
                old=set(filter(None,baseline[k].split('|')))
                new=set(filter(None,candidate[k].split('|')))
                tally[k+'New']+=len(new-old)
                tally[k+'Existing']+=len(new&old)
                tally[k+'Recovered']+=len(old-new)
    def extremes(keys,eligible):
        values=[r for r in rows if eligible(r)]
        return {k:max(values,key=lambda r:r[k]) if k.startswith(('compUnder','compZero','overlap','pairs','clipped','gearError','frameFoot','shadowsMissing','allHidden'))
            else min(values,key=lambda r:r[k]) for k in keys} if values else {}
    summary={'workflowRun':a.run_url,'sceneObservations':len(rows),'distinctNativeTrajectories':ntraj,'zeroDistanceAt30s':sum(x<=0 for x in moving),
        'minimumNativeDistanceAt30s':min(moving),'nativeFitRecoveryCounts':camera_recoveries,'distinctBrowserVersions':dict(versions),'aliasConditions':equivalents,
        'missingConditionCount':len(missing),'missingConditions':missing,'chromePatchMismatch':layout_mismatch,
        'additionalProfileRawFiles':len(supplemental),'diagnosticZeroGainObservations':len(diagnostics),'rawFileCount':len(files),'fileOrigins':origins,'caseCount':len(obs),'aggregate':grouped,'pairedIndividualOutcomes':individuals,'relativeShapeAndHitReasons':issues}
    summary['matchedOptimizedSeatEffects']=seating_effects(obs,diagnostics)
    summary['fields']={
        'phaseSeconds':'Simulated seconds since the frozen opening (0, 8, 30); same native V5 step as the live controller.',
        'width/height':'Outer viewport CSS px. Native game height is outer height minus the 52 CSS px control strip.',
        'extra and policy role scales':'Percent. Role scales include adopted bases of 120, 120, 105 percent for hero, partner and companions.',
        'p.clip, foot, frame, shadow and baselineGear':'Viewport CSS px. Rectangles are [left, top, width, height]. The foot is [x, y].',
        'native':'[x, y, w, h] in native game-stage pixels, as returned by the live resident model.',
        'depth and z':'Native perspective scale (unitless) and actual CSS stacking index.',
        'actualInitialPoints':'[x, z] after native navigation resolves each opening hint, in model world coordinates.',
        'height':'Source-asset body height in CSS px, after foreground clipping and before other residents cover it.',
        'ink, covered, exposed':'Area in CSS px² at source alpha ≥96/255. Ink equals covered plus exposed.',
        'hit3 and hitTargets':'Number of correct official hits among 3 opaque sample points. Target values are zero-based resident indices, or −1 for no resident.',
        'clipped':'One when any body pixel exceeds the clip by more than 1 CSS px, otherwise zero.',
        'pairs':'Resident pairs sharing at least 4 CSS px².',
        'hiddenPx2, distinctOverlapPx2, totalInkPx2':'Sum of resident ink hidden by other residents, number of distinct shared screen pixels, and summed body ink, all in CSS px².',
        'maxGearError and maxFootProjectionError':'Maximum absolute difference between native paint bounds and projected bounds around the measured foot, in CSS px.',
        'modelDistance and modelMoves':'Cumulative game-stage distance in native pixels and action count, from the V5 model metrics.',
        'relativeShapeAndHitReasons':'V3 comparative shape and native hit criteria, evaluated only on matching Chrome builds.'
    }
    summary['extremes']={p:extremes(['heroVisible','partnerVisible','compMinVisible','compHitPct','compUnder50','compZeroHits','overlapPct','pairs','clipped','allHidden','shadowsMissing','gearError','frameFootError'],
        lambda v: v['policy']==p and v['curve']=='linear' and v['layout']=='optimized' and v['count']>=19) for p in POLICIES}
    locks=[]
    for w,r,n in product(HEIGHTS,REGIONS,CONTROLS):
        if w>320 and n>18:continue
        zero=obs.get((w,r,n,'fixed','linear','current'))
        all_options=[obs.get((w,r,n,l,c,p)) for l,c,p in product(LAYOUTS,CURVES,POLICIES)]
        if not zero or not all(all_options):continue
        chosen=('extra','heroHeight','partnerHeight','compMedianHeight','totalInkPx2','hiddenPx2','pairs','heroHits','partnerHits',
            'compOneHit','compTwoHits','compThreeHits','compHiddenKeys','compNoHitKeys')
        assert all(all(row[k]==ref[k] for k in chosen) for option in all_options for row,ref in zip(option,zero))
        assert all(row['extra']==0 for row in zero)
        locks.append([w,r,n])
    summary['lockedZeroDistinctFixtureCount']=len(locks)
    transitions=geometry_transitions.compare(raws)
    summary['adjacentResidentHeights']=transitions
    summary['pooledCompanionDistributions']=individual_distributions(raws)
    if a.transitions:geometry_transitions.write_csv(a.transitions,transitions)
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
            writer=csv.DictWriter(f,lineterminator="\n",fieldnames=compact[0]);writer.writeheader();writer.writerows(compact)
    report(a.report,summary,obs,rows)
    print(f'{len(files)} raw files, {ntraj} native trajectory groups, {len(obs)} conditions, {len(rows)} observations; {len(missing)} missing.')

def report(path,summary,obs,rows):
    grouped=summary['aggregate']
    def table(header):return ['| '+' | '.join(header)+' |','|'+'|'.join(['---']*len(header))+'|']
    out=['# 住民数に応じた拡大と実際の見え方','',
      f'実際のホームで {summary["distinctNativeTrajectories"]:,} 種類の開始状態を測った。幅・地域・人数・配置・増やし方・候補の組み合わせは {summary["caseCount"]:,} 件、開始時・8秒後・30秒後を合わせて {summary["sceneObservations"]:,} 場面。欠測は {summary["missingConditionCount"]:,} 条件。'+
      '主人公は成犬、恋人はもりのクマさん、昼の表示を指定し、端末時計を2026年10月15日03:00 UTC、乱数シードを214に固定した。各住民の元画像・反転・描画順・実際の画像枠を各候補の倍率で取得した。','',
      '全6端末幅は320×568、348×692、360×746、375×812、390×844、430×932 CSS px。下段操作欄の52pxを除いたホームの高さは516、640、694、760、792、880px。DPRは2。321～374pxの数式は単体試験で調べ、実際の描画はこの中間幅と末尾の追加プロファイルで標本測定した。18体は境界の対照、19～28体は10通りすべて実人数で読み込んだ。','',
      '同じ住民・同じ足元・同じ奥行きのまま実際の倍率を切り替え、各段階で座標と当たり判定寸法の一致を検査した。最適配置で開始位置の候補が変わる場合は独立にホームを開いた。全員の配置候補が同一の条件は同じネイティブ軌跡を共有する。解決後の初期座標・足元・装備・影・各人の試験結果は生記録に収録した。','',
      '本体はアルファ96/255以上で、前景と画面の切り取りを反映する。本体高は、住民同士を重ねる前の輪郭の上端から下端までを数えたCSS px。手前の住民による隠れ方は露出面積として別に計算した。2人の本体が4 CSS画素以上同じ位置を占める場合に1組と数えた。重なり率は隠れた住民画素の延べ面積／本体面積総和。見切れは1 CSS pxを超える本体のはみ出し。仲間の可視率は個々の本体のうち他の住民に覆われず残った面積。表の「最小」は最も隠れた1人で、平均ではない。','',
      'タップは各人の不透明な3点（原画アルファ200/255以上）を画面へ投影し、その場のelementFromPointと正式なホームのhit関数で本人に解決した数。実機のiPhoneは使用していない。実際の指の操作、画面を見て狙う難しさ、および端末の発熱はこの測定の範囲外。','',
      '## 19～28体の全地域・全幅を合わせた値','',
      '高さは各場面のCSS pxの中央値。仲間の高さは先に場面内で中央値を取り、その後各場面の中央値を求めた。仲間タップは全仲間・全時点の比率。50%未満は同じ住民を別時点では別に数える。','',
      *table(['配置・増やし方・候補','主人公／恋人／仲間の高さ','仲間の可視面積中央値 （CSS px²）','最大重なり率','最低の恋人／仲間可視率','仲間タップ','50%未満の仲間／全仲間観測数'])]
    groups=summary['pooledCompanionDistributions']
    b=groups.get('375-430/optimized/linear/B');c=groups.get('375-430/optimized/linear/C')
    tall28=[(obs.get((w,r,28,'optimized','linear','B')),obs.get((w,r,28,'optimized','linear','C'))) for w,r in product((375,390,430),REGIONS)]
    paired=[(before,after) for bg,cg in tall28 if bg and cg for before,after in zip(bg,cg,strict=True)]
    if b and c and paired:
        bh=b['exposedInkCssPx2P01P10P50P90'][2];ch=c['exposedInkCssPx2P01P10P50P90'][2]
        h='／'.join(f'{median(after[k]-before[k] for before,after in paired):+g}' for k in ('heroHeight','partnerHeight','compMedianHeight'))
        out[2:2]=[f'375・390・430pxの線形・最適配置では、19～28体の仲間1体あたりの可視面積中央値はBが{bh} CSS px²、Cが{ch} CSS px²だった。28体の同じ姿勢を比較すると、Cで増えた本体高の中央値は主人公／恋人／仲間の順に{h} CSS px。幅320pxでは全候補の倍率と結果が一致した。','']
    for l in LAYOUTS:
        for c in CURVES:
            for p in POLICIES:
                d=grouped.get(f'all/{l}/{c}/{p}')
                if not d:continue
                name=('固定' if l=='fixed' else '最適')+'・'+('段階' if c=='step' else '線形')+'・'+p
                out.append(f'| {name} | {d["heroHeight"]:g}／{d["partnerHeight"]:g}／{d["compHeight"]:g} | {d["compMedianExposedInk"]:g} | {d["overlapMax"]:.2f}% | {d["partnerMinVisible"]:.1f}／{d["compMinVisible"]:.1f}% | {d["compHitPct"]:.2f}% | {d["compUnder50"]:,}／{d["compObservations"]:,} |')
    out+=['','面積は先に場面内で仲間1体ずつの露出面積の中央値を取り、その後、全場面の中央値を求めた。','',
      f'幅320pxまたは18体の対照では、全16設定の値がそろった{summary["lockedZeroDistinctFixtureCount"]}世帯を照合した。全条件で追加倍率は0%、本体高・延べ重なり面積・重なり組数・主人公と恋人のタップ点数・仲間の完全消失とタップ全滅者のIDは同一だった。','','## 地域別のBとC','',
      '線形・最適配置、19～28体、375・390・430pxを合算。仲間タップ・重なりの上限・最も見えにくかった仲間を並べた。幅別・段階式・固定配置の全値は集計ファイルにある。','',
      *table(['地域','B 仲間タップ','C 仲間タップ','B／C 最大重なり率','B／C 仲間の最低可視率','B／C 仲間の可視面積中央値 （CSS px²）'])]
    for region in REGIONS:
        bcs=[]
        for p in ('B','C'):
            select=[r for r in rows if r['region']==region and r['width']>=375 and r['layout']=='optimized' and r['curve']=='linear' and r['policy']==p and r['count']>=19]
            if select:bcs.append(aggregate(select))
        if len(bcs)!=2:continue
        b,c=bcs
        out.append(f'| {NAMES[region]} | {b["compHitPct"]:.2f}% | {c["compHitPct"]:.2f}% | {b["overlapMax"]:.2f}／{c["overlapMax"]:.2f}% | {b["compMinVisible"]:.1f}／{c["compMinVisible"]:.1f}% | {b["compMedianExposedInk"]:g}／{c["compMedianExposedInk"]:g} |')
    out+=['','## 幅ごとのBとC','',
      '全13地域・19～28体・3時点、線形・最適配置。28体追加率だけを28体の実測設定から取り、ほかの列は10通りの人数を合算した。仲間の最小露出は1人の最も厳しい時点、タップは全仲間に対する本人解決率。','',
      *table(['端末幅×高さ','28体 B／C 追加率','B／C 仲間中央値高 px','B／C 仲間可視面積中央値 px²','B／C 仲間最低露出','B／C 仲間タップ','B／C 最大重なり'])]
    for w in HEIGHTS:
        d=[grouped.get(f'w{w}/optimized/linear/{p}') for p in ('B','C')]
        gains=[next((xs[0]['extra'] for (sw,_,n,l,c,k),xs in obs.items() if sw==w and n==28 and l=='optimized' and c=='linear' and p==k),None) for p in ('B','C')]
        if any(v is None for v in d+gains):continue
        b,c=d
        def pair(k,digits=1):
            return f'{b[k]:.{digits}f}／{c[k]:.{digits}f}'
        out += [f'| {w}×{HEIGHTS[w]} | {gains[0]:.2f}／{gains[1]:.2f}% | {pair("compHeight")} | {pair("compMedianExposedInk")} | {pair("compMinVisible")}% | {pair("compHitPct",2)}% | {pair("overlapMax",2)}% |']
    distribution=summary['pooledCompanionDistributions']
    out+=['','画面をまたいで仲間1体・1時点を1票として数えた分布。露出率は0.01ポイント、露出面積は1 CSS px²の粒度で集計し、順位が下から1・10・50・90%に達した観測値を示した。','',*table(['線形・最適','仲間の観測回数','露出率 P1／P10／P50／P90','露出面積 P1／P10／P50／P90（CSS px²）'])]
    for group,name in [('320','320px'),('375-430','375・390・430px')]:
        for policy in POLICIES:
            d=distribution.get(f'{group}/optimized/linear/{policy}')
            if d:out+=['| '+' | '.join([name+' '+policy,f'{d["companionPhaseObservations"]:,}','／'.join(f'{x:g}' for x in d['visiblePercentP01P10P50P90'])+'%','／'.join(map(str,d['exposedInkCssPx2P01P10P50P90']))])+' |']
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
    out+=['','同じ地域・端末・人数・時点・個体を照合した結果。各セルは、固定の現行から新たに該当／現行でも候補でも該当／候補で回復した仲間の観測回数。50%は分布を示す区切りで、採用条件には加えていない。','',
      *table(['線形・最適','判定した仲間観測数','本体完全消失 新／既／回復','露出50%未満 新／既／回復','本人タップ3点全滅 新／既／回復'])]
    for p in POLICIES:
        stats=summary['pairedIndividualOutcomes'].get('optimized/linear/'+p)
        if stats:
            cells=['／'.join(f'{stats.get(k+tag,0):,}' for tag in ('New','Existing','Recovered')) for k in ('compHiddenKeys','compUnderHalfKeys','compNoHitKeys')]
            out+=['| '+' | '.join([p,f'{stats["actorObservations"]:,}',*cells])+' |']
    choices=[v for v in summary['matchedOptimizedSeatEffects'] if v['curve']=='linear' and v['policy'] in ('current','B','C')]
    if choices:
        out+=['','## 実際に初期配置が変わった世帯','',
            '同じ幅・地域・人数・倍率で、固定配置と最適配置を比較した。0%は最適配置の足元を保ったまま追加倍率だけを戻した診断。仲間の最低可視率は各世帯でいちばん隠れた仲間の値。変化幅は「最適−固定」の最小から最大、タップ差は全世帯・全仲間の正答点数の増減合計。','',
            *table(['倍率','経過秒','世帯数','仲間の最低可視率 改善／同じ／低下','最低可視率の変化幅（ポイント）','重なり組数 減／同じ／増','仲間タップ正答の合計差'])]
        for v in choices:
            counts=lambda *keys:'／'.join(str(v[k]) for k in keys)
            size='0%（診断）' if v['policy']=='current' else '線形 '+v['policy']
            out+=['| '+' | '.join([size,str(v['seconds']),str(v['matchedChangedLayouts']),
                counts('worstCompanionExposureImproved','worstCompanionExposureUnchanged','worstCompanionExposureReduced'),
                f'{v["worstCompanionExposureDeltaMinPp"]:+.2f} ～ {v["worstCompanionExposureDeltaMaxPp"]:+.2f}',
                counts('fewerOverlappingPairs','equalOverlappingPairs','moreOverlappingPairs'),f'{v["netCorrectCompanionHitPoints"]:+d}'])+' |']
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
      *table(['人数','比較場面数','C−B 主／恋／仲の高さ中央値','C−B 仲間の可視面積中央値 px²','Cで増えた／同じ／減った仲間の最低可視率','仲間のタップ3点全滅が増えた場面'])]
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
    out+=['','場面ごとに最も隠れた仲間1体の露出割合を比較。同じ場面のBとCの間で、最も隠れる住民が入れ替わる場合もある。','',
      ]
    out+=geometry_transitions.report(summary['adjacentResidentHeights'])
    out+=['## 足元・装備・自律移動','']
    measured=Counter((v['source'],v['controllerSha256'][:12]) for v in summary['fileOrigins'].values() if v['browsers'])
    out+=['ブラウザーを開いて取得したファイルの測定元とコントローラーのSHA-256先頭12桁。各生ファイルの完全なSHA-256と版は集計JSONに収録した。','',*table(['測定元','コントローラー','実測ファイル数'])]
    out += [f'| {label} | `{sha}` | {amount} |' for (label,sha),amount in sorted(measured.items())]
    out.append('')
    recoveries=summary['nativeFitRecoveryCounts']
    if recoveries:
        occurred=[f'{k}（{v}回）' for k,v in recoveries.items() if v]
        out+=[f'ネイティブのカメラ調整を観察した{len(recoveries)}開始状態のうち、画面幅の当てはめが同じ2値を往復し、広いほうの外縁に確定したのは{len(occurred)}件。'+('対象は'+ '、'.join(occurred)+'。' if occurred else ''),'']
    versions='、'.join(f'{k}（{v}開始状態）' for k,v in summary['distinctBrowserVersions'].items())
    out += [f'全体計測のChromeは {versions}。固定と最適でChromeのパッチ版が異なる条件は{len(summary["chromePatchMismatch"])}件で、相対目安は同一ブラウザー版の組だけで集計した。','']
    if rows:
        distance=summary['minimumNativeDistanceAt30s']
        out+=[f'本体が画面外へ1 CSS pxを超えてはみ出した住民は1場面あたり最大{max(r["clipped"] for r in rows)}体、影の欠落は最大{max(r["shadowsMissing"] for r in rows)}体。倍率を足元に掛けた場合の期待位置と実表示との差は、装備矩形が最大{max(r["gearError"] for r in rows):.4f}、本体の画像枠が最大{max(r["frameFootError"] for r in rows):.4f} CSS px。30秒までの移動距離は累計で最小{distance:.3f} native px、移動距離0の開始状態は{summary["zeroDistanceAt30s"]}件。各時点はV5の通常の自律ステップを0.1秒ずつ進めて測定した。実時間のフレーム間隔は性能測定を参照。','']
    replay=BASE/'evidence/geometry-motion-replay.json'
    if replay.is_file():
        proof=json.loads(replay.read_text())
        delta=max(p['maxNativeOrDepthDelta'] for p in proof['phases']);matched=sum(p['metricsEqual'] for p in proof['phases'])
        fx=proof['fixture']
        out+=[f'幅{fx["width"]}px・{NAMES[fx["region"]]}・{fx["count"]}体では、描画矩形のキャッシュを使わない元のV5ステップも別に実行した。全住民の座標・当たり判定寸法・奥行きの最大差は{delta:g}、モデルの距離・移動回数などが一致した時点は{matched}/{len(proof["phases"])}。 [ネイティブ移動の直接再現](evidence/geometry-motion-replay.json)','']
    if (BASE/'evidence/ground-v4.json').is_file():
        out+=['もり・うみ・おうちでは、倍率を切り替えたときの影の中心、草地または水面の接地効果、リボンと指輪も個別に測った。 [足元・照明・装備の実測](evidence/ground-v4.json)','']
    if (BASE/'evidence/fit-recovery.json').is_file():
        out+=['初回表示と端末のサイズ変更でカメラの外縁が2値を往復した条件について、修正前・修正後の読み込みを比較した。 [初期カメラの実測](evidence/fit-recovery.json)','']
    for filename,label in [('geometry-raster-chromium.json','Chromium'),('geometry-raster-webkit.json','Linux WebKit')]:
        calibrated=BASE/'evidence'/filename
        if not calibrated.is_file():continue
        data=json.loads(calibrated.read_text());cases=list(data['cases'].values())
        heights=[abs(v['raster'][k]-v['projected'][k]) for v in cases for k in range(3)]
        occlusion=[abs(v['raster'][4]-v['projected'][4]) for v in cases]
        pairs=[abs(v['raster'][3]-v['projected'][3]) for v in cases]
        out.append(f'{label} {data["browser"]}の実画面を各住民の白い輪郭に分けて再測定した。{len(cases)}場面で、投影との最大差は本体高{max(heights):g} CSS px、重なり{max(pairs):g}組、隠れ面積{max(occlusion):.3f}ポイント。ブラウザーの端画素・前景マスクによる差を含む。 [実画面の数値](evidence/{filename})')
        out.append('')
    repeats=BASE/'evidence/geometry-webkit-cold-starts.json'
    if repeats.is_file():
        groups=json.loads(repeats.read_text())['groups']
        served=[s['raster']['partnerVisiblePct'] for s in groups['served-response']]
        pinned=[s['raster']['partnerVisiblePct'] for s in groups['pinned-response']]
        def percent_range(values):
            lo,hi=(f'{v:.1f}' for v in (min(values),max(values)))
            return lo+'%' if lo==hi else lo+'～'+hi+'%'
        out += [f'320×568・もり・28体のLinux WebKitでは、同じ最終コントローラー、同じシード・時刻・倍率で起動を各3回繰り返した。ゲームを通常のHTTPで読み込んだ3回の恋人露出は{percent_range(served)}、同じJavaScriptの応答をブラウザー計測側で返した3回は{percent_range(pinned)}だった。読み込み方法ごとに同じ足元を再現し、方法間では初期位置が変わった。全条件の大規模集計は各倍率を同じ起動内で比較している。同じLinux WebKitでも、別の起動条件では初期露出が変わり得る。 [WebKitの起動6回](evidence/geometry-webkit-cold-starts.json)','']
    normal_hits=BASE/'evidence/geometry-served-hits-webkit.json'
    if normal_hits.is_file():
        normal=json.loads(normal_hits.read_text())['cases']
        def numbers(key,policy):
            return [sum(x['correctOf3'] for x in t['residents']) for t in normal[key][policy]]
        if '320/forest/28/fixed' in normal and '375/home/28/optimized' in normal:
            b=numbers('320/forest/28/fixed','B');small='／'.join(map(str,b));wide='／'.join(map(str,numbers('375/home/28/optimized','B')))
            out += [f'WebKitのネットワークを通常通りにしたローカルHTTP測定でも、同一のゲームが返す正式なヒット関数を使った。320×568・もり・28体では、主人公・恋人・全仲間の計84点のうち、表示直後／8秒／30秒で本人を選べたのは{small}点。375×812・おうち・28体の最適配置ではBが{wide}点、Cが'+ '／'.join(map(str,numbers('375/home/28/optimized','C')))+'点だった。 [WebKitの通常読み込みでの全住民タップ](evidence/geometry-served-hits-webkit.json)','']
    if summary['workflowRun']:
        out+=['最終版の全地域を同じジョブ内の固定・最適配置で測定した。 [13地域のネイティブ測定]('+summary['workflowRun']+')','']
    out+=['[全場面の集計CSV](evidence/geometry-scenes.csv.gz) ／ [個別の仲間・解決先・自律移動・足元を含むブラウザー記録](evidence/geometry-fixtures.tar.gz) ／ [地域・人数・幅別の数値とV3相対基準の該当理由](evidence/geometry-summary.json)','']
    if summary['diagnosticZeroGainObservations']:
        out += [f'最適配置に切り替えた足元を保ち、拡大だけを0に戻した診断を{summary["diagnosticZeroGainObservations"]:,}場面で追加した。正式な現行設定はV2配置に戻る。この診断と固定の現行設定を比較すると、配置だけの効果が分かる。 [配置だけ変えた診断](evidence/geometry-layout-only.csv.gz)','']
    content='\n'.join(out)
    for name in ('geometry-scenes.csv.gz','geometry-fixtures.tar.gz','geometry-summary.json','geometry-layout-only.csv.gz'):
        content=content.replace('](evidence/'+name+')','](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4/'+name+')')
    heritage=BASE/'evidence/geometry-v3-320-parity.json'
    if heritage.is_file():
        old=json.loads(heritage.read_text())['phases']
        same=sum(p['nativeMaxDelta']==0 and p['footMaxDeltaCssPx']==0 for p in old)
        hits=sum(p['v3Hits']==p['v4Hits'] for p in old)
        content+=f'\n320×568の20体・28体を同じV3固定配置の保存記録と照合した。比較できた{len(old)}場面中、ネイティブ座標と画面上の足元が完全一致したのは{same}場面、役割別の本人タップ成功点数が一致したのは{hits}場面。V3のChromeパッチ版とV4の版は各行に記載した。 [V3とV4の直接照合](evidence/geometry-v3-320-parity.json)\n'
    if (BASE/'evidence/geometry-extra-profiles.csv').is_file():
        content+='\n350×701と360×745（ゲーム高さ649・693px）でのみ採用した5条件についても、固定・最適と、同じ最適配置で拡大を0に戻した診断を追加した。主表の360×746はゲーム高さ694pxで、上記とは異なる。 [追加の5配置プロファイル](evidence/geometry-extra-profiles.csv)\n'
    path.write_text(content)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('roots',nargs='+',type=Path);p.add_argument('--out',type=Path,required=True,help='Owner evidence directory for the complete native archives');p.add_argument('--report',type=Path,default=BASE/'GEOMETRY.md');p.add_argument('--run-url',help='URL of the distributed native run');p.add_argument('--controller-sha',help='Require this exact runtime SHA for every primary file');p.add_argument('--labels',nargs='+',help='Provenance label for each input root');p.add_argument('--supplement',type=Path,help='Five additional authored profiles to include in the private raw archive');p.add_argument('--transitions',type=Path,help='Public per-key adjacent resident height statistics');p.add_argument('--compact',type=Path,help='Optional small, human-readable subgroup CSV for the repository');p.add_argument('--partial',action='store_true')
    main(p.parse_args())
