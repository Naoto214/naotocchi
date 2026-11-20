"""Reconcile all 260 paired browser observations and report actual native arrivals."""
import argparse
from collections import Counter
import csv
import hashlib
import json
import math
import subprocess
import zipfile
from pathlib import Path
from statistics import median

from matrix_contract import ARMS, COUNTS, KINDS, REGIONS, WIDTHS, finite, require, validate_cell

NAMES=dict(zip(REGIONS,'おうち もり みずべ とかい いなか やま ゆきぐに うみ ジャングル さばく しんかい ほしぞらのていりゅうじょ きおくのみずうみ'.split()))
LABELS={'historical':'旧試験と同じ水平12px','diagonal':'斜め','occupied':'ほかの住民の足','clear':'空いている床','obstacle':'歩行域内の障害物','tap':'タップ'}
OUTCOMES=('selected','issued','accepted','routed','moved','arrived','near4','terminalArrived','terminalNear4','actualArrival','actualNear4','meaningfulMotion')
MEASURES=('terminalChosenErrorCss','minStepFingerErrorCss','fingerErrorCss','correctedErrorCss','arrivalClock','endDistanceCss','releaseJumpCss',
          'aimDistanceCss','earlyDistanceCss','endFingerErrorCss','forwardDisplacementCss','pressToSelectionMs','releaseMs','pointerQueueMs','releaseFrameMs','modelMoveMs','searchCount','searchMaxMs','searchTotalMs')
SAFETY=('unsafeSteps','sweptViolations')
IDENTIFIERS=('region','count','width','height','case','role','arm','key','skip')
PEER=('movingPeers','peerSteps','peerUnsafe','peerSwept')
PHASES=('pointerdown','pointermove','pointerup','pointercancel','simulation')
SEARCH_PHASES=tuple('searches_'+p for p in PHASES)
COLUMNS=(*IDENTIFIERS,'touchX','touchY','goalX','goalY','goalClass','trusted','selectedKey','endSource',*OUTCOMES,*MEASURES,*SAFETY,'blockedClass','outcomeClass','pendingAtRelease','waitingAtRelease','waitingAtEarly','waitingAtEnd','walkingAtEnd','nativePlanCalls','retryPlanCalls',*SEARCH_PHASES,*PEER,'openingSHA256')
REGIONS_COLUMNS=('region','pairedCells','gesturesSent','skippedDrags','tapSent',
                *[arm+'_'+key for arm in ARMS for key in (*OUTCOMES,'tapSelected')],
                'arrivalGains','arrivalLosses','near4Gains','near4Losses')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)


def read_all(root):
    totals=[]
    sources={}
    for region in REGIONS:
        candidates=[p for p in root.rglob('region.json') if json.loads(p.read_text())['runIdentity']['region']==region]
        require(len(candidates)==1,f'{region} must have one completed matrix artifact; found {len(candidates)}')
        location=candidates[0]
        manifest=json.loads(location.read_text())
        identity=manifest['runIdentity']
        require(manifest.get('complete') is True,f'{region}: incomplete matrix')
        expected={f'{n}-{w}' for n in COUNTS for w in WIDTHS}
        require(set(manifest['cells'])==expected,f'{region}: missing or extra cells')
        sources[region]={k:identity[k] for k in ('git','entrySHA256','browser','playwright')}
        sources[region]['harnessSHA256']=digest(canonical(identity['harnessAndSourceSHA256']).encode())
        sources[region]['retryLog']=manifest['retryLog']
        for n in COUNTS:
            for w in WIDTHS:
                row=manifest['cells'][f'{n}-{w}']
                filename=f'{region}-{n}-{w}-matrix.json'
                require(row['file']==filename,f'{region} source filename')
                data=(location.parent/filename).read_bytes()
                require(digest(data)==row['rawSHA256'],f'{filename} hash mismatch')
                cell=validate_cell(json.loads(data),region,n,w)
                require(all(cell['arms'][arm]['browser']==identity['browser'] for arm in ARMS),f'{filename}: different browser between paired arms')
                measured={arm:cell['arms'][arm]['hashes'] for arm in ARMS}
                immutable=sources[region].setdefault('observedNativeBytes',measured)
                require(measured==immutable,f'{filename}: native scripts changed during the matrix')
                totals.append(cell)
    reference=sources[REGIONS[0]]
    for region,identity in sources.items():
        for key in ('git','entrySHA256','harnessSHA256','playwright','observedNativeBytes'):
            require(identity[key]==reference[key],f'{region}: mixed source or runner {key}')
    # Verify the bytes the browser received against the measured Git revision.
    revision=reference['git']
    checks=json.loads(subprocess.check_output(['git','show',f'{revision}:comparisons/home-drag-v6/native/sources.json'],cwd=Path(__file__).resolve().parents[2]))
    native=reference['observedNativeBytes']
    for base,(old,new) in {
        'home-production-model.js':('home-production-model-finish.js','home-production-model-drag-v6.js'),
        'home-production-diorama-finish.js':('home-production-diorama-finish.js','home-production-diorama-drag-v6.js'),
        'script-v2.js':('script-v2.js','script-v2-drag-v6.js'),
    }.items():
        require(native['v5'][old]==checks[base]['before'] and native['v6'][new]==checks[base]['after'],base+' measured source differs from Git revision')
    shared={'drag-trial-hooks.js','population-beauty.js','home-route-navigation-finish.mjs'}
    require(set(native['v5'])&set(native['v6'])==shared and all(native['v5'][k]==native['v6'][k] for k in shared),'unmatched common native navigation or fixture source')
    return totals,sources


