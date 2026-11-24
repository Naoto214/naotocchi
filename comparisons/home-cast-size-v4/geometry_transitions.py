"""Pair surviving native resident keys at the opening of adjacent household sizes."""
import csv
from collections import defaultdict
from itertools import product
import math
from statistics import median

WIDTHS=(375,390,430)
OPTIONS=(('linear','current'),('step','B'),('linear','B'))
ROLES=('all','pet','partner','companion')

def percentile(values,q):
    ordered=sorted(values)
    i=(len(ordered)-1)*q;j=int(i)
    return round(ordered[j]+(ordered[min(j+1,len(ordered)-1)]-ordered[j])*(i-j),4)

def initial(d,condition):
    # Same plan and actual resolved native navigation for every candidate in a group.
    for t in d['trajectories']:
        if condition not in t['conditions']:continue
        p=t['phases'][0]
        _,curve,policy=condition.split('/')
        gain=p['settings'][curve+'/'+policy][0]
        metrics=p['gains'][gain]['residents']
        zero=p['gains'].get('0')
        return {a['key']:(a['kind'],m[0],*a['foot'],a['depth'],zero['residents'][i][0] if zero else None)
            for i,(a,m) in enumerate(zip(p['actors'],metrics,strict=True))}
    return None

def compare(raws):
    regions=sorted({r for _,r,_,_ in raws})
    buckets=defaultdict(list)
    for w,region,layout,(curve,policy) in product(WIDTHS,regions,('fixed','optimized'),OPTIONS):
        previous=None
        for n in range(18,29):
            case=raws.get((w,region,n,layout));k='/'.join((layout,curve,policy))
            if case and k in case['references']:
                k=case['references'][k]
                case=raws.get((w,region,n,'fixed'))
            current=initial(case,k) if case else None
            if previous is not None and current is not None:
                if not previous.keys()<=current.keys() or len(current.keys()-previous.keys())!=1:
                    raise ValueError(f'Adjacent household keys not nested at {w}/{region}/{n}/{k}')
                for key,(role,h,x,y,depth,base) in previous.items():
                    role2,height,x2,y2,depth2,base2=current[key]
                    if role!=role2:raise ValueError(f'Role changed at {key}')
                    baseline_delta=base2-base if base2 is not None and base is not None else None
                    policy_delta=height-h-baseline_delta if baseline_delta is not None else None
                    datum=(height-h,math.hypot(x2-x,y2-y),abs(depth2-depth),baseline_delta,policy_delta)
                    for width in ('all',str(w)):
                        for group in ('all',role):
                            windows=[str(n-1)+'-'+str(n),'18-28-pooled']
                            if n>19:windows.append('19-28-pooled')
                            for window in windows:buckets[(layout,curve,policy,width,window,group)].append(datum)
            previous=current
    output=[]
    for (layout,curve,policy,width,window,role),rr in sorted(buckets.items()):
        delta,foot,depth,base,attributable=zip(*rr)
        abs_change=[abs(x) for x in delta]
        up=sum(x>2 for x in delta);down=sum(x< -2 for x in delta)
        output.append(dict(layout=layout,curve=curve,policy=policy,width=width,transition=window,role=role,
            pairedResidentObservations=len(rr),medianSignedHeightCssPx=median(delta),
            medianAbsHeightCssPx=median(abs_change),p90AbsHeightCssPx=percentile(abs_change,.9),
            meanAbsHeightCssPx=round(sum(abs_change)/len(rr),4),growthOver2CssPx=up,
            shrinkOver2CssPx=down,growthOver2Percent=round(100*up/len(rr),4),shrinkOver2Percent=round(100*down/len(rr),4),
            sameSeatZeroGainPairs=sum(v is not None for v in base),
            medianSignedZeroGainHeightCssPx=median(v for v in base if v is not None) if any(v is not None for v in base) else None,
            medianSignedIncrementalPolicyHeightCssPx=median(v for v in attributable if v is not None) if any(v is not None for v in attributable) else None,
            medianFootDistanceCssPx=round(median(foot),4),p90FootDistanceCssPx=percentile(foot,.9),
            medianAbsoluteDepthChange=round(median(depth),6),p90AbsoluteDepthChange=percentile(depth,.9)))
    return output

def write_csv(path,rows):
    if not rows:return
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0],lineterminator='\n')
        writer.writeheader();writer.writerows(rows)

def report(rows):
    if not rows:return []
    lookup={(r['layout'],r['curve'],r['policy'],r['width'],r['transition'],r['role']):r for r in rows}
    table=['## 同じ住民を追った人数切り替え','',
        '375・390・430pxの13地域で、各人数の開始位置にいる同じ住民IDを照合した。各隣接人数で、少ないほうの全住民が多いほうにも存在し、新しい1体だけを除いた。各住民を1回ずつ数えるため、全住民の集計では仲間が最も多い。高低差は透明余白を除く本体高の増減。人数を変えるとネイティブの初期配置・奥行き・カメラも変わる。固定配置は各人数に対するV2の開始方式を指す。','',
        '各セルは「絶対変化の中央値／90パーセンタイル（CSS px）・2px超の成長率／2px超の縮小率」。同じ地域・同じ幅・同じシードの固定配置。','',
        '|人数切り替え|比較した共通住民数|現行|段階B|線形B|','|---|---:|---|---|---|']
    for window in [f'{n}-{n+1}' for n in range(18,28)]+['18-28-pooled','19-28-pooled']:
        cells=[lookup.get(('fixed',c,p,'all',window,'all')) for c,p in OPTIONS]
        if not all(cells):continue
        name=window.replace('-pooled','（全隣接人数）').replace('-','→')
        def cell(r):
            return f'{r["medianAbsHeightCssPx"]:g}／{r["p90AbsHeightCssPx"]:g} ・ {r["growthOver2Percent"]:.1f}／{r["shrinkOver2Percent"]:.1f}%'
        table+=['| '+' | '.join([name,f'{cells[0]["pairedResidentObservations"]:,}',*[cell(r) for r in cells]])+' |']
    table+=['','全表には同一IDを比較した両端の足元距離・奥行き差も記録した。各端点で同じ足元の追加0%を測り、全変化を「配置と元のカメラによる0%時の差」と「両端の倍率効果の差」に分解した。各個体では2項の和が実測差になり、中央値には加法性がない。 [画面幅・役割・実際の最適配置も含む数値](evidence/geometry-count-transitions.csv)','']
    return table
