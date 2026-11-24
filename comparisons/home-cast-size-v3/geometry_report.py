"""Add geometry tables and the limits of the measurements to the Japanese report."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from statistics import median
from geometry_collect import BASE,REGIONS

NAMES=dict(zip(REGIONS,('もり','みずべ','とかい','おうち','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞらのていりゅうじょ','きおくのみずうみ')))
TIMES=('initial','after8','after30')
MARKER='## 28体を並べたときの地域差'


def run(args):
    matrix=json.loads((args.evidence/'geometry-matrix.json').read_text())
    motion=json.loads((args.evidence/'geometry-motion.json').read_text())
    if matrix['complete']!=2600:raise ValueError(f"Need all 2600 conditions; currently {matrix['complete']}")
    cases=matrix['cases']
    for key,case_data in cases.items():
        resident_count=int(key.split('/')[2])
        for phase in TIMES:
            if phase not in case_data:continue
            values=case_data[phase]
            hidden,distinct,total=values[11:14]
            if not (0<=distinct<=hidden<=total and 0<=values[3]<=resident_count*(resident_count-1)//2):
                raise ValueError(f'Invalid occupancy areas or pair count at {key} {phase}')
            if total and abs(values[4]-100*hidden/total)>.006:
                raise ValueError(f'Wrong overlap denominator at {key} {phase}')
    def case(w,r,c,layout,x):return cases[f'{w}/{r}/{c}/{layout}/{x}']
    def worst(w,r,c,layout,x,index):
        return max(case(w,r,c,layout,x)[t][index] for t in TIMES if t in case(w,r,c,layout,x))
    rows=[MARKER,'','各列は初期・8秒後・30秒後の三時点で最も大きかった重なり面積。単位は輪郭の総面積に対する%。320pxでは基準からの変化と配置設定の影響を分けた。375・390・430pxは追加20%と配置最適化を選んだ場合。','',
        '| 地域 | 320 基準 | 320 ＋20固定 | 320 ＋20最適 | 375 ＋20最適 | 390 ＋20最適 | 430 ＋20最適 |',
        '|---|---:|---:|---:|---:|---:|---:|']
    for r in REGIONS:
        vals=[worst(w,r,28,layout,x,4) for w,layout,x in [(320,'fixed',0),(320,'fixed',20),(320,'optimized',20),(375,'optimized',20),(390,'optimized',20),(430,'optimized',20)]]
        rows.append('| '+NAMES[r]+' | '+' | '.join(f'{v:.1f}' for v in vals)+' |')
    rows+=['','## 320pxのもりで比較した五つの倍率','',
           '28体を表示した直後の値。高さは透明余白を除いた主人公／恋人／仲間中央値。重なりは同一画素を一度だけ数えた面積（CSS px²）。露出は手前の住民に覆われずに見えている本体の面積比。','',
           '| 追加倍率 | 固定の体高（px） | 最適の体高（px） | 固定の重なり組／面積 | 最適の重なり組／面積 | 固定の主人公／恋人露出 | 最適の主人公／恋人露出 |',
           '|---:|---|---|---:|---:|---:|---:|']
    for x in [0,5,10,15,20]:
        f=case(320,'forest',28,'fixed',x)['initial']
        o=case(320,'forest',28,'optimized',x)['initial']
        def height(row):return '／'.join(f'{v:g}' for v in row[:3])
        rows.append(f'| ＋{x}% | {height(f)} | {height(o)} | {f[3]}／{f[12]:,} | {o[3]}／{o[12]:,} | {f[5]:.1f}%／{f[6]:.1f}% | {o[5]:.1f}%／{o[6]:.1f}% |')
    rows+=['','## 住民数による違い','','とかい・390pxの追加20%・最適配置。高さは初期状態の主人公／恋人／仲間中央値、露出は8秒時点で見えていた恋人の輪郭面積。','',
        '|人数|本体高（CSS px）|初期の重なり|8秒後の重なり|8秒後の恋人露出|','|---:|---|---:|---:|---:|']
    for c in [1,4,10,20,28]:
        a=case(390,'city',c,'optimized',20);ini=a['initial'];after=a['after8']
        heights='／'.join('―' if v is None else f'{v:g}' for v in ini[:3])
        lover='―' if after[6] is None else f'{after[6]:.1f}%'
        rows.append(f'|{c}|{heights}|{ini[3]}組|{after[3]}組|{lover}|')
    anchors=[a for s in cases.values() for a in s['anchors'].values()]
    clipping=[k for k,c in cases.items() if any(c[t][7] for t in TIMES if t in c)]
    hidden=[k for k,c in cases.items() if any(c[t][8] for t in TIMES if t in c)]
    rows+=['','## 見切れ・装備・測定精度','',
         f"全2,600条件のうち、少なくとも一時点で1pxを超える見切れがあったのは{len(clipping)}条件、住民の本体がすべて隠れたのは{len(hidden)}条件だった。計測した住民の影の欠落は最大{max(a[2] for a in anchors)}体。足元・奥行きから求めた装備矩形の位置と大きさに対する最大誤差は{max(a[1] for a in anchors):.3f} CSS px。"]
    native=motion['states']
    no_move=sum(1 for s in native.values() if s.get('after30',s['after8'])[2]<1)
    rows+=['',f'初期位置が同じ候補をまとめると、自律移動の開始状態は{len(native)}種類。最後の測定時点までの累積移動距離が1 native px未満だったのは{no_move}種類。会話や思考中に全員が必ず歩いているとは限らない。']
    sources=motion['browserByTrajectory']
    versions={}
    local=0
    for source in sources.values():
        version=source['chrome']
        versions[version]=versions.get(version,0)+1
        if source['origin']!='GitHub Actions':local+=1
    rows+=['',f"Chromeの開始状態を{'、'.join(f'{v}で{n}種類' for v,n in sorted(versions.items()))}測定した。内訳はGitHub Actionsが{len(sources)-local}種類、同じ公式ビルドを使ったLinux上の追加測定が{local}種類。[開始状態ごとのブラウザーと測定元](evidence/geometry-motion.json)"]
    differences=motion['fixedOptimizedPatchDifferences']
    if differences:
        rows+=['',f'固定と最適でChromeのパッチ版が異なる開始状態は{len(differences)}種類。厳密な同一ビルド比較の対象から除外した。これらの場面では境界画素の数や僅かな初期位置の差を考慮する。',
               '', '| 開始状態（幅／地域／人数／配置） | 固定のChrome | 最適のChrome |','|---|---|---|']
        rows += [f"| {d['trajectory']} | {d['fixed']} | {d['optimized']} |" for d in differences]
    else:
        rows+=['','各配置候補は同一バージョンのChromeで固定配置と比較した。']
    for label,fn in [('Chromium','geometry-raster.json'),('WPE WebKit','geometry-raster-webkit.json')]:
        loc=args.evidence/fn
        if not loc.exists():continue
        data=json.loads(loc.read_text())['cases']
        area=[abs(a['actual'][4]-a['projection'][4]) for a in data.values()]
        pairs=[abs(a['actual'][3]-a['projection'][3]) for a in data.values()]
        height=[abs(a['actual'][i]-a['projection'][i]) for a in data.values() for i in [0,1,2] if a['actual'][i] is not None]
        rows+=['',f'{label}のスクリーンショット{len(data)}条件で校正した。本体高の最大誤差は{max(height):g} CSS px。重なり面積の絶対差は中央値{median(area):.2f}、最大{max(area):.2f}ポイント。4画素以上が重なる組の数は最大{max(pairs)}組の差があった。[{label}の実画面と投影の比較](evidence/{fn})']
    rows+=['','iPhone Safariの実機での体感、長時間動作後の熱、スクロールやアドレスバーによって表示領域が変わる状況は未検証。']
    stamp=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
    rows+=['','## 記録した版','',
           f"集計時刻は {stamp}。試遊に使った配置ソースのSHA-256は `{sha(BASE/'seating.js')}`。固定・最適の実ブラウザー記録を取得した実行は [固定の検証](https://github.com/Naoto214/naotocchi/actions/runs/44530048588) ／ [最適配置の検証](https://github.com/Naoto214/naotocchi/actions/runs/44533221960)。",
           '',f"集計ファイルのSHA-256は、輪郭が `{sha(args.evidence/'geometry-matrix.json')}`、移動と描画元が `{sha(args.evidence/'geometry-motion.json')}`。"]
    if args.raw_fixed and args.raw_optimized:
        for label,root in [('固定',args.raw_fixed),('最適',args.raw_optimized)]:
            entries=sorted(f'{p.relative_to(root).as_posix()} {sha(p)}\n' for p in root.rglob('*.json'))
            digest=hashlib.sha256(''.join(entries).encode()).hexdigest()
            rows+=['',f'{label}のブラウザー生記録{len(entries)}件を、相対パスとファイルSHA-256で昇順に並べた記録一覧のSHA-256は `{digest}`。']
    path=args.report;prefix=path.read_text().split(MARKER)[0].rstrip()+'\n\n'
    path.write_text(prefix+'\n'.join(rows)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',type=Path,default=BASE/'evidence');p.add_argument('--report',type=Path,default=BASE/'GEOMETRY.md');p.add_argument('--raw-fixed',type=Path);p.add_argument('--raw-optimized',type=Path);run(p.parse_args())