def projected_progress(row):
    origin=row['origin']
    scale=row['scale']
    target=[(v-origin[i])*scale[i] for i,v in enumerate(row['modelGoal'])]
    length=math.hypot(*target)
    if length==0:
        return None
    # Use the final observed foot, independently of planner acceptance.
    motion=[(v-origin[i])*scale[i] for i,v in enumerate(row['end'])]
    return round(sum(m*d for m,d in zip(motion,target))/length,3)


def outcome(row):
    if row.get('skip'):
        return 'no-feasible-test-target'
    if row['kind']=='tap':
        return 'tap-selected' if row['selected'] else 'tap-missed'
    if row['terminalArrived'] or row['arrived']:
        error=row['endFingerErrorCss'] if row['terminalArrived'] else row['fingerErrorCss']
        if error<=.001:
            return 'arrived-exact'
        if error<=4:
            return 'arrived-within-four'
        if error<=24:
            return 'arrived-near-alternative'
        if row['aimDistanceCss']-error>=min(12,row['aimDistanceCss']/4):
            return 'arrived-directional-partial'
        return 'arrived-other-endpoint'
    if not row['issued']:
        return 'not-issued'
    end=row['demandAtEnd']
    if end.get('target') and end.get('source')=='drag':
        return 'walking-at-deadline'
    if end['pending']:
        return 'waiting-at-deadline'
    early=row.get('demandAtEarly') or {}
    if any(d.get('pending') and not d.get('target') for d in (row['demandAtRelease'],early)):
        return 'waited-then-ended-without-arrival'
    if row['accepted']:
        return 'accepted-without-arrival'
    return 'not-accepted'


def flatten(cells):
    rows=[]
    for cell in cells:
        roster=cell['arms']['v5']['opening']
        opening=digest(canonical(roster).encode())
        for arm in ARMS:
            for case,observation in cell['arms'][arm]['rows'].items():
                role=roster[observation['index']][0].split(':')[0]
                row={**{k:cell[k] for k in ('region','count','width','height')},
                    'case':case,'role':role,'arm':arm,'key':observation.get('key'),'skip':observation.get('skip'),
                    'openingSHA256':opening,'outcomeClass':outcome(observation)}
                if not row['skip']:
                    start,goal=observation['start'],observation['goal']
                    row.update(touchX=start[0],touchY=start[1],goalX=goal[0],goalY=goal[1],
                               goalClass=canonical(observation['goalClass']))
                    for k in ('trusted',*OUTCOMES,*MEASURES,*SAFETY,'blockedClass'):
                        row[k]=observation.get(k)
                    row['forwardDisplacementCss']=projected_progress(observation)
                    row['actualArrival']=bool(row['terminalArrived'] or row['arrived'])
                    row['actualNear4']=bool(row['terminalNear4'] or row['near4'])
                    row['meaningfulMotion']=bool(row['issued'] and row['endDistanceCss']>=3 and (row['forwardDisplacementCss'] or 0)>=2 and row['aimDistanceCss']-row['endFingerErrorCss']>=.75)
                    row['pendingAtRelease']=observation['demandAtRelease']['pending']
                    for stage in ('Release','Early','End'):
                        demand=observation.get('demandAt'+stage)
                        row['waitingAt'+stage]=bool(demand['pending'] and not demand['target']) if demand else None
                    terminal=observation['demandAtEnd']
                    row['selectedKey']=observation['selectedKey']
                    row['endSource']=terminal['source']
                    row['walkingAtEnd']=bool(terminal['target'] and terminal['source']=='drag')
                    peers=observation['peerWalk'].values()
                    row.update(movingPeers=len(peers),peerSteps=sum(p['steps'] for p in peers),
                               peerUnsafe=sum(p['unsafe'] for p in peers),peerSwept=sum(p['swept'] for p in peers))
                    stages=Counter(search['phase'] for search in observation['searches'])
                    require(set(stages).issubset(PHASES),'unknown native graph search phase')
                    row.update({'searches_'+stage:stages[stage] for stage in PHASES})
                    row['nativePlanCalls']=len(observation['nativePlans'])
                    row['retryPlanCalls']=sum(plan['retry'] is True for plan in observation['nativePlans'])
                rows.append(row)
    return rows


