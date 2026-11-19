"""Compare all 28-person households and validate the population/width controls."""
import argparse
import csv
import gzip
import itertools
import statistics
from pathlib import Path

REGIONS = {
    "river_lake":"みずべ", "forest":"もり", "home":"おうち", "city":"とかい", "sea":"うみ",
    "countryside":"いなか", "mountain":"やま", "snow":"ゆきぐに", "jungle":"ジャングル",
    "desert":"さばく", "deepsea":"しんかい", "star_stop":"ほしぞらのていりゅうじょ", "memory_lake":"きおくのみずうみ",
}
POLICIES = {"current":0, "A":10, "B":15, "C":20}
WIDTHS = [320,348,360,375,390,430]

def numeric(row, key):
    return float(row[key])

def summarize(rows):
    def median(key):
        return statistics.median(numeric(row,key) for row in rows)
    def worst(key):
        return max(numeric(row,key) for row in rows)
    def minimum(key):
        return min(numeric(row,key) for row in rows)
    hits = sum(int(row['compOneHit']) + 2*int(row['compTwoHits']) + 3*int(row['compThreeHits']) for row in rows)
    return dict(observations=len(rows),heroH=median('heroHeight'),partnerH=median('partnerHeight'),
                companionH=median('compMedianHeight'),companionInk=median('compMedianExposedInk'),
                medianOverlapArea=median('distinctOverlapPx2'),maxOverlapArea=worst('distinctOverlapPx2'),
                maxPairs=int(worst('pairs')),maxOverlapPct=worst('overlapPct'),
                minHero=minimum('heroVisible'),minPartner=minimum('partnerVisible'),
                minCompanion=minimum('compMinVisible'),companionHitPct=round(100*hits/(78*len(rows)),3),
                maxClip=int(worst('clipped')))

def verify_controls(rows):
    expected = set(itertools.product(REGIONS, WIDTHS, range(18,29), ['fixed','optimized'],
                                     ['linear','step'], POLICIES, [0,8,30]))
    observations = {}
    for r in rows:
        width,count,sec = map(int,(r['width'],r['count'],r['seconds']))
        key = (r['region'],width,count,r['layout'],r['curve'],r['policy'],sec)
        assert key in expected and key not in observations, key
        t = max(0,min(1,(width-320)/55))
        n = 0 if count <= 18 else (count-18)/10 if r['curve']=='linear' else 1
        assert abs(numeric(r,'extra')-POLICIES[r['policy']]*n*t*t*(3-2*t)) < .0002,key
        observations[key]=r
    assert expected==set(observations),f"Missing {len(expected-set(observations))} scene observations"
    metrics = ['heroHeight','partnerHeight','compMedianHeight','pairs','hiddenPx2','compHitPct','clipped']
    for (region,width,count,layout,curve,policy,sec),r in observations.items():
        if width<=320 or count==18 or policy=='current':
            ref=observations[region,width,count,'fixed','linear','current',sec]
            assert all(r[k]==ref[k] for k in metrics),(region,width,count,layout,curve,policy,sec)
    return observations

def report(path, rows):
    tall = [r for r in rows if r['count']=='28' and int(r['width'])>=375 and r['curve']=='linear']
    lines=['# 28体の標準サイズを比較した結果','',
           '375・390・430pxの各幅で、13地域の28体を開始時・8秒後・30秒後に測った。以下は各候補117場面。高さは透明な余白を除いた本体の中央値。仲間は各場面で26体の中央値を出してから集計した。重なり面積は他の住民と共用する位置を1回ずつ数えたCSS px²。可視率は各役割で最も隠れた1体の、元の不透明部分に対する露出面積。','',
           '| 初期配置 | 候補 | 主人公／恋人／仲間の本体高（px） | 最大重なり（組／px²） | 主人公／恋人／仲間の最低可視率 | 仲間の3点判定成功率 |',
           '|---|---|---:|---:|---:|---:|']
    for layout in ['fixed','optimized']:
        for policy in POLICIES:
            data=summarize([r for r in tall if r['layout']==layout and r['policy']==policy])
            title='固定' if layout=='fixed' else '配置調整'
            candidate='現行' if policy=='current' else f"{policy}（+{POLICIES[policy]}%）"
            lines.append(f"| {title} | {candidate} | {data['heroH']:g}／{data['partnerH']:g}／{data['companionH']:g} | {data['maxPairs']}／{data['maxOverlapArea']:g} | {data['minHero']:.1f}／{data['minPartner']:.1f}／{data['minCompanion']:.1f}% | {data['companionHitPct']:.2f}% |")
    lines+=['','## 13地域のB案','',
            '本体高は390px幅の3時点の中央値。右の2列は375〜430pxの9場面を通した最大値・最小値。320pxでは追加倍率はどの候補でも0%。348pxと360pxの実効倍率、固定配置と配置調整の全値もCSVに含む。','',
            '| 地域 | 390pxでの主人公／恋人／仲間（px） | 最大重なり（組／px²） | 一番隠れた仲間の可視率 |',
            '|---|---:|---:|---:|']
    for region,label in REGIONS.items():
        sample=[r for r in tall if r['region']==region and r['layout']=='optimized' and r['policy']=='B']
        base=summarize([r for r in sample if r['width']=='390'])
        extremes=summarize(sample)
        lines.append(f"| {label} | {base['heroH']:g}／{base['partnerH']:g}／{base['companionH']:g} | {extremes['maxPairs']}／{extremes['maxOverlapArea']:g} | {extremes['minCompanion']:.1f}% |")
    lines+=['','3点判定はその座標で誰が選ばれるかを調べた結果。実際に指を置いて選べた率、ドラッグを離してV5が経路を受理した率は別に記録した。 [28体・全624組合せのCSV](evidence/households-28.csv) ／ [タップ・ドラッグの実測](INTERACTION.md) ／ [全人数・全画面幅の測定](GEOMETRY.md)']
    path.write_text('\n'.join(lines)+'\n')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("scenes",type=Path)
    p.add_argument("--csv",type=Path,default=Path(__file__).parent/'evidence/households-28.csv')
    p.add_argument("--report",type=Path,default=Path(__file__).parent/'SIZE28.md')
    args=p.parse_args()
    with gzip.open(args.scenes,'rt',encoding='utf-8',newline='') as src:
        rows=list(csv.DictReader(src))
    verify_controls(rows)
    numbers=[]
    households={}
    for r in rows:
        if r['count']=='28' and r['curve']=='linear':
            key=(int(r['width']),r['region'],r['layout'],r['policy'])
            households.setdefault(key,[]).append(r)
    for width,region,layout,policy in itertools.product(WIDTHS,REGIONS,['fixed','optimized'],POLICIES):
        samples=households[width,region,layout,policy]
        assert len(samples)==3
        numbers.append(dict(width=width,region=region,layout=layout,policy=policy,**summarize(samples)))
    args.csv.parent.mkdir(parents=True,exist_ok=True)
    with args.csv.open('w',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=numbers[0],lineterminator='\n');writer.writeheader();writer.writerows(numbers)
    report(args.report,rows)
    print(f'{len(rows):,} observations verified; {len(numbers)} regional 28-resident comparisons')
    for policy in POLICIES:
        selected=[r for r in rows if r['count']=='28' and int(r['width'])>=375 and r['layout']=='optimized' and
                  r['curve']=='linear' and r['policy']==policy]
        print(policy,summarize(selected))
if __name__=='__main__':
    main()
