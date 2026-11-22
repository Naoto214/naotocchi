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
              'outsideActorBounds', 'nonGround', 'hidden', 'inputPeerUnsafe', 'inputPeerSwept',
              'frozenUnsafe', 'frozenSwept', 'frozenPeerUnsafe', 'frozenPeerSwept',
              'reloadUnsafe', 'reloadSwept', 'reloadPeerUnsafe', 'reloadPeerSwept')


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
    n = result['safety']
    pairs = result['comparisons']
    narrative = []
    for label, values in pairs.items():
        forest = values['forest']; others = values['elsewhere']
        narrative.append(f"- {label}。森の通常歩行者は獲得 {forest['gains']}・喪失 {forest['losses']}、森以外は獲得 {others['gains']}・喪失 {others['losses']}。開幕の全モデル状態が同じ家庭は {forest['sameOpeningState']+others['sameOpeningState']}/260。5分後も全員の足が同じ家庭は森 {forest['sameAgedFeet']}/20、ほかの地域 {others['sameAgedFeet']}/240。同じ5分後の状態からのドラッグで到着有無が変わった家庭は全地域で {forest['frozenArrivalFlips']+others['frozenArrivalFlips']} 件。")
    return '\n'.join(['# 全13地域の5分間の生活と指操作', '',
        '13地域 × 住民1・4・10・20・28体 × 幅320・375・390・430 CSS px。V12同時対照とA〜Dの計1,300家庭を、それぞれ独立してChromiumで起動した。全家庭で昼・サイズB・固定席・同一の乱数系列と開幕活動予定を使った。A〜Dは曲がる道譲りを無効にしている。', '',
        *(['初回の森で、従来地形の遮蔽物をまたぐ追加区間が別の原画監査で見つかった。修正後に森のB・C・D全60家庭を再実行し、この表では新しい結果を使った。他12地域のB〜D計720家庭には、初回の測定値を採用した。ソースの変更分が森の追加領域でだけ実行されることと、12地域の地点の通行可否・区間判定・経路選択の照合結果は `evidence/matrix-equivalence.json` に収録した。V12・Aは全地域で同一の実行コード。', ''] if result['correctedForestHouseholds'] else []),
        '| 比較 | 通常歩行 | 開幕到着 | 指先4px | タップ選択 | 自律とドラッグ両方失敗 | 5分後到着 |',
        '|---|---:|---:|---:|---:|---:|---:|',
        '| V12・公表値 | 3,217/3,276 | 911/1,058 | 522/1,058 | 246/260 | 2/260 | 234/260 |', *rows, '',
        '通常歩行は住民自身の目的地へ0.75 CSS pxを超えて近づき、退避を除く8 CSS px以上の変位で到着した住民。5分はモデル時計の300秒。入力はV12と同じ12.35モデル秒まで観察する。ドラッグ到着には到着通知のほか、実際に足を運び、補正目的地から0.01 CSS px以内で停止したケースを含む。指先4pxは補正前の実指座標との距離で判定した。生活判断と歩行は実ゲームを走らせ、実時間フレーム性能は別試験で測定する。両方失敗はV12と同じ集計で、対象住民に自律の経路不成立があり歩行開始がなく、ドラッグ指令も発行されたが足が踏み出せなかった家庭。', '',
        f"V12の同じコードを再測定すると、開幕全員の足が過去と同じ家庭は {result['historicFreshV12']['identicalOpeningFeet']}/260、5分後も同じ家庭は {result['historicFreshV12']['identicalAgedFeet']}/260。歩けるようになった住民は {result['historicFreshV12']['gainedWalkers']}、逆の変化は {result['historicFreshV12']['lostWalkers']}、5分後の到着有無が変わった家庭は {result['historicFreshV12']['agedArrivalFlip']}。世帯ごとの明細は `evidence/matrix-historical-drift.csv` に収録した。", '',
        f"同じ実指座標でも、物理入力の応答フラグが異なった開幕操作は {result['sameCodeOpeningDrift']['differentResponses']} 件。以前は到着した対象の代わりに別の住民を選び到着しなかったのは {result['sameCodeOpeningDrift']['arrivalLostToOtherRecipient']} 件で、目的地を指した後の経路探索に入る前に差が生じた。[対象住民・受け取った住民・指座標](evidence/matrix-v12-opening-drift.csv)", '',
        '## 条件を一つずつ変えた比較', '', *narrative, '',
        '同じ300秒時点へ復元した入力では、到着・指先4px以内を次のように記録した。'+' ／ '.join(arm+' '+str(r['arrival'])+'/260・'+str(r['near4'])+'/260' for arm,r in result['frozen300'].items())+'。', '',
        'B−Aは森の土道の追加、C−Bは追加の局所退避地、D−Cは初期席の差。すべての案で体格と接触判定は共通。V12−Aでは曲がる道譲りの有無が違う。画面描画の同期待ちや表情更新の発生時刻はブラウザー上で揺れるため、森以外に生じる差は地形変更の効果から切り分ける。', '',
        '## 森28体でタヌキ・パンダ・箱が完了した通常歩行', '',
        '各欄は300秒の完了回数。0回でも休息だけで過ごした住民と、経路が成立しなかった住民を区別できるよう、試行回数・不成立回数・最長不成立時間は `evidence/matrix-forest-named.csv` に記録した。', '',
        '| 幅 | 条件 | 通常歩行した住民 | タヌキ | パンダ | 箱 |', '|---:|---|---:|---:|---:|---:|',
        *['| {width} | {arm} | {walkers}/28 | {tanuki} | {panda} | {box} |'.format(**r) for r in result['namedForest']], '',
        '## 安全性・保存復帰', '',
        '| 条件 | 地形 | 遮蔽 | 速度 | すれ違い接触 | 操作時の違反 | 保存復帰 |', '|---|---:|---:|---:|---:|---:|---:|',
        *['| '+a+' | '+' | '.join(str(x) for x in (s['terrain'],s['occlusion'],s['speed'],s['swept'],sum(s[k] for k in ('inputUnsafe','inputSwept','frozenUnsafe','frozenSwept','reloadUnsafe','reloadSwept')),s['confirmedSaveRestore']))+' |' for a,s in n.items()], '',
        '全案の安全判定は'+('合格。' if result['safetyPassed'] else '不合格。')+'開幕・生活直後、共通状態、保存復帰の各操作で、指示を受けた住民と周囲の住民の両方を検査した。操作時の表の数値は両者を含む。各区分の件数は `matrix-results.json` の `touchSafetyByActor` と `totalViolationsByField` に収録した。', '',
        '各地域の28体・390pxで、ゲームの保存関数が書いた所持金・成長段階・装備・恋人・仲間・保存版を再読込し、復帰後の実指操作を確認した。保存試験の対象は全13地域 × 5案。', '',
        '## 記録と再現', '',
        '開幕はV12と同じ画面上の始点・終点へ信頼済みタッチを送る。席を変えた案では新しい席を保持し、初期配置の効果を測る。5分後の操作は二種類ある。表の5分後到着は各家庭が独自に生活した直後の入力。別の対照では、V12試験から保存した同一家庭の足・時計・乱数・目標と指座標を各版で復元し、同じ入力を送る。この対照の復元では中断中の経路探索キャッシュを全案で消去した。', '',
        '元のV12 ZIPから抽出した260家庭の固定状態は `matrix-fixtures/` に収録。`matrix_fixtures.py` は元ZIPと各セルのSHA-256を再照合する。`.github/workflows/home-mobility-v13-matrix.yml` は全案の生データを地域別ZIPに保存。`matrix_collect.py` で公開チェックサムと照合し、`matrix_report_v13.py` で260条件が全案にそろったことと入力・ネイティブ歩行を再検証してから集計する。', '',
        '地域・住民数・幅別の集計、各家庭の数値、原本ZIPのSHA-256を保存した。失敗を含む個々の操作と住民別の記録は数値アーカイブから取得できる。iPhone Safari実機での地域別回帰は未測定。', '',
        '[地域別集計](evidence/matrix-groups.csv) ／ [全家庭の結果](evidence/matrix-households.csv) ／ [V12再測定の差](evidence/matrix-historical-drift.csv) ／ [原本照合](evidence/matrix-receipt.json)', '',
        ' ／ '.join('[GitHub Actions '+url.rsplit('/',1)[-1]+']('+url+')' for url in result['runURLs']), ''])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--archives', required=True, type=Path)
    p.add_argument('--v12-archives', required=True, type=Path)
    p.add_argument('--runs', nargs='+', required=True)
    p.add_argument('--out', type=Path, default=HERE / 'evidence')
    p.add_argument('--normalized', type=Path, required=True)
    p.add_argument('--equivalence', type=Path, help='Audited original and corrected runtime hashes, for the forest-only repair')
    p.add_argument('--corrected-runs', nargs='+', default=[], help='Runs built from the corrected runtime')
    a = p.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    a.normalized.mkdir(parents=True, exist_ok=True)
    index, run_receipts = select_archives(a.archives, a.runs)
    proof = json.loads(a.equivalence.read_bytes()) if a.equivalence else None
    old.require(bool(proof) == bool(a.corrected_runs) and set(a.corrected_runs) <= set(a.runs), 'supply both equivalence evidence and corrected run IDs')
    if proof:
        old.require(proof['unaffectedRegions'] == sorted(set(old.REGIONS)-{'forest'}) and
                    sum(r['households'] for r in proof['navigationProbe']['regions'].values())==240,
                    'incomplete nonforest source/evaluation proof')
        for r in run_receipts:
            side = 'correctedRevision' if r['run'] in a.corrected_runs else 'originalRevision'
            old.require(r['headSha'] == proof['observer'][side], 'run revision does not match the audited measurement code')
    def equivalent_hash(filename, observed, corrected):
        row = proof['generated'].get(filename) if proof else None
        if not row:
            return observed
        old.require(observed == row['corrected' if corrected else 'original'], f'observed runtime does not match audited artifact: {filename}')
        return row['original']

    tape = prior.v9.history()
    v12_receipt = json.loads((HERE.parent/'home-mobility-v12/evidence/matrix-receipt.json').read_bytes())
    v12_identity = v12_receipt['identity']['v12']
    datasets = {arm:([],[],[],[]) for arm in ARMS}
    safety = {arm:Counter() for arm in ARMS}
    identity, resources, sources = {}, {}, Counter()
    observed_sources, matched_identity = {}, {}
    browsers = {arm:Counter() for arm in ARMS}
    historic_groups = ([],[],[],[])
    historic_changes, historic_fresh, opening_drift = [], Counter(), []
    homes, touches, changes, cells = [], [], [], []
    comparisons = {f'{a} → {b}': {key:Counter() for key in ('forest','elsewhere')} for a,b in zip(ARMS,ARMS[1:])}
    handles = {}
    try:
        for region in old.REGIONS:
            all_fixtures = fixtures(region)
            prior_zip = v12_receipt['regions'][region]
            prior_path = a.v12_archives / prior_zip['run'] / f"mobility-v12-{prior_zip['run']}-{region}.zip"
            old.require(sha(prior_path.read_bytes()) == prior_zip['sha256'], 'invalid original historical V12 ZIP')
            handles[prior_path] = zipfile.ZipFile(prior_path)
            for count in old.COUNTS:
                for width in old.WIDTHS:
                    f = all_fixtures[f'{count}-{width}']
                    historic_blob = handles[prior_path].read(f'{region}-{count}-{width}.json.gz')
                    old.require(sha(historic_blob) == f['v12RawCellSHA256'], 'archived cell and frozen donor differ')
                    archived = json.loads(gzip.decompress(historic_blob))
                    historic_data = archived['arms']['v12']
                    historic_rows = ([],[],[],[])
                    v11.add_household(archived,'v12',*historic_rows,Counter(),Counter())
                    for group, data in zip(historic_groups,historic_rows):
                        group.extend(data)
                    historic_home = legacy.digest_group(*historic_rows)
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
                        corrected = run in a.corrected_runs
                        if proof and arm in ('v13-b','v13-c','v13-d'):
                            old.require(corrected == (region=='forest'), 'all and only revised forest households must come from correction runs')
                        entry = 'mobility-'+arm+'.html'
                        same = {'scripts':{name:equivalent_hash(name,h,corrected) for name,h in d['hashes'].items()},
                                'entry':equivalent_hash(entry,c['entry'],corrected)}
                        old.require(matched_identity.setdefault(arm,same)==same, f'mixed unverified native source: {arm}')
                        actual = identity.setdefault(run,{})
                        old.require(actual.setdefault(arm,script)==script, 'inconsistent runtime in a single run')
                        observed = observed_sources.setdefault(run,{}).setdefault(arm,{})
                        if arm=='v12':
                            old.require(script==v12_identity, 'published V12 bytes differ from concurrent control')
                        for key,value in d['loaded'].items():
                            old.require(observed.setdefault(key,value)==value, 'loaded resource changed in one run')
                            comparable = equivalent_hash(Path(key).name,value,corrected)
                            old.require(resources.setdefault(arm,{}).setdefault(key,comparable)==comparable, 'unverified loaded resource change between variants')
                        sources[(run,arm)] += 1
                        browsers[arm][d['browser']] += 1
                        rows = tuple([] for _ in range(4))
                        v11.add_household(c,arm,*rows,safety[arm],Counter())
                        totals = legacy.digest_group(*rows)
                        if arm == 'v12':
                            for case, before in historic_data['rows'].items():
                                after = d['rows'][case]
                                if before.get('skip') or prior.drop_outcome(before) == prior.drop_outcome(after):
                                    continue
                                old.require(before['start']==after['start'] and before['goal']==after['goal'], 'V12 finger coordinates differ')
                                opening_drift.append({'region':region,'count':count,'width':width,'case':case,'key':before['key'],
                                    'startX':before['start'][0],'startY':before['start'][1],'goalX':before['goal'][0],'goalY':before['goal'][1],
                                    **{k+'Before':before[k] for k in ('selectedKey','issued','accepted','blockedClass')},
                                    **{k+'Fresh':after[k] for k in ('selectedKey','issued','accepted','blockedClass')},
                                    'arrivalBefore':before['arrived'] or before['terminalArrived'], 'arrivalFresh':after['arrived'] or after['terminalArrived'],
                                    'near4Before':before['near4'] or before['terminalNear4'], 'near4Fresh':after['near4'] or after['terminalNear4']})
                            historic_fresh['identicalOpeningFeet'] += d['opening'] == historic_data['opening']
                            historic_fresh['identicalAgedFeet'] += d['aged']['opening'] == historic_data['aged']['opening']
                            historical_people = {r['key']:r for r in historic_rows[0]}
                            gained = [r['key'] for r in rows[0] if r['normalCompletions'] and not historical_people[r['key']]['normalCompletions']]
                            lost = [r['key'] for r in rows[0] if not r['normalCompletions'] and historical_people[r['key']]['normalCompletions']]
                            historic_fresh['gainedWalkers'] += len(gained)
                            historic_fresh['lostWalkers'] += len(lost)
                            historic_fresh['agedArrivalFlip'] += historic_home['agedDragArrival'] != totals['agedDragArrival']
                            if gained or lost or any(historic_home[k] != totals[k] for k in FIELDS):
                                historic_changes.append({'region':region,'count':count,'width':width,'gained':'|'.join(gained),'lost':'|'.join(lost),
                                    **{k+'Before':historic_home[k] for k in FIELDS},**{k+'Fresh':totals[k] for k in FIELDS}})
                        for target, group in zip(datasets[arm], rows):
                            target.extend(group)
                        frozen = d['frozenDrag']['row']
                        replay = legacy.prior.drag_row(c,arm,'frozen-300',frozen,'frozen-300')
                        touches.append(replay)
                        s = safety[arm]
                        s['frozenUnsafe'] += frozen['unsafeSteps']
                        s['frozenSwept'] += frozen['sweptViolations']
                        s['frozenPeerUnsafe'] += sum(v['unsafe'] for v in frozen['peerWalk'].values())
                        s['frozenPeerSwept'] += sum(v['swept'] for v in frozen['peerWalk'].values())
                        if 'reloaded' in d:
                            s['reloadUnsafe'] += d['reloaded']['drag']['unsafeSteps']
                            s['reloadSwept'] += d['reloaded']['drag']['sweptViolations']
                            s['reloadPeerUnsafe'] += sum(v['unsafe'] for v in d['reloaded']['drag']['peerWalk'].values())
                            s['reloadPeerSwept'] += sum(v['swept'] for v in d['reloaded']['drag']['peerWalk'].values())
                        home = {'region':region,'count':count,'width':width,'arm':arm,**{k:totals[k] for k in (*FIELDS,'residents','drags','tapSent','agedDragCount')},
                                'seed':d['seed'],'openingSHA256':d['openingSHA256'],'agedFeetSHA256':sha(encode(d['aged']['opening'])),
                                'seatChanges':'|'.join(q['key'] for q in d['seatChanges']), 'frozenArrival':replay['arrival'],
                                'frozenNear4':replay['nearFinger'], 'frozenOutcome':old.canonical(prior.drop_outcome(frozen)),
                                'syncCalls':d['aged']['sync']['calls'],'syncMoved':len(d['aged']['sync']['shifts']),
                                'observerErrorsBeforeValidTrial':len(c['priorObserverErrors']),
                                'frozenPreDispatchResyncs':len(d['frozenDrag']['preDispatchResync']), 'sourceRun':run}
                        homes.append(home)
                        cells.append({'raw':name,'run':run,'sha256':sha(blob),'v12RawCellSHA256':f['v12RawCellSHA256']})
                        paired[arm]=(home,{r['key']:r for r in rows[0]})
                    for source, dest in zip(ARMS,ARMS[1:]):
                        a0, old_people = paired[source]
                        a1, new_people = paired[dest]
                        track = comparisons[f'{source} → {dest}']['forest' if region=='forest' else 'elsewhere']
                        track['frozenArrivalFlips'] += a0['frozenArrival'] != a1['frozenArrival']
                        track['sameAgedFeet'] += a0['agedFeetSHA256'] == a1['agedFeetSHA256']
                        track['sameOpeningState'] += a0['openingSHA256'] == a1['openingSHA256']
                        track['agedArrivalFlips'] += a0['agedDragArrival'] != a1['agedDragArrival']
                        for key in old_people:
                            before, after = old_people[key], new_people[key]
                            ok0, ok1 = bool(before['normalCompletions']),bool(after['normalCompletions'])
                            track['gains'] += ok1 and not ok0
                            track['losses'] += ok0 and not ok1
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
    archived_totals = legacy.digest_group(*historic_groups)
    old.require(all(archived_totals[k] == v for k,v in historical.items()), 'official V12 totals do not match the published reference')
    for arm,s in safety.items():
        old.require(s['confirmedSaveRestore'] == 13 and s['frames'] == 1560, 'missing restore or 60s samples')
    result = {'cellsPerArm':260,'nativeHouseholds':len(cells),'ageModelSeconds':300,'historical':historical,'totals':totals,'safety':safety,
              'comparisons':comparisons,'runURLs':[r['url'] for r in run_receipts],'historicFreshV12':historic_fresh,'browsers':browsers,'frozen300':{arm:legacy.prior.metrics([r for r in touches if r['arm']==arm]) for arm in ARMS},
              'observerRetries':sum(r['observerErrorsBeforeValidTrial'] for r in homes),
              'frozenPreDispatchResyncs':sum(r['frozenPreDispatchResyncs'] for r in homes),
              'observedViolations':{arm:{k:s[k] for k in VIOLATIONS} for arm,s in safety.items()}}
    # The raw inclusive gesture counts already include peers. Separate recipient
    # and peer evidence for each phase without counting one crossing twice.
    result['touchSafetyByActor'] = {}
    for arm, sample in safety.items():
        split = {}
        for phase in ('input','frozen','reload'):
            for suffix in ('Unsafe','Swept'):
                peer = sample[phase+'Peer'+suffix]
                recipient = sample[phase+suffix]-peer
                old.require(recipient >= 0, 'peer violations exceed the inclusive native observation')
                split[phase+suffix] = {'recipient':recipient,'peers':peer}
        result['touchSafetyByActor'][arm] = split
    result['safetyPassedByArm'] = {arm:all(sample[k]==0 for k in VIOLATIONS) for arm,sample in safety.items()}
    result['safetyPassed'] = all(result['safetyPassedByArm'].values())
    result['totalViolationsByField'] = {key:sum(s[key] for s in safety.values()) for key in VIOLATIONS}
    result['versusPublishedV12'] = {arm: {k: {'delta':totals[arm][k]-v,
                'atLeastAsGood': totals[arm][k]<=v if k=='bothFailed' else totals[arm][k]>=v} for k,v in historical.items()} for arm in ARMS}
    result['sameCodeOpeningDrift'] = {'differentResponses':len(opening_drift),'arrivalLostToOtherRecipient':sum(r['arrivalBefore'] and not r['arrivalFresh'] and r['selectedKeyFresh']!=r['key'] for r in opening_drift)}
    result['correctedForestHouseholds'] = sum(sources[run,arm] for run in a.corrected_runs for arm in ARMS)
    if proof:
        old.require(result['correctedForestHouseholds'] == 60,'incomplete corrected B/C/D forest results')
    named_forest = [r for arm in ARMS for r in datasets[arm][0] if r['region']=='forest' and r['count']==28 and
                    r['key'] in ('companion:tanuki','companion:panda','companion:box')]
    legacy.csv_write(a.out/'matrix-forest-named.csv',named_forest)
    named_index = {(r['arm'],r['width'],r['key'].split(':')[1]):r['normalCompletions'] for r in named_forest}
    result['namedForest'] = [{'width':r['width'],'arm':r['arm'],'walkers':r['normalWalkers'],
                              **{key:named_index[r['arm'],r['width'],key] for key in ('tanuki','panda','box')}}
                             for r in homes if r['region']=='forest' and r['count']==28]
    for i, fname in enumerate(('residents','opening','aged','dual')):
        legacy.csv_write(a.normalized/f'matrix-{fname}.csv.gz',[r for arm in ARMS for r in datasets[arm][i]])
    legacy.csv_write(a.normalized/'matrix-frozen.csv.gz',touches)
    v11.write_table(a.out/'matrix-v12-opening-drift.csv',opening_drift,('region','count','width','case','key'))
    v11.write_table(a.out/'matrix-historical-drift.csv',historic_changes,('region','count','width','gained','lost'))
    legacy.csv_write(a.out/'matrix-groups.csv',groups)
    legacy.csv_write(a.out/'matrix-households.csv',homes)
    v11.write_table(a.out/'matrix-walk-changes.csv',changes,('region','count','width','from','to','key'))
    legacy.csv_write(a.out/'matrix-cells.csv',cells)
    legacy.write_json(a.out/'matrix-results.json',result)
    receipt = {'base':BASE,'identityByRun':identity,'resourcesByRun':observed_sources,'browsers':browsers,'runs':run_receipts,
               'nonforestEquivalenceSHA256':sha(a.equivalence.read_bytes()) if a.equivalence else None,'correctedRuns':a.corrected_runs,
               'selectedCellsByRunAndArm':{run:{arm:sources[(run,arm)] for arm in ARMS} for run in a.runs},
               'normalized':{x.name:{'sha256':sha(x.read_bytes()),'bytes':x.stat().st_size} for x in sorted(a.normalized.glob('matrix-*.csv.gz'))}}
    legacy.write_json(a.out/'matrix-receipt.json',receipt)
    (a.out.parent/'regional.md').write_text(notes(result))
    print('Native safety:',result['safetyPassedByArm'])
    print('Verified',len(cells),'independent native observations:',{k:{field:v[field] for field in FIELDS} for k,v in totals.items()})


if __name__ == '__main__':
    main()
