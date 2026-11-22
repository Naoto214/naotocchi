"""Audit original regional ZIPs and summarize every measured household with the V12 definitions."""
import argparse
from collections import Counter
import gzip
import json
from pathlib import Path
import zipfile

from matrix_worker_v13 import ARMS, BASE, HERE, encode, fixtures, old, prior, sha, validate
import matrix_report_v12 as previous

legacy, v11 = previous.legacy, previous.v11
FIELDS = ('normalWalkers', 'arrival', 'near4', 'tapSelected', 'bothFailed', 'agedDragArrival')
DENOMINATORS = ('residents', 'drags', 'drags', 'tapSent', 'agedDragCount', 'agedDragCount')
VIOLATIONS = ('bounds', 'terrain', 'occlusion', 'speed', 'swept', 'inputUnsafe', 'inputSwept',
              'outsideActorBounds', 'nonGround', 'hidden', 'frozenUnsafe', 'frozenSwept', 'reloadUnsafe', 'reloadSwept')


def select_archives(root, runs):
    # If a job stopped after several cells, keep each validated atomic capture.
    # Later runs explicitly supersede any overlapping coordinate, without pooling trials.
    index, records = {}, []
    for run in runs:
        directory = root / run
        record = json.loads((directory / 'receipt.json').read_bytes())
        old.require(record['run'] == run, 'unexpected run receipt')
        records.append(record)
        for region, artifact in record['regions'].items():
            path = directory / (region + '.zip')
            old.require(path.stat().st_size == artifact['bytes'] and sha(path.read_bytes()) == artifact['sha256'], 'artifact checksum mismatch')
            with zipfile.ZipFile(path) as archive:
                for name in archive.namelist():
                    if name.endswith('.json.gz'):
                        index[name] = (path, record['headSha'], run)
    expected = {f'{r}-{n}-{w}-{a}.json.gz' for r in old.REGIONS for n in old.COUNTS for w in old.WIDTHS for a in ARMS}
    old.require(set(index) == expected, f'Incomplete matrix: missing {sorted(expected-set(index))[:20]}, extra {sorted(set(index)-expected)[:20]}')
    return index, records