def write_csv(path,rows,fields):
    with path.open('w',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=fields,lineterminator='\n',extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)


def grouped(rows,key):
    groups={}
    for r in rows:
        group=r[key] if key!='kind' else r['case'].split('/')[0]
        groups.setdefault(group,[]).append(r)
    return groups


def comparison(rows):
    available=[r for r in rows if not r['skip'] and not r['case'].startswith('tap/')]
    taps=[r for r in rows if not r['skip'] and r['case'].startswith('tap/')]
    identity=lambda r: (r['region'],r['count'],r['width'],r['case'])
    by_arm={arm:{identity(r):r for r in available if r['arm']==arm} for arm in ARMS}
    require(by_arm['v5'].keys()==by_arm['v6'].keys(),'unequal executed matched-pair inputs')
    batches={arm:list(arm_rows.values()) for arm,arm_rows in by_arm.items()}
    result={'pairedCells':len({(r['region'],r['count'],r['width']) for r in rows}),
        'gesturesSent':len(batches['v5']),'skippedDrags':sum(1 for r in rows if r['arm']=='v5' and r['skip'] and not r['case'].startswith('tap/')),
        'tapSent':sum(r['arm']=='v5' for r in taps)}
    for arm,batch in batches.items():
        for k in OUTCOMES:
            result[arm+'_'+k]=sum(bool(r[k]) for r in batch)
        result[arm+'_tapSelected']=sum(bool(r['selected']) for r in taps if r['arm']==arm)
    for name,k in [('arrival','actualArrival'),('near4','actualNear4')]:
        result[name+'Gains']=sum(not by_arm['v5'][i][k] and r[k] for i,r in by_arm['v6'].items())
        result[name+'Losses']=sum(by_arm['v5'][i][k] and not r[k] for i,r in by_arm['v6'].items())
    return result


def summarize_numbers(values):
    vs=sorted(v for v in values if finite(v))
    if not vs:
        return {'n':0}
    return {'n':len(vs),'median':median(vs),'p95NearestRank':vs[math.ceil(len(vs)*.95)-1],'max':vs[-1]}


def touch_timing(cells,arm):
    records=[(cell,row) for cell in cells for row in cell['arms'][arm]['rows'].values()
             if not row.get('skip') and row['kind']!='tap']
    maxima={}
    starts=[]
    arrivals=[]
    early=0
    issued=0
    for cell,row in records:
        for search in row['searches']:
            kind=search['kind']
            if kind not in maxima or search['ms']>maxima[kind]['ms']:
                maxima[kind]={**search,**{k:cell[k] for k in ('region','count','width')},'case':row['kind']}
        if not row['issued']:
            continue
        issued+=1
        clock=row['demandAtRelease']['clock']
        move=[e[0] for e in row['reactions'] if e[1:3]==['move','drag']]
        if move:
            starts.append(min(move)-clock)
        if row['arrived']:
            arrivals.append(row['arrivalClock']-clock)
        if row['earlyDistanceCss']>.001:
            early+=1
    return {'singleGraphMaxByKindMs':maxima,'issued':issued,'footMovedBy0_7ModelSec':early,
            'releaseToFirstMoveEventModelSec':summarize_numbers(starts),
            'releaseToFirstArriveEventModelSec':summarize_numbers(arrivals)}


