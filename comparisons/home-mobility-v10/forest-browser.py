"""Build an offline-readable owner report from the measured, paired forest cells."""
import argparse
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAIRS = [('従来の配置', 'v9', 'v10'), ('V9の調整配置', 'v9-seats', 'v10-reference')]
FIELDS = {
    'normal_first_half': '前半5分の通常歩行（回）',
    'normal_second_half': '後半5分の通常歩行（回）',
    'normal_count_cutoff': '10分の通常歩行（回）',
    'requests_cutoff': '本人の自律経路の要求（回）',
    'plans_cutoff': '成立した経路（回）',
    'plan_rate_cutoff': '経路成立率',
    'step_recovery_excluding_idle_choices': '経路不成立後に本人が歩けた割合（休息・歩行枠待ちで終了した区間を除く）',
    'normal_dist_cutoff_css': '通常歩行の実距離（CSS px）',
    'normal_mean_net_css': '通常歩行1回の平均変位（CSS px）',
    'longest_post_first_refusal_s': '初めて歩いた後の最長不成立（ゲーム内秒）',
    'peer_change_retries': '周囲の変化による再探索（回）',
    'reopened_original_goal_retries': '通路が開いた後の追加再探索（回）',
    'normal_after_received_help': '道を譲ってもらった後の通常歩行（回）',
    'yielded_legs_cutoff': 'ほかの住民に道を譲った歩行（回）',
    'opening_touch_issued': '開幕のドラッグ指示を本人が受理',
    'opening_touch_arrived': '開幕のドラッグで経路終点に到着',
    'aged_touch_issued': '10分後のドラッグ指示を本人が受理',
    'aged_touch_arrived': '10分後のドラッグで経路終点に到着',
}

def rows(path):
    with path.open() as f:
        return list(csv.DictReader(f))

def build(folder, master, output):
    cells = rows(folder/'forest-cells.csv')
    residents = rows(folder/'forest-residents.csv')
    names = dict(re.findall(r"id: '([\w]+)', label: '([^']+)'", master.read_text()))
    cases = {}
    for c in cells:
        index = tuple(c[k] for k in ('width','seed','order','arm'))
        cases[index] = c
    measurements = {}
    for r in residents:
        case = tuple(r[k] for k in ('width','seed','order','arm'))
        measurements.setdefault(case, {})[r['key']] = r
    data = []
    for w,s,o in sorted({k[:3] for k in cases}, key=lambda p:(p!=('390','937','0'),p)):
        for label,prev,new in reversed(PAIRS):
            a,b = (w,s,o,prev),(w,s,o,new)
            if a not in cases or b not in cases:
                continue
            assert cases[a]['initial_sha256']==cases[b]['initial_sha256']
            old,current = measurements[a],measurements[b]
            assert set(old)==set(current) and len(old)==28
            actors=[]
            for key in old:
                row=old[key]
                role = {'pet':'主人公の','partner':'恋人の'}.get(row['role'],'')
                def values(r):
                    values = [r[k] for k in FIELDS]
                    for i,field in enumerate(FIELDS):
                        if '_touch_' in field and r[field.split('_touch_')[0]+'_touch_skipped_reason']:
                            values[i] = ''
                    return values
                actors.append([key,role+names[key.split(':')[1]],values(row),values(current[key])])
            data.append({'label': f'{w}px・乱数{s}・{label}' + ('・仲間の順番を変更' if o!='0' else ''),'residents':actors})
    assert data
    payload = json.dumps({'cases':data,'fields':FIELDS},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    output.write_text((HERE/'forest-browser.html').read_text().replace('/*OBSERVATIONS*/null',payload))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('tables',type=Path)
    p.add_argument('character_master',type=Path)
    p.add_argument('output',type=Path)
    args=p.parse_args()
    build(args.tables,args.character_master,args.output)
