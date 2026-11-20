"""Audit and summarize paired direct-touch samples after their raw files close."""
import argparse
import csv
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
from statistics import median

HERE=Path(__file__).resolve().parent
RAW_URL='https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v6/input/'
REGIONS='forest river_lake city home countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
NAMES='もり みずべ とかい おうち いなか やま ゆきぐに うみ ジャングル さばく しんかい ほしぞらのていりゅうじょ きおくのみずうみ'.split()
ARMS=('v5','v6')


def write_csv(path,rows):
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n')
        w.writeheader()
        w.writerows(rows)


def progress(r):
    if not r.get('scale') or not r.get('end') or not r.get('origin'):return None
    vector=[(x-y)*s for x,y,s in zip(r['modelGoal'],r['origin'],r['scale'])]
    step=[(x-y)*s for x,y,s in zip(r['end'],r['origin'],r['scale'])]
    length=math.hypot(*vector)
    return round(sum(a*b for a,b in zip(vector,step))/length,3) if length else None


def rows_for(group,arm):
    return [r for cell in group for r in cell['arms'][arm]['rows'].values() if not r['skip']]


def totals(group,arm):
    rows=rows_for(group,arm)
    keys=['trusted','selected','issued','accepted','routed','arrived','near4','terminalArrived','terminalNear4','unsafeSteps','sweptViolations','searchCount']
    return {k:sum(r.get(k,0) for r in rows) for k in keys}


def fmt(x):
    return '—' if x is None else str(x)


def distribution(rows,key):
    v=sorted(r[key] for r in rows if r.get(key) is not None)
    return '—' if not v else ' / '.join(f'{x:.1f}' for x in (median(v),v[math.ceil(.95*len(v))-1],max(v)))


