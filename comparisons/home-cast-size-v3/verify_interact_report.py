"""Make the denominator-based tables from the captured interaction matrix."""
import argparse
import json
from pathlib import Path
from verify_interact_routes import HEIGHT,REGIONS
from verify_interact_matrix import EXTRAS
LABELS=dict(zip(REGIONS,('もり','みずべ','とかい','おうち','いなか','やま','ゆきぐに','うみ','ジャングル','さばく','しんかい','ほしぞらのていりゅうじょ','きおくのみずうみ')))

def quantities(data,w,r,n,layout,extra,phase):
    key=f'{w}/{r}/{n}/{layout}'+(f'/{extra}' if layout=='optimized' else '')
    parent=data['sameNativeSeatsAs'].get(key,key)
    original=data['cases'].get(parent,{}).get(phase,{})
    row=original.get('taps',{}).get(str(extra))
    if not row:return None
    clear=original['direct']
    return [row[0]+row[2]+row[4],row[1]+row[3]+row[5],
            sum(item[1].bit_count() for item in clear.values()),8*len(clear),row[-1]]

def measured(data,subjects,layout,extra,phase,index):
    included=[v for w,r,n in subjects if (v:=quantities(data,w,r,n,layout,extra,phase))]
    if not included:return '未測定'
    correct,total=sum(v[index] for v in included),sum(v[index+1] for v in included)
    out=f'{correct}/{total}'
    if len(included)!=len(subjects):out+=f'（{len(included)}/{len(subjects)}場面）'
    return out

def run(args):
    data=json.loads(args.matrix.read_text())
    lines=['# 住民の狙いやすさ・画面幅と人数別の結果','',
      '各セルは成功数／試行数。1体につき画像の不透明な3点を狙い、ブラウザーの実際の重なり順・公式のタップ判定で本人を選んだ点を数えた。4つの画面幅を合算し、同じ世帯の別画面での観測を含む。「8秒」「30秒」はV5モデルの経過時間。','',
      '## 28体・13地域（4画面幅の合計）','',
      '| 地域 | 基準の初期位置 | 固定+20% | 最適化+20% | 最適化+20%の8秒後 | 最適化+20%の30秒後 | 最適化+20%で12px直進可能な方向（初期） |',
      '|---|---:|---:|---:|---:|---:|---:|']
    for r in REGIONS:
        subjects=[(w,r,28) for w in HEIGHT]
        cells=[measured(data,subjects,l,g,p,idx) for l,g,p,idx in (
            ('fixed',0,'initial',0),('fixed',20,'initial',0),('optimized',20,'initial',0),
            ('optimized',20,'after8',0),('optimized',20,'after30',0),('optimized',20,'initial',2))]
        lines.append('| '+' | '.join([LABELS[r],*cells])+' |')
    lines.extend(['','右端は主人公・恋人・代表仲間の足から12 CSS px、8方向の直線全体がV5の歩行条件を満たした数。V5による迂回や着地点の振替は個別の実ルート試験で測定した。','',
      '## 住民数と倍率（13地域・4幅の初期位置）','',
      '| 住民数 | 配置 | 追加0% | +5% | +10% | +15% | +20% |','|---:|---|---:|---:|---:|---:|---:|'])
    for n in (1,4,10,20,28):
        for layout in ('fixed','optimized'):
            subjects=[(w,r,n) for w in HEIGHT for r in REGIONS]
            cells=[measured(data,subjects,layout,g,'initial',0) for g in EXTRAS]
            lines.append('| '+' | '.join([str(n),'固定' if layout=='fixed' else '最適化',*cells])+' |')
    lines.extend(['','## 28体の自律動作（開始からモデル30秒）','',
      '下表は最適化+20%での4画面幅合計。動いた住民は開始時より足が1モデル単位以上離れた住民。交流は住民同士の正式な social イベント数、接近は正式な近接イベント数を示す。実際の吹き出しは森で別途確認した。','',
      '| 地域 | 足が移動した住民／観測人数 | 歩行距離合計（モデル単位） | 到着 | 交流 | 接近 |','|---|---:|---:|---:|---:|---:|'])
    for r in REGIONS:
        observations=[]
        for w in HEIGHT:
            key=f'{w}/{r}/28/optimized/20'
            row=data['cases'].get(data['sameNativeSeatsAs'].get(key,key),{}).get('after30',{}).get('autonomy')
            if row:observations.append(row)
        if not observations:continue
        sums=[sum(x[i] for x in observations) for i in range(8)]
        lines.append(f'| {LABELS[r]} | {sums[2]}/{28*len(observations)} | {sums[1]:.1f} | {sums[5]} | {sums[6]} | {sums[7]} |')
    lines.extend(['','全地域・全幅・全倍率・各対象役の生データには、受理数と分母、3点のいずれでも選べなかった人数を収録した。[入力の全測定](evidence/input-matrix.json) ／ [測定方法と実ポインターの照合](interaction.md)'])
    args.out.write_text('\n'.join(lines)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('matrix',type=Path);p.add_argument('--out',type=Path,required=True)
    run(p.parse_args())