def render_report(summary,workflow):
    total=summary['profiles']
    src=summary['sources'][REGIONS[0]]
    def paired(record,key):
        return f"{record['v5_'+key]} / {record['v6_'+key]}"
    def numbers(summary_values):
        if not summary_values['n']:
            return '測定なし'
        return ' / '.join(f"{summary_values[k]:.2f}" for k in ('median','p95NearestRank','max'))
    lines=['# 13地域の実タッチ比較', '',
        f"コミット `{src['git'][:12]}` の260条件で、V5とV6を同じ初期状態から開いた。各版で実際に送ったドラッグは {total['gesturesSent']} 回、タップは {total['tapSent']} 回。実際の到着はV5 {total['v5_actualArrival']} 回、V6 {total['v6_actualArrival']} 回。指で指定した足位置の4 CSS px以内に到着したのはそれぞれ {total['v5_actualNear4']} 回と {total['v6_actualNear4']} 回だった。",
        '',f"同じドラッグに対する到着の獲得は {total['arrivalGains']} 件、喪失は {total['arrivalLosses']} 件。4px以内の到着は獲得 {total['near4Gains']} 件、喪失 {total['near4Losses']} 件。全1,300のドラッグ計画のうち、同じ指の標的が見つからなかった {total['skippedDrags']} 件は実行数の分母から外した。理由は各行に残した。[全入力のCSV](evidence/matrix-inputs.csv) ／ [集計JSON](evidence/matrix-summary.json)",
        '', '## 地域別', '',
        '左右の数値はV5 / V6。各地域は5人数×4画面幅の20条件。到着は、本人のネイティブ `arrive / drag` イベントと、実歩行後に最終経路の終点へ0.01px以内で静止した証明の和集合。指の4px以内は、いずれかの到着時にその範囲に入った件数。「選択」は指を置いた本人を選んだ回数、「受理」は指を離した時点の本人の命令受理である。いずれも実際に送ったドラッグに対する件数。', '',
        '| 地域 | ドラッグ数／版 | 標的なし | 本人選択 | 受理 | 実到着 | 4px以内 | 実到着の獲得 / 喪失 |',
        '|---|---:|---:|---:|---:|---:|---:|---:|']
    for g in summary['byRegion']:
        lines.append(f"| {NAMES[g['region']]} | {g['gesturesSent']} | {g['skippedDrags']} | {paired(g,'selected')} | {paired(g,'accepted')} | {paired(g,'actualArrival')} | {paired(g,'actualNear4')} | {g['arrivalGains']} / {g['arrivalLosses']} |")
    lines+=['',f"全ドラッグで、本人の到着イベントはV5 / V6が {paired(total,'arrived')}、その時点で4px以内は {paired(total,'near4')}。実際に歩いて最後の経路の終点に静止した件数は {paired(total,'terminalArrived')}、終了足が4px以内は {paired(total,'terminalNear4')}。イベントの抑制中でも、後者の実測で最終到着を確認できる。", '', '## 要求した行き先と到着位置','',
        '| 指の行き先 | ドラッグ数／版 | 標的なし | 実到着 V5 / V6 | 4px以内 V5 / V6 |',
        '|---|---:|---:|---:|---:|']
    for kind in KINDS[:-1]:
        g=summary['byDimension']['kind'][kind]
        lines.append(f"| {LABELS[kind]} | {g['gesturesSent']} | {g['skippedDrags']} | {paired(g,'actualArrival')} | {paired(g,'actualNear4')} |")
    outcomes={'arrived-exact':'指定位置に到着（誤差0.001px以下）','arrived-within-four':'同じ指の4px以内（0.001px超）',
        'arrived-near-alternative':'4px超24px以内の別の終点に到着','arrived-directional-partial':'24px超で指へ一定以上近づいた終点に到着',
        'arrived-other-endpoint':'それ以外の終点に到着','waiting-at-deadline':'観察終了時に保留中・歩行目標なし',
        'walking-at-deadline':'観察終了時に本人が歩行中','waited-then-ended-without-arrival':'待機を観察後、到着せず終了',
        'accepted-without-arrival':'受理したが観察中に到着なし','not-accepted':'指を離した時点で不受理・観察中に到着なし','not-issued':'本人にドラッグ命令が届かなかった'}
    lines+=['','| 実際に送ったドラッグの最終状態 | V5 | V6 |','|---|---:|---:|']
    for key,label in outcomes.items():
        vals=[summary['quality'][a]['actualOutcomes'].get(key,0) for a in ARMS]
        lines.append(f"| {label} | {vals[0]} | {vals[1]} |")
    lines+=['','近い代替終点の24pxは報告用の区分。24pxを超える場合、開始時からの指までの距離が「12px」と「要求距離の4分の1」の小さいほう以上減った到着を部分到着とした。表の排他的な区分は最終静止位置があればその位置、なければ実イベント時点の最短誤差を採用した。4px以内の総数は観察期間中に確認できたいずれかの到着を数える。','',
        '## 基準操作・安全性・処理時間','']
    lines.append(f"狙った住民に指示が届き、実際の移動量が3px以上、要求方向への成分が2px以上、指までの誤差減少が0.75px以上の歩行は {paired(total,'meaningfulMotion')} 件（V5 / V6）。この移動量の数値は実到着件数とは別に集計した。")
    historic=summary['historical13RegionReplay']
    lines.append(f"比較画面で固定した390px・28体の初期配置で、旧試験と同じ主人公の水平12px、恋人の斜め、仲間の占有地点を実行した。従来の起動経路の初期配置から再現した39操作は、別の履歴比較に収録した。13地域の実送信は各版 {historic['gesturesSent']} 回、実到着はV5 / V6が {paired(historic,'actualArrival')}、4px以内は {paired(historic,'actualNear4')} だった。")
    lines+=['','| 観測 | V5 | V6 |','|---|---:|---:|']
    for label,key in [('移動全員の危険な足ステップ','unsafeSteps'),('移動全員の区間中の接触侵入','sweptViolations'),('他住民の危険な足ステップ','peerUnsafe'),
            ('他住民の移動区間中の接触侵入','peerSwept'),('狙った住民の最終足が要求と反対へ0.5px超（全ドラッグ）','backwardFinalDisplacements'),('同じ住民へ命令が届いた場合の逆方向','issuedBackwardFinalDisplacements'),('リリース時の足の最大変化（CSS px）','maxReleaseFootJumpCss'),
            ('タップ由来のドラッグ発行','tapIssuedDrag'),('指を離した時の待機件数','waitingAtRelease'),('0.7モデル秒時の待機件数','waitingAtEarly'),
            ('終了時の待機件数','waitingAtEnd'),('ネイティブプランナーの試行数','nativePlanCalls'),('再試行によるプランナー呼び出し','retryPlanCalls'),('指を動かすイベント中のグラフ探索','searches_pointermove'),('指を離すイベント中のグラフ探索','searches_pointerup'),('実歩行・再試行中のグラフ探索','searches_simulation'),('指を離す1操作でグラフ探索が2回以上','releasesWithMultipleSearches'),('1操作のリリース中の最大グラフ探索回数','maxSearchesPerRelease'),('リリース中に単独で16.67msを超えたグラフ探索','releaseSearchesOver16_67Ms')]:
        lines.append(f"| {label} | {summary['quality']['v5'][key]} | {summary['quality']['v6'][key]} |")
    lines+=['',f"タップした本人の選択は各版 {total['tapSent']} 件中、V5 / V6が {paired(total,'tapSelected')} 件。重なる住民を狙ったときの選択失敗も分母に含めた。"]
    losses=summary['lostArrivals']
    if losses and all(l['oldClass']=='arrived-directional-partial' and l['newClass']=='waited-then-ended-without-arrival' for l in losses):
        lines+=['',f"V5だけが到着した {len(losses)} 件は、すべてV5の終点が指から24px超離れた部分到着で、V6では待機後に終了した。V6の指位置は非歩行地形 {sum(l['blockedClass']=='non-ground' for l in losses)} 件、他者の接触域 {sum(l['blockedClass']=='occupied' for l in losses)} 件、住民の移動可能域外 {sum(l['blockedClass']=='outside-actor-bounds' for l in losses)} 件だった。",'']
    backwards=summary['backwardFinalV6']
    if backwards and all(r['count']==4 and r['case']=='occupied/2' and r['key']=='companion:cat_friend' and r['selectedKey']=='pet:dog' and not r['issued'] and not r['selected'] and r['endSource']=='yield' for r in backwards):
        lines.append(f"逆方向へ動いた {len(backwards)} 件は、いずれも4体配置で仲間の体を狙った位置が手前の主人公と重なり、主人公が選ばれた操作だった。仲間は譲る動作で移動した。狙った住民本人に届いた指示の逆方向移動は0件。")
    lines+=['','| 実ブラウザー時間（ms、中央値 / p95 / 最大） | V5 | V6 |','|---|---:|---:|']
    for label,key in [('指を離したイベントの処理','releaseMs'),('指を離すイベントの配信待ち','pointerQueueMs'),
            ('指を離してから次のフレームまで','releaseFrameMs'),('同期の本人移動命令','modelMoveMs'),('重い探索の合計／ドラッグ','searchTotalMs')]:
        vals=[numbers(summary['quality'][a]['durationsAndDistances'][key]) for a in ARMS]
        lines.append(f"| {label} | {vals[0]} | {vals[1]} |")
    timing={a:summary['quality'][a]['touchTiming'] for a in ARMS}
    lines+=['','| ネイティブのグラフ探索1回の最大実時間（ms） | V5 | V6 |','|---|---:|---:|']
    for kind in ('route','reachable'):
        maxima=[timing[a]['singleGraphMaxByKindMs'][kind]['ms'] for a in ARMS]
        lines.append(f'| `{kind}` | {maxima[0]:.1f} | {maxima[1]:.1f} |')
    lines+=['','| 指を離してからのモデル時間（秒、中央値 / p95 / 最大） | V5 | V6 |','|---|---:|---:|']
    for key,label in [('releaseToFirstMoveEventModelSec','最初の `move / drag`（歩行指示開始）'),('releaseToFirstArriveEventModelSec','最初の `arrive / drag`（本人が到着）')]:
        values=[timing[a][key] for a in ARMS]
        lines.append(f"| {label} | {numbers(values[0])}（{values[0]['n']}件） | {numbers(values[1])}（{values[1]['n']}件） |")
    movement=[f"{timing[a]['footMovedBy0_7ModelSec']} / {timing[a]['issued']}" for a in ARMS]
    lines+=['',f'本人に届いた指示のうち、0.70モデル秒時点で足が開始位置から0.001 CSS px超動いていたのはV5が {movement[0]} 件、V6が {movement[1]} 件。`move` は歩行指示を開始した時刻で、測定ファイルには足が動いた最初のステップの実時刻を保存していない。']
    lines+=['','## 条件と再現','',
        '320・375・390・430 CSS px、1・4・10・20・28体の全260組。各組はDPR 2のChromium実タッチを使う。V5で選んだ住民・体の開始点・指の行き先をV6で再使用し、世帯・初期足・体寸法・描画足・初期乱数・標的の地形条件が両版で一致することを検査した。実行できた入力はどちらの版もtrustedなpointerdownとpointerupを確認した。1体で他者の足を狙う操作は標的なしである。',
        '','両版とも `paired=1` で比較画面と同じ初期配置を確立し、各入力をその開始状態から独立に測定した。リリース後、モデルの自律行動を抑えて0.05モデル秒ずつ12.35秒まで進めた。到着と距離は実際のネイティブ歩行から記録した。同期入力と探索のmsは実ブラウザーの壁時計。端末相当の長時間フレーム負荷は別の性能試験に記録する。',
        '', '各地域内のV5/V6は同じChromeを使用した。Actionsのランナーごとのバージョンは '+ '、'.join(f'{v} が {n} 地域' for v,n in sorted(Counter(s['browser'] for s in summary['sources'].values()).items()))+'。',
        '','[地域・人数・幅・役割別の数値](evidence/matrix-summary.json) ／ [地域のCSV](evidence/matrix-regions.csv) ／ [検証条件](matrix_contract.py) ／ [測定方法](measure_input.py) ／ [完全性の再集計](matrix_report.py)']
    if summary['changedPairedOutcomes']:
        lines.append('[同じ入力で選択・受理・到着・精度が変わった全件](evidence/matrix-changed-outcomes.csv)')
    if workflow:
        lines+=['',f'[実行した13地域のActions]({workflow})']
    return '\n'.join(lines)+'\n'