def main(raw,out,report):
    raw=raw.resolve();out.mkdir(parents=True,exist_ok=True)
    cells=[];index=[];aged=[];contended=[];flat=[];gate_csv=[];feedback_csv=[];hashes={}
    fields=['trusted','selected','issued','accepted','routed','arrived','near4','terminalArrived','terminalNear4',
            'aimDistanceCss','earlyDistanceCss','endDistanceCss','fingerErrorCss','endFingerErrorCss','terminalChosenErrorCss','minStepFingerErrorCss','correctedErrorCss','arrivalClock',
            'releaseGoalErrorCss','releaseJumpCss','releaseMs','pointerQueueMs','releaseFrameMs','modelMoveMs','searchCount','searchMaxMs','searchTotalMs','unsafeSteps','sweptViolations','stepCount','blockedClass']
    for path in sorted(raw.glob('*/*.json')):
        blob=path.read_bytes();cell=json.loads(blob)
        if path.name.startswith('aged-'):
            relative=str(path.relative_to(raw));arm=cell['arm']
            opening_digest=hashlib.sha256(json.dumps(cell['opening'],sort_keys=True).encode()).hexdigest()
            assert cell['ageAtInputMs']>=180000 and not cell['visibility'] and not cell['errors']
            assert all(s['visible']=='visible' and not s['paused'] for s in cell['samples'])
            assert all(e[1:3]==['touch',True] for e in cell['tap']['events']+cell['drag']['events'])
            index.append(dict(file=relative,bytes=len(blob),sha256=hashlib.sha256(blob).hexdigest(),url=RAW_URL+relative))
            for script,digest in cell['hashes'].items():
                previous=hashes.setdefault((arm,script),digest);assert previous==digest,(relative,script)
            d=cell['drag'];samples=cell['samples']
            aged.append(dict(arm=arm,keptHomeOpen=cell.get('keepHomeOpen',False),dismissedInvitations=len(cell.get('prompts',[])),
                overlaysAtInput=' '.join(cell['drag']['gate']['visibleOverlays']),openingSHA256=opening_digest,wallSeconds=round(cell['ageAtInputMs']/1000,2),modelSeconds=round(samples[-1]['model']['clock']-samples[0]['model']['clock'],2),
                nativeMovesByThen=samples[-1]['model']['moves'],nativeDistanceByThen=round(samples[-1]['model']['distance'],2),
                tapSelected=cell['tap']['selected']==cell['tap']['plan']['key'],tapGate=cell['tap']['gate']['blocked'],dragKey=d['plan']['key'],
                enteredBlocked=d['gate']['blocked'],actualRequests=len(d['nativeRequests']),steps=len(d['steps']),
                firstFootMs=d['firstStepAfterUpMs'],lastStepMs=d['lastStepAfterUpMs'],nativeArrivalMs=d['arrivalAfterUpMs'],
                stationaryAtGoal=d['stationaryAtLastGoal'],fingerErrorCss=d['finalOriginalErrorCss'],raw=relative))
            continue
        assert cell['paired'] and set(cell['arms'])==set(ARMS),path
        a,b=(cell['arms'][arm] for arm in ARMS)
        assert a['opening']==b['opening'] and a['seed']==b['seed'] and a['viewport']==b['viewport'],path
        assert set(a['rows'])==set(b['rows']),path
        relative=str(path.relative_to(raw));is_contended='-contended.' in path.name
        if not is_contended:cells.append(cell)
        idx=dict(file=relative,bytes=len(blob),sha256=hashlib.sha256(blob).hexdigest(),url=RAW_URL+relative)
        index.append(idx)
        for name,arm in cell['arms'].items():
            for script,digest in arm['hashes'].items():
                previous=hashes.setdefault((name,script),digest)
                assert previous==digest,(path,name,script,previous,digest)
            for key,r in arm['rows'].items():
                other=(b if name=='v5' else a)['rows'][key]
                assert all(r.get(k)==other.get(k) for k in ('key','kind','index','start','goal','skip')), (path,key)
                prefix=dict(engine=cell['engine'],region=cell['region'],width=cell['width'],count=cell['count'],suite=cell['suite'],arm=name,
                            case=key,resident=r['key'],skip=r['skip'])
                if is_contended:
                    received=r.get('released',{})
                    first_up=next((v for v in r.get('pointerEvents',[]) if v[0]=='pointerup'),None)
                    requests=r.get('nativeRequests',[])
                    event=r.get('markers',[])
                    contended.append(dict(**prefix,ordinaryBlockedOnReadback=received.get('gate',{}).get('blocked'),
                        requestStillQueuedOnReadback=bool(received.get('intent')),markerAtPointerUp=next((v[1] for v in event if v[0]=='pointerup'),None),
                        initialProbeElapsedMs=received.get('clock'),calls=len(requests) if cell['suite']=='gates' else int(r['issued']),arrived=r['arrived'],
                        firstUpToIssueMs=round(requests[0]['wall']-first_up[5],2) if requests and first_up else None,
                        firstScreenObservationMs=next((round(v['wall'],2) for v in r.get('feedbackTimeline',[])),None),raw=relative))
                    continue
                if not r['skip']:
                    assert r['trusted'],(path,key)
                    if cell['suite']=='gates':
                        gate_csv.append(dict(**prefix,markerAtRelease=r['released']['marker'],queuedAtRelease=bool(r['released']['intent']),
                            calls=len(r['nativeRequests']),arrived=r['arrived'],issueMsAfterRelease=round(r['nativeRequests'][0]['wall']-next(v[5] for v in r['pointerEvents'] if v[0]=='pointerup'),2) if r['nativeRequests'] else None,
                            originalGoalErrorCss=r['releaseGoalErrorCss'],arrivalErrorCss=r['fingerErrorCss']))
                        continue
                    assert not r['terminalNear4'] or r['terminalArrived'] and r['endFingerErrorCss']<=4, (path,key)
                    assert not r['arrived'] or r['issued'],(path,key)
                    assert not r['terminalArrived'] or r['stepCount'] and r['terminalChosenErrorCss']<=.01,(path,key)
                    for point in r.get('feedbackTimeline',[]):feedback_csv.append(dict(**prefix,ms=round(point['wall'],1),visible=point['marker'],refused=bool(point['refused']),waiting=bool(point['waiting'])))
                phase=Counter(s.get('phase','unknown') for s in r.get('searches',[]))
                peer=r.get('peerWalk',{})
                d=r.get('demandAtRelease',{})
                flat.append(dict(**prefix,**{k:r.get(k) for k in fields},projectedProgressCss=progress(r),yieldPeer=d.get('yieldPeer'),
                    movedPeers=' '.join(sorted(peer)),peerSteps=sum(p['steps'] for p in peer.values()),
                    pendingAtRelease=d.get('pending'),pendingAtEarly=(r.get('demandAtEarly') or {}).get('pending'),pendingAtEnd=r.get('demandAtEnd',{}).get('pending'),
                    pointerDownSearches=phase['pointerdown'],pointerMoveSearches=phase['pointermove'],pointerUpSearches=phase['pointerup'],simulationSearches=phase['simulation'],
                    nativePlans=len(r.get('nativePlans',[])),maxPlanMs=max((p['ms'] for p in r.get('nativePlans',[])),default=0),raw=relative))
    if aged:
        assert len(aged)==4 and len({v['openingSHA256'] for v in aged})==1
        assert all(v['modelSeconds']>=180 or (v['wallSeconds']>=360 and v['enteredBlocked']) for v in aged if v['keptHomeOpen'])
        write_csv(out/'aged-input.csv',aged)
    if contended:write_csv(out/'contended-input.csv',contended)
    write_csv(out/'focused-input.csv',flat);write_csv(out/'input-artifacts.csv',index)
    write_csv(out/'reaction-input.csv',gate_csv);write_csv(out/'refusal-feedback.csv',feedback_csv)
    forest=[c for c in cells if c['suite']=='forest' and c['engine']=='chromium']
    region=[c for c in cells if c['suite']=='region' and c['engine']=='chromium']
    wpe=[c for c in cells if c['engine']=='webkit']
    gates=[c for c in cells if c['suite']=='gates']
    gestures=[c for c in cells if c['suite']=='gestures']
    if gates:
        expected={'notice','bounce','during'}
        buffered={'notice','bounce','during','expire','modal','pause','replace'}
        for arm in ARMS:
            for rr in gates[0]['arms'][arm]['rows'].values():
                assert rr['entered']['ordinary'] and rr['trusted']
                if arm=='v6':
                    must_arrive=rr['kind'] in expected
                    assert bool(rr['released']['intent'])==(rr['kind'] in buffered),(rr['kind'],'actual precondition missing')
                    assert len(rr['nativeRequests'])==int(must_arrive) and rr['arrived']==must_arrive
                    if must_arrive:assert rr['releaseGoalErrorCss']<=.001 and rr['fingerErrorCss']<=.001
                else:assert not rr['issued'] and not rr['arrived']
    directions=[c for c in cells if c['suite']=='directions']
    detour=[c for c in cells if c['suite']=='detour']
    assert len(forest)==1 and set(c['region'] for c in region)==set(REGIONS) and len(gates)==1
    stats={k:{arm:totals(g,arm) for arm in ARMS} for k,g in [('forest',forest),('regions',region),('webkit',wpe),('directions',directions),('detour',detour)]}
    v=stats['forest'];regional=stats['regions']
    lines=['# 実際のタッチと足元の到着','',
        f"もりの28体に同じ12pxのドラッグを送ると、歩き終えて最後の経路の終点にいた住民は V5 の {v['v5']['terminalArrived']}体から V6 の {v['v6']['terminalArrived']}体に増えた。指から4px以内に止まった住民は {v['v5']['terminalNear4']}体から {v['v6']['terminalNear4']}体になった。全13地域・39操作では、終点に達した操作が {regional['v5']['terminalArrived']}件から {regional['v6']['terminalArrived']}件、指から4px以内の停止が {regional['v5']['terminalNear4']}件から {regional['v6']['terminalNear4']}件だった。",'',
        '### 同じ場面と操作','',
        '本編の2ページを別々に開き、同じ地域・座席・人数・乱数状態で開始した。基準側の住民画像の不透明な画素を押し、同じ画面座標で5回動かしてから離した。最初の本人・足・当たり判定・指定点を保存した。Chrome DevTools Protocol または Linux WebKit のタッチプロトコルから送り、ページが実際に受けた pointerType=touch、isTrusted=true を確認した。実機iPhoneでの測定は含まない。単位はCSSピクセル。','',
        'もりは28体全員の足元から水平方向へ12px。地域別の3操作は、主人公の水平、恋人の斜め、仲間から別の住民の足への指定。画面は390×844、ゲーム部分は390×792。2つの歴史的比較では従来の本編の開始手順を使った。260条件のマトリクスとWebKitでは、共通の比較画面が時刻0の確定した歩行面に住民を配置した直後を測った。WPEのタッチ座標は整数に丸まる。9操作の実際の離した点と事前に定めた指先との差は最大0.544pxで、両版の差はなかった。','',
        '主人公や仲間の自発的な新規行動は固定比較の間止めた。実入力の後、0.05モデル秒ずつ進め、0.70秒の足、12.35秒の足、歩行中の各区間を記録した。近さは元の指先への誤差、到達は本人が実歩行し、最後の採用経路の終点と停止位置の誤差が0.01px以下。元の到着リアクションには650msの連続通知抑制があり、2区間目の終点に足が届いた際のイベントが省かれる場合がある。イベント時と停止時を別に掲載する。','',
        '| 条件と版 | 選択 / 指示 | 直後に経路を受理 | 到着イベント | イベント時4px以内 | 終点へ歩いて停止 | 停止時4px以内 |','|---|---:|---:|---:|---:|---:|---:|']
    for name,g in [('もり・28体',forest),('13地域・39操作',region),('WebKit・3地域',wpe)]:
        for arm in ARMS:
            t=totals(g,arm);lines.append(f"| {name} {arm.upper()} | {t['selected']} / {t['issued']} | {t['accepted']} | {t['arrived']} | {t['near4']} | {t['terminalArrived']} | {t['terminalNear4']} |")
    changes=[]
    aa,bb=(forest[0]['arms'][name]['rows'] for name in ARMS)
    for key,r in bb.items():
        old=aa[key]
        if r['terminalArrived'] and not old['terminalArrived']:
            changes.append(f"{r['key'].split(':')[-1]} は {r['endDistanceCss']:.2f}px 歩いて指から {r['endFingerErrorCss']:.2f}px")
    lines+=['','新しく歩けた3体では、'+ '、'.join(changes)+'の位置に止まった。すぐに経路が受理された件数は両版で同じで、この3件は道を空けた仲間の実歩行後に始まった。[森の全28体](evidence/focused-input.csv) ／ [前回のV4・V5比較](../home-finish-v5/INPUT.md)']
    lines+=['','### 地域ごとの3操作','','数値は「本人が終点に停止した数 / 最終位置が指から4px以内の数」。','',
        '| 地域 | V5 | V6 |','|---|---:|---:|']
    for key,label in zip(REGIONS,NAMES):
        g=[c for c in region if c['region']==key]
        values=[totals(g,a) for a in ARMS]
        lines.append('| '+label+' | '+' | '.join(f"{t['terminalArrived']} / {t['terminalNear4']}" for t in values)+' |')
    region_map={c['region']:c for c in region}
    for zone,label in [('city','とかい'),('river_lake','みずべ')]:
        base,new=(region_map[zone]['arms'][k]['rows'] for k in ARMS)
        r=new['occupied/2']
        lines+=['',f"{label}で仲間がほかの足を指定した操作では、V5で足が動かず、V6では本人が {r['endDistanceCss']:.2f}px 歩いて指から {r['endFingerErrorCss']:.2f}pxの位置に止まった。恋人の68px斜め指定は両版で移動を見送った。"]
    lr=[r for c in region for r in c['arms']['v6']['rows'].values() if not r['terminalArrived']]
    causes=Counter(r['blockedClass'] for r in lr)
    lines+=['',f"V6の未到着 {len(lr)}件の指定点を開始時の姿勢で分類すると、他者が占有していたものが {causes['occupied']}件、地面の歩行域を外れたものが {causes['non-ground']}件だった。本人は全39件で選択され、ドラッグ指示を受けている。取りやすさの改善と経路の改善を別々に数えた。"]
    lines+=['','もりの全員を個別に比較した記録には、指先からの最短距離、停止時の距離、指の方向への移動量、道を空けた住民の名前と歩数がある。指に近づく向きの移動を評価するときは、本人が3px以上歩き、指向きへの投影が2px以上で、最終誤差が0.75px以上縮んだものを数える。住民の選択、本人以外の移動、通過中の一瞬の近さは停止時の到達数に加えない。 [操作別CSV](evidence/focused-input.csv)','',
        '### 通知・バウンド中の指示','','実際のゲームの発話・リアクション・メニュー処理をテストから開始し、その画面にブラウザーのタッチを送った。通知後の再生は実際の時計とゲームのフレームで待った。ゲームに登録されたドラッグ指示の回数、元の離した地点、本人の到着を照合した。','',
        '| 状態 | V5 指示 | V6 離した瞬間の印 | V6 指示 / 到着 | V6 指示までの実時間 |','|---|---:|---:|---:|---:|']
    labels=['すでに発話中','すでにバウンド中','押した後に発話','発話中のタップ','発話中の空き地','長い通知で期限切れ','離した後に旅行メニュー','離した後に一時停止','指操作をキャンセル','離した後に新しいタップ','最初から旅行メニュー']
    for label,(k,a) in zip(labels,gates[0]['arms']['v5']['rows'].items()):
        b=gates[0]['arms']['v6']['rows'][k]
        lines.append(f"| {label} | {len(a['nativeRequests'])} | {'あり' if b['released']['marker'] else 'なし'} | {len(b['nativeRequests'])} / {int(b['arrived'])} | {round(b['nativeRequests'][0]['wall']-next(v[5] for v in b['pointerEvents'] if v[0]=='pointerup')) if b['nativeRequests'] else '—'} ms |")
    lines+=['','[通知・取り消しの数値](evidence/reaction-input.csv) ／ [行けないときの印と表示時刻](evidence/refusal-feedback.csv)','',
        '### 入力処理・経路探索','','CSSのイベント開始から終了、離したイベント時刻から最初の描画コールバックまでをブラウザー時計で採取した。表示は中央値 / 95パーセンタイル / 最大（ms）。探索は直線判定のあと格子を実際に作って探索した回数。経路再試行を含み、各要求の全探索時間と最も重い単一探索を操作別CSVに残す。ローカルの森28件は複数ブラウザーの初期化と同時に走った計装付き計測で、端末上の表示遅延とは測定条件が異なる。各地域を独立したActionsランナーで実行した入力時間は260条件の表に掲載した。','',
        '| もり28操作 | 入力待ち | pointerup処理 | 離してから最初のRAF | 1操作あたり最重探索 | 全探索数 |','|---|---:|---:|---:|---:|---:|']
    for a in ARMS:
        r=rows_for(forest,a)
        lines.append('| '+a.upper()+' | '+' | '.join(distribution(r,k) for k in ('pointerQueueMs','releaseMs','releaseFrameMs','searchMaxMs'))+f" | {sum(v['searchCount'] for v in r)} |")
    for suite,label in [(directions,'8方向'),(detour,'迂回')]:
        if suite:
            a,b=(totals(suite,k) for k in ARMS)
            lines+=['',f"{label}の追加試行では、実際に指を送れた条件が {a['trusted']}件、本人の終点到着が V5 {a['terminalArrived']}件、V6 {b['terminalArrived']}件、4px以内の停止が各 {a['terminalNear4']}件・{b['terminalNear4']}件。事前に候補が見つからなかった対象はCSVのskip欄に残した。"]
    lines+=['','### 画面幅・キャンセル・拒否時の反応','','320pxと430pxでは、住民画像のタップ、5pxの指ぶれ、10px移動、pointercancel、空き地のタップ、一時停止でのタップを区別した。下表の数値は本編が受けた本人宛てのドラッグ指示数。','',
            '| 条件 | V5 | V6 |','|---|---:|---:|']
    for kind in ('tap','jitter','threshold','cancel','empty','paused'):
        counts=[sum(bool(r['issued']) for r in rows_for(gestures,a) if r['kind']==kind) for a in ARMS]
        lines.append(f'| {kind} | {counts[0]} | {counts[1]} |')
    critical=[r for r in feedback_csv if r['arm']=='v6' and r['case']=='historical/2']
    if critical:
        detail='、'.join(f"{r['ms']}msで{'表示' if r['visible'] else '消去'}" for r in critical)
        lines+=['',f"足元の占有で進めない猫への指示は離した直後の座標を保持した。実時間の表示サンプルは {detail}。この印は本人の歩行成功には加えない。"]
    non_live=[c for c in cells if c['suite'] not in ('live','gates')]
    for a in ARMS:
        rr=rows_for(non_live,a)
        pointermove=sum(sum(s.get('phase')=='pointermove' for s in x['searches']) for x in rr)
        lines+=['',f"{a.upper()} の固定試行全体では、指を動かしている最中の格子探索は {pointermove}回。最も大きい受理直後の座標移動は {max((r['releaseJumpCss'] for r in rr if r['releaseJumpCss'] is not None),default=0):g}px。"]
    if contended:
        delayed=[v for v in contended if v['arm']=='v6' and v['suite']=='gates']
        actual=[v for v in delayed if v['calls']]
        fb=[v for v in contended if v['suite']=='feedback' and v['arm']=='v6' and v['case']=='historical/2']
        lines+=['','### 同時起動でイベント処理が遅れた別試行','',
                f"複数の検証用ブラウザーを同じ4コアで同時に起動した試行も保存した。V6の通知中の11操作で {len(actual)}件の移動指示が出た。通知開始から操作後の読み取りまで最長 {max(v['initialProbeElapsedMs'] for v in delayed)/1000:.2f}秒かかり、離す前に短い通知が終わる、または後続のメニュー操作の前に指示が発行されるケースが混じった。この表とは別ファイルに、実際に離した順序・保持状態・発行数を掲載した。"]
        if fb:lines.append(f"足元の拒否時の輪はpointerup内で表示されたが、次に状態を読めたのは {fb[0]['firstScreenObservationMs']:.0f}ms後で、その時点で消えていた。")
        lines+=['','[同時起動時の全入力・観測順](evidence/contended-input.csv)']
    if aged:
        lines+=['','### 通常再生を3分以上続けてからの指操作','',
                'もり4体を両版とも時刻0の同じ配置から通常再生し、表示状態・ゲーム時計・自律移動を記録した。1回目は3分間画面を開いたままにしたところ、両版とも2分までになかまの誘いが出て、背後のゲーム時計が約80秒で止まった。3分後の実タップとドラッグはこのダイアログが受けた。2回目は誘いが出た際に通常の「またこんど」をタップして閉じ、実時間とモデル時間がともに181秒を超えて通常のホームに戻るまで、最長6分待った。V6はその条件で入力できた。V5は1回目の誘いを閉じた後、162.43モデル秒・移動開始55回で通常の入力制限に入り、実時間360.57秒でも解除されなかった。画像上の押した座標は主人公に当たり、移動指示は0件。試遊の停止・画面の非表示・描画準備・共有のリアクション・検出対象の画面ダイアログは記録されていない。元のV5はゲーム側の制限を一つの真偽値で返すため、その中の個別理由は特定できなかった。位置やゲーム時計の復元は行っていない。','',
                '| 版・状態 | 実秒 / モデル秒 | それまでの移動開始 | 誘いを閉じた回数 | タップで本人選択 | ドラッグ指示数 | 離してから最初の一歩 ms | 最後の歩行ステップ / 到着通知 ms | 最後の指先誤差 px |',
                '|---|---:|---:|---:|---:|---:|---:|---:|---:|']
        for d in sorted(aged,key=lambda d:(d['keptHomeOpen'],d['arm'])):
            lines.append(f"| {d['arm'].upper()}・{'誘いを閉じる試行' if d['keptHomeOpen'] else '誘い表示中'} | {d['wallSeconds']} / {d['modelSeconds']} | {d['nativeMovesByThen']} | {d['dismissedInvitations']} | {int(d['tapSelected'])} | {d['actualRequests']} | {fmt(d['firstFootMs'])} | {fmt(d['lastStepMs'])} / {fmt(d['nativeArrivalMs'])} | {fmt(d['fingerErrorCss'])} |")
        lines+=['','[長時間起動後の実タッチ結果](evidence/aged-input.csv) ／ [連続再生の測定方法](aged_input.py)']
    live=[c for c in cells if c['suite']=='live']
    if live:
        lines+=['','### 通常再生のドラッグ','','通常のゲーム時計、フレーム、自発的な動きとともに操作した追加試行。最初の指示後、実時間700msの位置と12.35モデル秒経過後までを観測した。各回の実際の歩行・占有状況が変化する。','',
                '| 住民 | 版 | 直後の受理 | 700msでの歩行 px | 到着時の指先誤差 px | 最後の足の誤差 px |','|---|---|---:|---:|---:|---:|']
        for a in ARMS:
            for r in rows_for(live,a):
                lines.append(f"| {r['key']} | {a.upper()} | {int(r['accepted'])} | {fmt(r['earlyDistanceCss'])} | {fmt(r['fingerErrorCss'])} | {fmt(r['endFingerErrorCss'])} |")
    standard=[r for r in flat if r['skip'] is None]
    lines+=['',f"固定・追加サンプルの全測定で、住民や手伝う仲間の歩行での安全違反 {sum(r['unsafeSteps'] for r in standard)}件、歩行区間が新たに他者の占有楕円を横切った違反 {sum(r['sweptViolations'] for r in standard)}件。各歩の速度、歩行面、キャラクターの範囲、開始時に接触していた相手との離れ方を検査した。",'',
        '### 再現と全条件','','[260条件の結果](MATRIX.md) ／ [測定プログラム](measure_input.py) ／ [元データのSHA-256と本人限定URL](evidence/input-artifacts.csv)','',
        '`python measure_input.py --origin http://127.0.0.1:8366 --suite forest --out /tmp/drag-input/chromium` で森の28件を再生できる。WebKitは同じコマンドに `--engine webkit` を付け、Linux WebKit実行ファイルを `WEBKIT_PATH` で指定する。記録の集計は `python summarize_input.py --raw /tmp/drag-input`。全件集計には chromium と webkit の結果を両方置く。']
    report.write_text('\n'.join(lines)+'\n')
    return stats


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw',required=True,type=Path)
    parser.add_argument('--out',default=HERE/'evidence',type=Path)
    parser.add_argument('--report',default=HERE/'INPUT.md',type=Path)
    args=parser.parse_args()
    print(json.dumps(main(args.raw,args.out,args.report),indent=2))
