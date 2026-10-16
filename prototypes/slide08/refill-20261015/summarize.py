import json,statistics as st
from pathlib import Path
p=Path(__file__).parent
all=[json.loads(f.read_text()) for f in (p/'results').glob('*.json') if not f.name.endswith('-plan.json')]
def avg(a):return round(st.mean(a),3) if a else None
def summ(ds):
 wins=[d for d in ds if d['metrics']['won']]
 return dict(n=len(ds),reach=sum(d['metrics']['reached08'] for d in ds),pair=sum(d['metrics']['same08'] for d in ds),wins=len(wins),solvedSeeds=sorted(set(d['seed'] for d in wins)),moves= [min([len(d['actions']) for d in wins],default=0),max([len(d['actions']) for d in wins],default=0)],late=avg([d['metrics']['phases'][2]['slideRatio'] for d in ds if d['metrics']['phases'][2]['slideRatio'] is not None]),lateSolved=avg([d['metrics']['phases'][2]['slideRatio'] for d in wins]),used={k:avg([d['metrics']['used'][k] for d in wins]) for k in ['egg','single','bulk']},phases=[{k:avg([d['metrics']['phases'][i][k] for d in ds if d['metrics']['phases'][i][k] is not None]) for k in ['meanPopulation','meanConcentration','meanValidDirections','evolvingSlides','chain2','largeClears','oneKindSteps']} for i in range(3)],maxChain=max(d['metrics']['maxChain'] for d in ds))
groups={}
for d in all:groups.setdefault(d['profile']+'/'+d['gauge']+('/slides' if d['policy']=='slides' else ''),[]).append(d)
out={k:summ(v) for k,v in groups.items()};(p/'SUMMARY.json').write_text(json.dumps({'groups':out,'byPolicy':{k:{q:summ([d for d in v if d['policy']==q]) for q in set(d['policy'] for d in v)} for k,v in groups.items()}},ensure_ascii=False,indent=2))
lines=['# 比較測定（AI探索・人間の達成率ではありません）','','8共通seed × 2方策。各欄の分母16は独立16人でも16seedでもありません。序盤/中盤/終盤は保存操作列の三等分。未解決のbest prefixも含む終盤比率は短い試行に影響されます。解決済みのみの値も併記します。率は探索予算内の確認割合です。','','|方式/ゲージ|08到達/16|同種08成立/16|寿命消滅/16|解決seed/8|確認手数範囲|終盤slide全体/解決のみ|解決列の卵/単体/全体 平均|最大連鎖|','|---|---:|---:|---:|---|---|---|---|---:|']
for k,v in out.items():
 if '/slides' in k:continue
 pct=lambda x:'—' if x is None else f'{x*100:.1f}%'
 lines.append(f"|{k}|{v['reach']}|{v['pair']}|{v['wins']}|{v['solvedSeeds']}|{v['moves']}|{pct(v['late'])}/{pct(v['lateSolved'])}|{v['used']['egg']}/{v['used']['single']}/{v['used']['bulk']}|{v['maxChain']}|")
lines+=['','## 序盤→中盤→終盤の占有数・集中度','','|方式|平均占有数|最大種族比率|有効スライド方向数|2連鎖以上の操作数（各期平均）|','|---|---|---|---|']
for k,v in out.items():
 if '/slides' in k:continue
 lines.append('|'+k+'|'+'|'.join(' → '.join(str(x[t]) for x in v['phases']) for t in ['meanPopulation','meanConcentration','meanValidDirections','chain2'])+'|')
lines+=['','## スライドのみの別探索','','アイテムを禁止した8seed×5設定(E/A/B/C16-20/D0)では40件中0件の寿命消滅。幅32・最大240手・60,000ノード。これは不可能の証明ではありません。アイテムを抑えた主探索の成功だけで「スライド中心の完成形」と判断できません。','','## 再生と保存','','全376操作列（解法152・未解決prefix224）を初期状態、各手SHA-256、補充列、終状態で再生照合。`results.tar.gz`をこのディレクトリで展開し、`node replay.mjs`で検証。新設定に旧証明を流用していません。`SUMMARY.json`に方策別・三期間別・盤面整理数も保存。']
(p/'MEASUREMENTS.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:28]))
# Additional descriptive statistics, based on saved traces rather than new searches.
extra=['','## 連鎖・種族貢献・seed差（現行ゲージ、両方策の全prefixを含む）','','2連鎖率は有効操作数で重み付け。終盤スライドによる進化率は終盤slideのうち進化イベントがある割合。種族貢献は各操作の進化段階差を種族別に合計したもの（現行ゲージの獲得前の値、上限による切捨て前）。卵の実受取数とは別。多数種族への統一の因果効果を示すものではない。','','|方式|2連鎖以上/全操作|終盤slide進化率|進化段階差：種族0/1/2|終盤に1種族だけの手/終盤全手|','|---|---|---|---|---|']
for profile in ['E','A','B','C16-20','D0']:
 ds=groups[profile+'/current'];rows=[r for d in ds for r in d['rows']];late=[r for d in ds for r in d['rows'][len(d['rows'])*2//3:]];slides=[r for r in late if r['type']=='slide'];rewards=[sum(r['rewardsByKind'][k] for r in rows) for k in range(3)]
 extra.append(f"|{profile}|{sum(r['chain']>=2 for r in rows)}/{len(rows)} ({sum(r['chain']>=2 for r in rows)/len(rows):.1%})|{sum(r['evolvingSlide'] for r in slides)}/{len(slides)} ({sum(r['evolvingSlide'] for r in slides)/len(slides):.1%})|{rewards}|{sum(r['allOne'] for r in late)}/{len(late)}|")
extra+=['','|seed|E focus/diverse|A focus/diverse|B focus/diverse|C16-20 focus/diverse|D0 focus/diverse|','|---|---|---|---|---|---|']
for seed in range(1,9):
 cells=[]
 for profile in ['E','A','B','C16-20','D0']:
  ds=groups[profile+'/current'];cells.append(' / '.join(str(next(d for d in ds if d['seed']==seed and d['policy']==pol)['metrics']['moves'])+'手' if next(d for d in ds if d['seed']==seed and d['policy']==pol)['status']=='solved' else '未証明' for pol in ['focus','diverse']))
 extra.append('|'+str(seed)+'|'+'|'.join(cells)+'|')
extra+=['','同じ予算でもseedと方策で確認の可否・手数が大きく異なる。盤面が整理された後に立て直しやすいかは、保存した占有数・有効方向数・4体以上減少の回数を手がかりにHuman QAで確認する。実際の「立て直せた感覚」は自動探索では測れていない。']
with (p/'MEASUREMENTS.md').open('a') as f:f.write('\n'.join(extra)+'\n')
