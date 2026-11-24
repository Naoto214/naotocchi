"""Evaluate the measured trial using explicit, relative readability and touch criteria."""
import argparse
from collections import Counter
import json
from pathlib import Path

WIDTHS = [320, 375, 390, 430]
COUNTS = [1, 4, 10, 20, 28]
GAINS = [0, 5, 10, 15, 20]
REGIONS = {'home':'おうち','forest':'もり','river_lake':'みずべ','city':'とかい','countryside':'いなか','mountain':'やま','snow':'ゆきぐに','sea':'うみ','jungle':'ジャングル','desert':'さばく','deepsea':'しんかい','star_stop':'ほしぞらのていりゅうじょ','memory_lake':'きおくのみずうみ'}


def read(p): return json.loads(p.read_text())


def observed(geometry, inputs, width, region, count, layout, gain, include_later=True):
    scene = f'{width}/{region}/{count}/{layout}'
    key = f'{scene}/{gain}'
    record = geometry['cases'][key]
    input_key = scene if layout == 'fixed' else key
    while input_key in inputs.get('sameNativeSeatsAs', {}): input_key = inputs['sameNativeSeatsAs'][input_key]
    tested = inputs['cases'][input_key]
    samples = []
    for time in ('initial','after8','after30'):
        if time=='after30' and (not include_later or time not in record): continue
        shape = dict(zip(geometry['columns'],record[time]))
        row = tested[time]
        points = row['taps'][str(gain)]
        hit, attempts = sum(points[i] for i in (0,2,4)),sum(points[i] for i in (1,3,5))
        exits = row['direct']; leads = [value for role,value in exits.items() if role in ('pet','partner')]
        direct = sum(mask.bit_count() for values in leads for mask in values)/(len(leads)*16)
        lead_hits=[points[i] for i in (0,2) if points[i+1]]
        samples.append(dict(shape,hit=hit,attempts=attempts,hitPct=100*hit/attempts,
                            minLeadHits=min(lead_hits),zeroTouch=points[6],direct=direct))
    assert len(samples)>=2 and samples[0]['heroHeight']>0, key
    def worst(name):return max(r[name] for r in samples)
    def least(name):return min((r[name] for r in samples if r[name] is not None),default=None)
    return {'clip':worst('clippedCount'),'hidden':worst('fullyHiddenCount'),'area':worst('sharedInkPct'),
            'hero':least('heroExposedPct'),'partner':least('partnerExposedPct'),'pairs':worst('overlappingPairs'),
            'hit':100*sum(r['hit'] for r in samples)/sum(r['attempts'] for r in samples),
            'zeroTouch':worst('zeroTouch'),'minLeadHits':least('minLeadHits'),'minHitPct':least('hitPct'),
            'direct':100*sum(r['direct'] for r in samples)/len(samples),
            'startSizes':[samples[0][k] for k in ('heroHeight','partnerHeight','companionMedian')]}