def report(root,out):
    cells,sources=read_all(root)
    out.mkdir(parents=True,exist_ok=True)
    rows=flatten(cells)
    require(len(cells)==len(REGIONS)*len(COUNTS)*len(WIDTHS)==260,'incomplete paired-profile grid')
    require(len(rows)==260*len(KINDS)*2,'incomplete planned-input register')
    write_csv(out/'matrix-inputs.csv',rows,COLUMNS)
    regions=[{'region':region,**comparison(group)} for region,group in grouped(rows,'region').items()]
    write_csv(out/'matrix-regions.csv',regions,REGIONS_COLUMNS)
    full=comparison(rows)
    require(full['gesturesSent']+full['skippedDrags']==1300 and full['tapSent']==260,'planned gestures or taps omitted')
    groups={k:{str(v):comparison(group) for v,group in grouped(rows,k).items()} for k in ('count','width','kind','role')}
    quality={}
    for arm in ARMS:
        sent=[r for r in rows if r['arm']==arm and not r['skip']]
        drags=[r for r in sent if not r['case'].startswith('tap/')]
        quality[arm]={
            'touchTiming':touch_timing(cells,arm),
            'unsafeSteps':sum(r['unsafeSteps'] for r in sent),
            'sweptViolations':sum(r['sweptViolations'] for r in sent),
            'maxReleaseFootJumpCss':max((r['releaseJumpCss'] for r in sent if finite(r['releaseJumpCss'])),default=None),
            'releaseJumpRows':sum(finite(r['releaseJumpCss']) and r['releaseJumpCss']>.001 for r in sent),
            'actualOutcomes':dict(Counter(r['outcomeClass'] for r in drags)),
            'pendingAtRelease':sum(r['pendingAtRelease'] for r in drags),
            'waitingAtRelease':sum(r['waitingAtRelease'] for r in drags),
            'waitingAtEarly':sum(bool(r['waitingAtEarly']) for r in drags),
            'waitingAtEnd':sum(r['waitingAtEnd'] for r in drags),
            'walkingAtEnd':sum(r['walkingAtEnd'] for r in drags),
            **{k:sum(r[k] for r in drags) for k in (*PEER,*SEARCH_PHASES)},
            'worstGraphSearchByPhaseMs':{stage:max((s['ms'] for cell in cells for row in cell['arms'][arm]['rows'].values() for s in row.get('searches',[]) if s['phase']==stage),default=0) for stage in PHASES},
            'releasesWithMultipleSearches':sum(r['searches_pointerup']>1 for r in drags),
            'maxSearchesPerRelease':max((r['searches_pointerup'] for r in drags),default=0),
            'releaseSearchesOver16_67Ms':sum(s['phase']=='pointerup' and s['ms']>16.67 for cell in cells for o in cell['arms'][arm]['rows'].values() if o['kind']!='tap' for s in o.get('searches',[])),
            'nativePlanCalls':sum(r['nativePlanCalls'] for r in drags),
            'retryPlanCalls':sum(r['retryPlanCalls'] for r in drags),
            'blockedReasons':dict(Counter(r['blockedClass'] for r in drags if r['blockedClass'])),
            'backwardFinalDisplacements':sum(finite(r['forwardDisplacementCss']) and r['forwardDisplacementCss'] < -.5 for r in drags),
            'issuedBackwardFinalDisplacements':sum(r['issued'] and finite(r['forwardDisplacementCss']) and r['forwardDisplacementCss'] < -.5 for r in drags),
            'noTargetReasons':dict(Counter(r['skip'] for r in rows if r['arm']==arm and r['skip'])),
            'durationsAndDistances':{k:summarize_numbers(r[k] for r in drags) for k in MEASURES},
            'tapIssuedDrag':sum(bool(r['issued']) for r in sent if r['case'].startswith('tap/'))}
    accepted=[r for r in rows if r['arm']=='v6' and not r['skip'] and r.get('accepted') and not r['case'].startswith('tap/')]
    delta=[]
    for cell in cells:
        for k,old in cell['arms']['v5']['rows'].items():
            new=cell['arms']['v6']['rows'][k]
            old_class,new_class=outcome(old),outcome(new)
            if old_class!=new_class or any(bool(old.get(f))!=bool(new.get(f)) for f in ('selected','accepted','arrived','near4','terminalArrived','terminalNear4')):
                delta.append({'region':cell['region'],'count':cell['count'],'width':cell['width'],'case':k,'key':old['key'],'v5_class':old_class,'v6_class':new_class,
                    **{f'{arm}_{f}':cell['arms'][arm]['rows'][k].get(f) for arm in ARMS for f in ('selected','accepted','arrived','near4','terminalArrived','terminalNear4','fingerErrorCss','endFingerErrorCss','blockedClass')}})
    historic=[r for r in rows if r['count']==28 and r['width']==390 and r['case'] in ('historical/0','diagonal/1','occupied/2')]
    identity=lambda r:(r['region'],r['count'],r['width'],r['case'])
    before={identity(r):r for r in rows if r['arm']=='v5'}
    lost=[]
    backward=[]
    for new in rows:
        if new['arm']!='v6' or new['skip'] or new['case'].startswith('tap/'):
            continue
        old=before[identity(new)]
        if old['actualArrival'] and not new['actualArrival']:
            lost.append({**{k:new[k] for k in ('region','count','width','case','blockedClass')},'oldClass':old['outcomeClass'],'newClass':new['outcomeClass'],'oldErrorCss':old['endFingerErrorCss']})
        if finite(new['forwardDisplacementCss']) and new['forwardDisplacementCss']<-.5:
            backward.append({k:new[k] for k in ('region','count','width','case','key','selectedKey','selected','issued','endSource','forwardDisplacementCss','endDistanceCss')})
    summary={'lostArrivals':lost,'backwardFinalV6':backward,'historical13RegionReplay':comparison(historic),'measuredCells':len(cells),'dimensions':{'region':list(REGIONS),'count':list(COUNTS),'width':list(WIDTHS)},
        'profiles':full,'byRegion':regions,'byDimension':groups,'quality':quality,'sources':sources,
        'V6AcceptedWithoutArrival':sum(not r['actualArrival'] for r in accepted),'changedPairedOutcomes':len(delta)}
    (out/'matrix-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    if delta:
        write_csv(out/'matrix-changed-outcomes.csv',delta,list(delta[0]))
    print('Verified',len(cells),'paired profiles;',full['gesturesSent'],'matched actual drag inputs and',full['tapSent'],'taps per arm')
    print({k:v for k,v in full.items() if k.endswith(('_arrived','_near4','Gains','Losses'))})
    return summary


def verify_remote_provenance(raw,archives,run_id,summary):
    repo='Naoto214/naotocchi'
    run=json.loads(subprocess.check_output(['gh','run','view',str(run_id),'-R',repo,'--json',
        'status,conclusion,headSha,url,jobs']))
    require(run['status']=='completed' and run['conclusion']=='success','matrix workflow is incomplete')
    jobs=run.pop('jobs')
    require(len(jobs)==13 and all(j['conclusion']=='success' for j in jobs),'missing successful region job')
    found=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100']))
    require(found['total_count']==len(REGIONS),'incomplete CI artifact set')
    result={**run,'runId':run_id,'regions':{}}
    for a in found['artifacts']:
        region=a['name'].removeprefix('drag-matrix-')
        require(region in REGIONS and region not in result['regions'],'duplicate or unknown CI archive')
        require(summary['sources'][region]['git']==run['headSha'],'code revision mismatch')
        job=next(j for j in jobs if j['name']==f'region ({region})')
        candidates=list(archives.rglob(f'drag-matrix-{run_id}-{region}.zip'))
        require(len(candidates)==1,f'{region}: original ZIP not found')
        archive=candidates[0]
        actual=digest(archive.read_bytes())
        require('sha256:'+actual==a['digest'] and archive.stat().st_size==a['size_in_bytes'],f'{region}: CI ZIP digest mismatch')
        matches=[p.parent for p in raw.rglob('region.json') if json.loads(p.read_text())['runIdentity']['region']==region]
        require(len(matches)==1,'ambiguous extracted files')
        expected={'region.json'}|{f'{region}-{n}-{w}-matrix.json' for n in COUNTS for w in WIDTHS}
        with zipfile.ZipFile(archive) as z:
            require(set(z.namelist())==expected and len(z.namelist())==len(expected),region+' numerical archive contents')
            require(all(z.read(k)==(matches[0]/k).read_bytes() for k in expected),region+' extracted data differ')
        result['regions'][region]={'jobId':job['databaseId'],'artifactId':a['id'],'zipSHA256':actual,
            'bytes':a['size_in_bytes'],'startedAt':job['startedAt'],'completedAt':job['completedAt']}
    return result


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('raw',type=Path)
    ap.add_argument('--out',required=True,type=Path)
    ap.add_argument('--report',type=Path)
    ap.add_argument('--workflow',help='URL of the measured CI run')
    ap.add_argument('--actions-run',type=int)
    ap.add_argument('--zip-folder',type=Path,help='Directory containing drag-matrix-RUN-REGION.zip files')
    a=ap.parse_args()
    if (a.actions_run is None)!=(a.zip_folder is None):
        ap.error('--actions-run and --zip-folder are required together')
    summary=report(a.raw,a.out)
    if a.actions_run:
        source=verify_remote_provenance(a.raw,a.zip_folder,a.actions_run,summary)
        (a.out/'matrix-artifacts.json').write_text(json.dumps(source,indent=2)+'\n')
        a.workflow=source['url']
    if a.report:
        a.report.write_text(render_report(summary,a.workflow))
