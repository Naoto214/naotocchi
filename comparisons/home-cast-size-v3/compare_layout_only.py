"""Measure the same V2-size bodies on every independently tested candidate opening."""
import argparse
import json
from pathlib import Path

from evaluate_limits import REGIONS, WIDTHS, COUNTS
from geometry_optimized import modes
from geometry_matrix import compare, read_phases


COLUMNS = ['pairs', 'sharedInkPct', 'heroExposedPct', 'partnerExposedPct',
           'clipped', 'hidden', 'tapCorrect', 'tapAttempts', 'heroTapCorrect', 'partnerTapCorrect']


def summarize(raw, region, game):
    result = {}
    for label, phase in read_phases(raw):
        phase['p']['region'] = region
        geometry = compare(phase, 0, game)
        hits = phase['taps']['0']['roles']
        result[label] = [
            *geometry[3:9], sum(h[0] for h in hits.values()), sum(h[1] for h in hits.values()),
            hits['pet'][0], hits['partner'][0] if hits['partner'][1] else None,
        ]
    return result


def run(args):
    table = modes(args.game)
    hints = modes(args.game, hints=True)
    evidence = {}
    rows = []
    total = 0
    for width in WIDTHS:
        for region in REGIONS:
            for count in COUNTS:
                key = f'{width}-{region}-{count}'
                groups = table[key]
                distinct = sorted(set(groups.values()) - {0})
                if not distinct:
                    continue
                fixed_raw = json.loads((args.fixed/(key+'.json')).read_text())
                fixed = summarize(fixed_raw, region, args.game)
                row = {'fixed':fixed, 'alternatives':{}}
                for representative in distinct:
                    raw = json.loads((args.optimized/str(representative)/(key+'.json')).read_text())
                    assert raw['hints'] == hints[key][str(representative)], key
                    candidate = summarize(raw, region, args.game)
                    sizes = [int(g) for g, rep in groups.items() if rep == representative]
                    row['alternatives'][str(representative)]={'seatExtra':sizes,'phases':candidate}
                    total += 1
                    if count == 4 and (width,region) in [(375,'home'),(375,'city'),(390,'forest'),(430,'home')]:
                        shared = [t for t in ('initial','after8','after30') if t in fixed and t in candidate]
                        def cell(data):
                            return f"{min(data[t][3] for t in shared):.1f}%／{min(data[t][6] for t in shared)}/{fixed['initial'][7]}"
                        rows.append(f'| {REGIONS[region]}・{width}px・4体 | +{representative}%用 | {cell(fixed)} | {cell(candidate)} |')
                evidence[key] = row
    args.json.write_text(json.dumps({'visibleExtra':0,'columns':COLUMNS,'distinctAlternatives':total,'cases':evidence},
                                   ensure_ascii=False,separators=(',',':'))+'\n')
    doc = ['# 現行の大きさで初期配置だけを比べる','',
           f'異なる初期配置を持つ{len(evidence)}世帯条件について、{total}種類の候補配置を現行の主人公120%・恋人120%・仲間105%で再評価した。原画の投影、手前の住民による重なり、V5のタップ判定を初期と8秒後に比較し、双方に30秒後の観測がある条件はその時点も含めた。','',
           '試遊の「設定」でサイズ別の配置を選び、比較したい候補の倍率に切り替えてから、その候補配置を保持して「現行」に戻す。画面の「固定」で自律移動も止めると、同じ足位置のまま5段階を切り替えられる。通常の「現行」は従来のV2配置を再現する。','',
           '表は、見えた恋人の輪郭の最小値と、全住民の輪郭上で正しく選択できた点数の最小値。それぞれの最小値は別の時点に生じることがある。両列とも表示倍率は現行。','',
           '| 場面 | 比較した初期配置 | V2の配置 | 候補の配置 |','|---|---|---:|---:|',*rows,'',
           '[全候補の配置だけを変えた測定](evidence/layout-only.json) ／ [サイズと配置の両方を比較した上限](LIMITS.md)']
    args.doc.write_text('\n'.join(doc)+'\n')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for key in ('fixed','optimized','game','json','doc'):
        p.add_argument(key,type=Path)
    run(p.parse_args())