def notes(result):
    rows = []
    for a, q in result['totals'].items():
        name = 'V12・同時対照' if a == 'v12' else a.upper().replace('V13-', '')
        rows.append('| ' + name + ' | ' + ' | '.join(f'{q[k]:,}/{q[n]:,}' for k,n in zip(FIELDS, DENOMINATORS)) + ' |')
    n = result['safety']; t = result['totals']; pairs = result['comparisons']
    narrative = []
    for label, values in pairs.items():
        forest = values['forest']; others = values['elsewhere']
        narrative.append(f"- {label}。森の通常歩行者は獲得 {forest['gains']}・喪失 {forest['losses']}、森以外は獲得 {others['gains']}・喪失 {others['losses']}。同じ300秒時点からのドラッグで到着有無が変わった家庭は全地域で {forest['frozenArrivalFlips']+others['frozenArrivalFlips']} 件。")
    return '\n'.join(['# 全13地域の5分間の生活と指操作', '',
        '13地域 × 住民1・4・10・20・28体 × 幅320・375・390・430 CSS px。V12同時対照とA〜Dの計1,300家庭を、それぞれ独立してChromiumで起動した。全家庭で昼・サイズB・固定席・同一の乱数系列と開幕活動予定を使った。A〜Dは曲がる道譲りを無効にしている。', '',
        '| 比較 | 通常歩行 | 開幕到着 | 指先4px | タップ選択 | 自律とドラッグ両方失敗 | 5分後到着 |',
        '|---|---:|---:|---:|---:|---:|---:|',
        '| V12・公表値 | 3,217/3,276 | 911/1,058 | 522/1,058 | 246/260 | 2/260 | 234/260 |', *rows, '',
        '通常歩行は住民自身の目的地へ0.75 CSS pxを超えて近づき、退避を除く8 CSS px以上の変位で到着した住民。5分はモデル時計の300秒。生活判断と歩行は実ゲームを走らせ、実時間フレーム性能は別試験で測定する。両方失敗はV12と同じ集計で、対象住民に自律の経路不成立があり歩行開始がなく、ドラッグ指令も発行されたが足が踏み出せなかった家庭。', '',
        '## 条件を一つずつ変えた比較', '', *narrative, '',
        'B−Aは森の土道の追加、C−Bは追加の局所退避地、D−Cは初期席の差。すべての案で体格と接触判定は共通。V12−Aでは曲がる道譲りの有無が違う。画面描画の同期待ちや表情更新の発生時刻はブラウザー上で揺れるため、森以外に生じる差は地形変更の効果から切り分ける。', '',
        '## 安全性・保存復帰', '',
        '| 条件 | 地形 | 遮蔽 | 速度 | すれ違い接触 | 操作時の違反 | 保存復帰 |', '|---|---:|---:|---:|---:|---:|---:|',
        *['| '+a+' | '+' | '.join(str(x) for x in (s['terrain'],s['occlusion'],s['speed'],s['swept'],sum(s[k] for k in ('inputUnsafe','inputSwept','frozenUnsafe','frozenSwept','reloadUnsafe','reloadSwept')),s['confirmedSaveRestore']))+' |' for a,s in n.items()], '',
        '各地域の28体・390pxで、ゲームの保存関数が書いた所持金・成長段階・装備・恋人・仲間・保存版を再読込し、復帰後の実指操作を確認した。保存試験の対象は全13地域 × 5案。', '',
        '## 記録と再現', '',
        '開幕はV12と同じ画面上の始点・終点へ信頼済みタッチを送る。席を変えた案では新しい席を保持し、初期配置の効果を測る。5分後の操作は二種類ある。表の5分後到着は各家庭が独自に生活した直後の入力。別の対照では、V12試験から保存した同一家庭の足・時計・乱数・目標と指座標を各版で復元し、同じ入力を送る。この対照の復元では中断中の経路探索キャッシュを全案で消去した。', '',
        '元のV12 ZIPから抽出した260家庭の固定状態は `matrix-fixtures/` に収録。`matrix_fixtures.py` は元ZIPと各セルのSHA-256を再照合する。`.github/workflows/home-mobility-v13-matrix.yml` は全案の生データを地域別ZIPに保存。`matrix_collect.py` で公開チェックサムと照合し、`matrix_report_v13.py` で260条件が全案にそろったことと入力・ネイティブ歩行を再検証してから集計する。', '',
        '地域・住民数・幅別の数値は `evidence/matrix-groups.csv`、各家庭と各案の結果は `evidence/matrix-households.csv`、失敗を含む個々の操作・住民別の正規化記録は数値アーカイブ、各原本ZIPの識別子とSHA-256は `evidence/matrix-receipt.json` に収録。iPhone Safari実機での地域別回帰は未測定。', ''])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archives', required=True, type=Path)
    p.add_argument('--runs', nargs='+', required=True)
    p.add_argument('--out', type=Path, default=HERE / 'evidence')
    p.add_argument('--normalized', type=Path, required=True)
    a = p.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    a.normalized.mkdir(parents=True, exist_ok=True)
    index, run_receipts = select_archives(a.archives, a.runs)
    tape = prior.v9.history()
    v12_identity = json.loads((HERE.parent/'home-mobility-v12/evidence/matrix-receipt.json').read_bytes())['identity']['v12']
    datasets = {arm:([],[],[],[]) for arm in ARMS}
    safety = {arm:Counter() for arm in ARMS}
    identity, resources, sources = {}, {}, Counter()
    homes, touches, changes, cells = [], [], [], []
    comparisons = {f'{a} → {b}': {key:Counter() for key in ('forest','elsewhere')} for a,b in zip(ARMS,ARMS[1:])}
    handles = {}
    try:
        for region in old.REGIONS:
            all_fixtures = fixtures(region)
            for count in old.COUNTS:
                for width in old.WIDTHS:
                    f = all_fixtures[f'{count}-{width}']
                    paired = {}
                    for arm in ARMS:
                        name = f'{region}-{count}-{width}-{arm}.json.gz'
                        path, revision, run = index[name]
                        if path not in handles:
                            handles[path] = zipfile.ZipFile(path)
                        blob = handles[path].read(name)
                        c = json.loads(gzip.decompress(blob))
                        old.require((c['region'], c['count'], c['width'], c['arm'], c['base'], c['revision']) ==
                                    (region,count,width,arm,BASE,revision), 'incorrect cell source, revision or coordinates')
                        validate(c, f, tape)
                        d = c['arms'][arm]
                        script = {'scripts':d['hashes'], 'entry':c['entry']}
                        old.require(identity.setdefault(arm,script)==script, f'mixed native source: {arm}')
                        if arm=='v12':
                            old.require(script==v12_identity, 'published V12 bytes differ from concurrent control')
                        for key,value in d['loaded'].items():
                            old.require(resources.setdefault(arm,{}).setdefault(key,value)==value, 'loaded resource changed across same variant')
                        sources[(run,arm)] += 1
                        rows = tuple([] for _ in range(4))
                        v11.add_household(c,arm,*rows,safety[arm],Counter())
                        totals = legacy.digest_group(*rows)
                        for target, group in zip(datasets[arm], rows):
                            target.extend(group)
                        frozen = d['frozenDrag']['row']
                        replay = legacy.prior.drag_row(c,arm,'frozen-300',frozen,'frozen-300')
                        touches.append(replay)
                        s = safety[arm]
                        s['frozenUnsafe'] += frozen['unsafeSteps']; s['frozenSwept'] += frozen['sweptViolations']
                        if 'reloaded' in d:
                            s['reloadUnsafe'] += d['reloaded']['drag']['unsafeSteps']; s['reloadSwept'] += d['reloaded']['drag']['sweptViolations']
                        home = {'region':region,'count':count,'width':width,'arm':arm,**{k:totals[k] for k in (*FIELDS,'residents','drags','tapSent','agedDragCount')},
                                'seed':d['seed'],'openingSHA256':d['openingSHA256'],'agedFeetSHA256':sha(encode(d['aged']['opening'])),
                                'seatChanges':'|'.join(q['key'] for q in d['seatChanges']), 'frozenArrival':replay['arrival'],
                                'frozenNear4':replay['nearFinger'], 'frozenOutcome':old.canonical(prior.drop_outcome(frozen)),
                                'syncCalls':d['aged']['sync']['calls'],'syncMoved':len(d['aged']['sync']['shifts']),
                                'observerErrorsBeforeValidTrial':len(c['priorObserverErrors']), 'sourceRun':run}
                        homes.append(home)
                        cells.append({'raw':name,'run':run,'sha256':sha(blob),'v12RawCellSHA256':f['v12RawCellSHA256']})
                        paired[arm]=(home,{r['key']:r for r in rows[0]})
                    for source, dest in zip(ARMS,ARMS[1:]):
                        a0, old_people = paired[source]; a1, new_people = paired[dest]
                        track = comparisons[f'{source} → {dest}']['forest' if region=='forest' else 'elsewhere']
                        track['frozenArrivalFlips'] += a0['frozenArrival'] != a1['frozenArrival']
                        track['sameAgedFeet'] += a0['agedFeetSHA256'] == a1['agedFeetSHA256']
                        track['sameOpeningState'] += a0['openingSHA256'] == a1['openingSHA256']
                        track['agedArrivalFlips'] += a0['agedDragArrival'] != a1['agedDragArrival']
                        for key in old_people:
                            before, after = old_people[key], new_people[key]
                            ok0, ok1 = bool(before['normalCompletions']),bool(after['normalCompletions'])
                            track['gains'] += ok1 and not ok0; track['losses'] += ok0 and not ok1
                            if ok0 != ok1 or (before['longestFailureSec']>=60) != (after['longestFailureSec']>=60):
                                changes.append({'region':region,'count':count,'width':width,'from':source,'to':dest,'key':key,
                                    'normalBefore':before['normalCompletions'],'normalAfter':after['normalCompletions'],
                                    'longestFailureSecBefore':before['longestFailureSec'],'longestFailureSecAfter':after['longestFailureSec']})
    finally:
        for h in handles.values(): h.close()
    groups = previous.add_group(datasets)
    totals = {r['arm']:r for r in groups if r['group']=='all'}
    for row in totals.values():
        old.require([row[n] for n in ('residents','drags','tapSent','agedDragCount')] == [3276,1058,260,260], 'wrong published denominator')
    historical = dict(zip(FIELDS, (3217,911,522,246,2,234)))
    for arm,s in safety.items():
        old.require(s['confirmedSaveRestore'] == 13 and s['frames'] == 1560, 'missing restore or 60s samples')
    result = {'cellsPerArm':260,'nativeHouseholds':len(cells),'ageModelSeconds':300,'historical':historical,'totals':totals,'safety':safety,
              'comparisons':comparisons,'frozen300':{arm:legacy.prior.metrics([r for r in touches if r['arm']==arm]) for arm in ARMS},
              'observerRetries':sum(r['observerErrorsBeforeValidTrial'] for r in homes),
              'observedViolations':{arm:{k:s[k] for k in VIOLATIONS} for arm,s in safety.items()}}
    for i, fname in enumerate(('residents','opening','aged','dual')):
        legacy.csv_write(a.normalized/f'matrix-{fname}.csv.gz',[r for arm in ARMS for r in datasets[arm][i]])
    legacy.csv_write(a.normalized/'matrix-frozen.csv.gz',touches)
    legacy.csv_write(a.out/'matrix-groups.csv',groups)
    legacy.csv_write(a.out/'matrix-households.csv',homes)
    v11.write_table(a.out/'matrix-walk-changes.csv',changes,('region','count','width','from','to','key'))
    legacy.csv_write(a.out/'matrix-cells.csv',cells)
    legacy.write_json(a.out/'matrix-results.json',result)
    receipt = {'base':BASE,'identity':identity,'resources':resources,'runs':run_receipts,
               'selectedCellsByRunAndArm':{run:{arm:sources[(run,arm)] for arm in ARMS} for run in a.runs},
               'normalized':{x.name:{'sha256':sha(x.read_bytes()),'bytes':x.stat().st_size} for x in sorted(a.normalized.glob('matrix-*.csv.gz'))}}
    legacy.write_json(a.out/'matrix-receipt.json',receipt)
    (a.out.parent/'regional.md').write_text(notes(result))
    print('Verified',len(cells),'independent native observations:',{k:{field:v[field] for field in FIELDS} for k,v in totals.items()})


if __name__ == '__main__':
    main()