def reasons(reference, candidate, n, slack=0):
    reasons=[]
    if candidate['clip']>reference['clip']: reasons.append('見切れ')
    if candidate['hidden']>reference['hidden']: reasons.append('本体消失')
    if candidate['area']>reference['area']+3+slack: reasons.append('重なり面積')
    if candidate['pairs']>reference['pairs']+max(2,n//8)+slack: reasons.append('重なる組数')
    for key,title in [('hero','主人公の露出'),('partner','恋人の露出')]:
        if reference[key] is not None and candidate[key]<min(85,reference[key]-5)-slack: reasons.append(title)
    if candidate['hit']<reference['hit']-5-slack: reasons.append('タップ')
    if candidate['zeroTouch']>reference['zeroTouch']+1: reasons.append('タップできる住民数')
    # Two of 16 sampled straight directions, averaged over the pair and observed phases.
    if candidate['direct']<reference['direct']-12.5-slack: reasons.append('短いドラッグ出口')
    return reasons


def run(args):
    geom, inputs = read(args.geometry),read(args.inputs)
    rows = {}; choices={}; independent={}; failures=Counter(); typical={}
    for w in WIDTHS:
        for region in REGIONS:
            for n in COUNTS:
                key=f'{w}/{region}/{n}'
                reference=observed(geom,inputs,w,region,n,'fixed',0)
                short_reference=observed(geom,inputs,w,region,n,'fixed',0,False)
                by_gain={}
                independent[key]={}
                for gain in GAINS:
                    options={}
                    independent[key][gain]={}
                    for layout in ('fixed','optimized'):
                        sample=observed(geom,inputs,w,region,n,layout,gain)
                        both_later=all('after30' in geom['cases'][case] for case in
                                       (f'{key}/fixed/0',f'{key}/{layout}/{gain}'))
                        if both_later:
                            issues=reasons(reference,sample,n)
                        else:
                            paired=observed(geom,inputs,w,region,n,layout,gain,False)
                            issues=reasons(short_reference,paired,n)
                        options[layout]=issues
                        # A pre-existing unreadable pair must not certify a global standard.
                        absolute=[]
                        if min(x for x in (sample['hero'],sample['partner']) if x is not None)<(200/3):
                            absolute.append('主人公・恋人の輪郭が3分の2未満')
                        if sample['minLeadHits']==0: absolute.append('主人公・恋人のタップ3点が全滅')
                        if sample['minHitPct']<(200/3): absolute.append('全員のタップ成功が3分の2未満')
                        independent[key][gain][layout]=absolute
                        if n==28 and layout=='optimized':failures.update(issues)
                    by_gain[gain]=options
                choices[key]=by_gain
            def allowed(g,n,layout=None):
                options=choices[f'{w}/{region}/{n}'][g]
                return not options[layout] if layout else any(not r for r in options.values())
            def acceptable(ns,layout=None):
                return [g for g in GAINS if all(allowed(g,n,layout) for n in ns)]
            rows[f'{w}/{region}']={'28':acceptable([28]),'all':acceptable(COUNTS),
                        '28Fixed':acceptable([28],'fixed'),'28Optimized':acceptable([28],'optimized'),
                        'byCount':{str(n):acceptable([n]) for n in COUNTS}}
            def practical(ns):
                return [g for g in GAINS if all(any(not choices[f'{w}/{region}/{n}'][g][layout]
                            and not independent[f'{w}/{region}/{n}'][g][layout] for layout in ('fixed','optimized')) for n in ns)]
            rows[f'{w}/{region}'].update(practical28=practical([28]),practicalAll=practical(COUNTS))
    common={name:[g for g in GAINS if all(g in row[name] for row in rows.values())] for name in ('all','28','28Fixed','28Optimized')}
    for g in GAINS:
        typical[str(g)]={name:sum(g in row[name] for row in rows.values()) for name in ('all','28','28Fixed','28Optimized')}
    def scale(g):return '現行' if g==0 else f'+{g}%'
    for_nearest = lambda acceptable,goal: min(acceptable,key=lambda g:(abs(g-goal),g))
    standard=max(common['all']); max28=max(common['28'])
    adaptive = {k:for_nearest([g for g in v['all'] if g<=standard+5],standard+5) for k,v in rows.items()}
    regional = {k:max(v['all']) for k,v in rows.items()}
    report={'widths':WIDTHS,'counts':COUNTS,'extra':GAINS,'common':common,'passCounts':typical,'regionalCeilings':rows,
            'allCountsCommon':standard,'allRegions28':max28,'oneStepRegional':adaptive,'unrestrictedRegional':regional,
            'issuesAt28Optimized':dict(failures),'caseReasons':choices}
    report['readabilityAndTargetingReasons']=independent
    report['practicalCommon']={key:[g for g in GAINS if all(g in r[key] for r in rows.values())]
                               for key in ('practicalAll','practical28')}
    policies={}
    for label, gains in [('common',{k:standard for k in rows}),('oneStep',adaptive),('regionalMaximum',regional)]:
        samples=[]; jumps=[]
        for w in WIDTHS:
            at_width=[gains[f'{w}/{region}'] for region in REGIONS]
            jumps.append(100*((100+max(at_width))/(100+min(at_width))-1))
            for region, gain in zip(REGIONS,at_width):
                accepted=choices[f'{w}/{region}/28'][gain]
                layout='fixed' if accepted['optimized'] else 'optimized'
                samples.append(observed(geom,inputs,w,region,28,layout,gain))
        policies[label]={'meanExtra':round(sum(gains.values())/len(gains),2),
                         'maxHeroMultiplierJumpAtEqualDepth':round(max(jumps),2),
                         'meanMinimumHeroExposure':round(sum(row['hero'] for row in samples)/len(samples),2),
                         'meanMinimumPartnerExposure':round(sum(row['partner'] for row in samples)/len(samples),2),
                         'meanPeakSharedInk':round(sum(row['area'] for row in samples)/len(samples),2)}
    report['policyComparison']=policies
    args.out.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
    lines=['# 地域・画面幅ごとの実用上限','',
           '役割の基準は主人公120%・恋人120%・仲間105%。表はそこからの追加倍率。この試作で比較した離散的な5段階について、画面と入力の記録から上限を求めた。', '',
           '## 判定の目安','',
           '比較の相手は同じ地域・幅・人数のV2採用配置。全条件を初期とV5の8秒後でそろえ、両方に30秒後の観測がある条件（28体全件と一部の少人数）では30秒後も含めた。見切れた本体数と本体が消える人数の最大値が増えないことを確認した。延べ輪郭の重なり面積は最大値の差を3ポイントまで、輪郭が4画素以上重なる組数は最大値の差を2組（28体では3組）までとした。主人公と恋人は最も隠れた時点で85%以上見えるか、現行の最低可視率からの低下が5ポイント以内であることを目安にした。', '',
           'タップは元画像上の3点で本人を選べる率を人数・観測時点で集計し、低下5ポイントまでとした。3点とも本人を選べない住民は現行から1体増まで。足元から4・12 CSS px、各8方向を調べた直線出口は、主人公・恋人の平均で12.5ポイント低下までを目安にした。V5に迂回や代替地点を含めて実際に依頼した結果と端末入力は操作報告に分けて掲載する。', '',
           'これらは今回の比較用の判断値。現在の重なりや秒単位の停止も基準に含まれる。固定・サイズ別の両方を評価し、少なくとも一方が目安を満たした段階を表に載せた。倍率によって初期位置や経路が変わるため、ある段階が外れても、その上の段階が通る場合がある。全段階の可否と原因は数値記録で確認できる。', '',
           '## 28体で現行比の目安を通る上限','', '| 地域 | 320px | 375px | 390px | 430px |','|---|---:|---:|---:|---:|']
    lines.extend('| '+label+' | '+' | '.join(scale(max(rows[f'{w}/{r}']['28'])) for w in WIDTHS)+' |' for r,label in REGIONS.items())
    lines+=['','## 全5人数で現行比の目安を通る上限','','| 地域 | 320px | 375px | 390px | 430px |','|---|---:|---:|---:|---:|']
    lines.extend('| '+label+' | '+' | '.join(scale(max(rows[f'{w}/{r}']['all'])) for w in WIDTHS)+' |' for r,label in REGIONS.items())
    def practical_cell(row):
        def cap(key): return scale(max(row[key])) if row[key] else '該当なし'
        return f"{cap('practical28')}／{cap('practicalAll')}"
    lines+=['','## 住民を見つけて触れられることを含めた実用目安','',
            '各セルは28体時／全5人数の上限。現行比に加え、各観測時点で主人公と恋人の輪郭が3分の2以上見え、それぞれ3点中1点以上から本人を選択でき、全住民のタップも3分の2以上成功することを求めた。比較用に設けた目安であり、見た目や操作の好みには個人差がある。「該当なし」は試した初期配置・倍率でこの条件を通るものがなかったことを示す。','','| 地域 | 320px | 375px | 390px | 430px |','|---|---:|---:|---:|---:|']
    lines.extend('| '+label+' | '+' | '.join(practical_cell(rows[f'{w}/{r}']) for w in WIDTHS)+' |' for r,label in REGIONS.items())
    lines+=['','## 同じ画面幅で全地域の倍率をそろえる場合','',
            '地域を変えても倍率が変わらない方式の比較。左2列は現行からの悪化幅、右2列は輪郭・タップの絶対目安も通る最大の共通段階。','','| 幅 | 28体・現行比 | 全人数・現行比 | 28体・実用目安 | 全人数・実用目安 |','|---:|---:|---:|---:|---:|']
    for w in WIDTHS:
        caps=[]
        for key in ('28','all','practical28','practicalAll'):
            gains=[g for g in GAINS if all(g in rows[f'{w}/{r}'][key] for r in REGIONS)]
            caps.append(scale(max(gains)) if gains else '該当なし')
        lines.append(f'| {w}px | '+' | '.join(caps)+' |')
    lines+=['','## 倍率と初期配置の効果','','下表は13地域×4幅の52条件が分母。固定／サイズ別は28体時の通過条件数。','',
            '| 追加倍率 | 固定 | サイズ別 | いずれか・28体 | いずれか・全人数 |','|---|---:|---:|---:|---:|']
    for g in GAINS:
        p=typical[str(g)];lines.append(f"| {scale(g)} | {p['28Fixed']} | {p['28Optimized']} | {p['28']} | {p['all']} |")
    lines+=['','## 共通倍率と地域別倍率','',f'全13地域・4幅・5人数で共通に目安を通る最大段階は **{scale(standard)}**。28体に限った共通上限は **{scale(max28)}**。', '',
            f'地域ごとに全人数で通る上限まで上げた場合、共通倍率より大きくできるのは52条件中{sum(g>standard for g in regional.values())}条件。地域間の段差を1段階に制限した試算では{sum(g>standard for g in adaptive.values())}条件で大きくできる。いずれも同じ人数・幅で比較し、通常の奥行きによる大小とは分けている。地域切替時に倍率を変える方式は本人の採用判断に残す。', '',
            '[全条件の判定と未達理由](evidence/limits.json)']
    lines+=['','各方式の倍率を28体の同じ52条件に適用した試算。基準を通る場合はサイズ別配置を使い、それ以外は固定配置を使った。地域間の段差は同じ幅・同じ奥行きで主人公の倍率だけを比べた最大値。', '',
            '| 方式 | 平均追加倍率 | 地域切替時の最大段差 | 主人公／恋人の最低可視率の平均 | 最大重なり面積の平均 |','|---|---:|---:|---:|---:|']
    for key,title in [('common','共通'),('oneStep','地域別・1段差まで'),('regionalMaximum','各地域の全人数上限')]:
        data=policies[key];lines.append(f"| {title} | {data['meanExtra']}% | {data['maxHeroMultiplierJumpAtEqualDepth']}% | {data['meanMinimumHeroExposure']}%／{data['meanMinimumPartnerExposure']}% | {data['meanPeakSharedInk']}% |")
    lines+=['','## 本人確認に向けた推奨','',
            f'全13地域・全人数に単一の標準を置く場合の推奨は **{scale(standard)}**。描画できた上端は今回試した+20%。それを超える倍率の計測は今回の範囲外。画面に表示できた倍率でも、重なりやタップによって実用上限は下がる。','',
            '28体で縦に広い3画面では、+20%でも全13地域が輪郭とタップの目安を通った。320×568では、まず森で現行と+5%、みずべで現行と+10%、海で現行と+20%を同じ足場で見比べると、地域差を確かめやすい。少人数では住民1体が占める範囲が広く、おうち4体で配置だけを変えた場合も比較対象になる。','',
            '場面に応じて自動調整する方式では、候補倍率を最大1段階に制限すれば、地域移動で主人公の倍率が変わる量も最大5%に抑えられる。各地域を測定上限まで上げた場合の最大段差は上表に示した。どちらも今回の試遊では任意の比較操作にとどめた。','',
            '地域ごとの結論は秋・晴れ・昼の同じ世帯で得た観測。Linux版WebKitでは320pxの森でChromiumより恋人が隠れた。物理iPhoneでの指による選びやすさ、実表示FPS、発熱と、長時間の重なり頻度は別途確認が必要。[実画面の校正](GEOMETRY.md) ／ [入力](interaction.md) ／ [処理時間](PERFORMANCE.md)']
    args.doc.write_text('\n'.join(lines)+'\n')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['geometry','inputs','out','doc']:parser.add_argument(name,type=Path)
    run(parser.parse_args())
