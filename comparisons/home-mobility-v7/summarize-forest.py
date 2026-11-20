"""Join the three continuous forest observations, actual physical drops and native footprint probes."""
import argparse, csv, gzip, json
from collections import Counter
from pathlib import Path

KNOWN=['v5','v6','v7']
COLUMNS=['arm','key','native_seconds','ambient_requests','ambient_plans','ambient_plan_failures','ambient_real_starts','ambient_arrivals',
 'ambient_distance_native_px','last_moved_ago_s','longest_stationary_s','last_source','failed_intent_episodes','recovered_episodes',
 'end_nearest_key','end_nearest_distance_native_px','end_nearest_ellipse_ratio','end_overlaps','confirmed_step_blocker_ids',
 'failed_goal_direct_obstructions','initial_overlap_failures','off_terrain_goal_failures','outside_bounds_goal_failures','ink_occluded_goal_failures',
 'wait_reasons','state_seconds','end_aged_drag_selected','end_aged_gate_at_start','end_aged_drag_issued_to','end_aged_drag_own_command','end_aged_drag_first_step','end_aged_drag_arrival',
 'end_aged_drag_own_steps_in_1p8s','end_aged_drag_retries','end_aged_yield_offers','end_aged_yield_successes','end_aged_helpers_given','end_aged_helpers_received',
 'all_aged_commands_received','all_aged_drag_plans','all_aged_drag_starts','all_aged_drag_arrivals','yield_helper_first_steps','yield_helper_arrivals','sequential_helper_stages_received','origin_overlap_peer_ids','goal_overlap_peer_ids','native_step_veto_reasons','own_drag_first_refusal_start_contacts','own_drag_first_refusal_goal_contacts','own_drag_first_refusal_direct_segment','own_drag_first_refusal_goal_terrain','own_drag_first_refusal_goal_ink','escape_plans','escape_starts','escape_arrivals','dual_failure','opening_locally_safe_rays','opening_safe_but_still_overlapping','aged_locally_safe_rays','aged_geometry_lock']

def read(path):return json.loads(gzip.decompress(path.read_bytes()))
def jf(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def pct(n,d):return f'{100*n/d:.1f}%' if d else '該当なし'
def top(d):return sorted(d,key=d.get,reverse=True)
def keys(values):return '、'.join(k.split(':',1)[-1] for k in values) if values else '該当なし'
def R(x):return round(x,3)
def write(study,geom,base):
    base.mkdir(parents=True,exist_ok=True);evidence=base/'evidence';evidence.mkdir(exist_ok=True)
    data={arm:read(study/(arm+'-forest28.json.gz')) for arm in KNOWN}
    local=read(geom)
    assert all(d['arm']==key and d['baseline']['arm']==key for key,d in data.items())
    assert all(d['postDrag']['eventsRetained']<6000 for d in data.values()),'timeline capped before all individual commands could be checked'
    assert len({v['openingSHA256'] for v in data.values()})==1
    assert len({v['sources']['telemetry.js'] for v in data.values()})==1
    assert all(d['baseline']['modelSeconds']>=300 and d['wallSeconds']>=300 and all(x['visible']=='visible' and x['playing'] for x in d['stateChecks']) for d in data.values())
    assert all(len(d['drags'])==28 and len(d['baseline']['residents'])==28 and not d['errors'] for d in data.values())
    opening={r['key']:r for r in local['opening']}
    assert len(opening)==28
    output=[];summary={}
    for arm,d in data.items():
        report=d['baseline'];residents=report['residents'];post={a['key']:a for a in d['postDrag']['residents']};events=d['postDragEvents']['events']
        aged={a['key']:a for a in local['aged'][arm]};physical={a['key']:a for a in d['drags']}
        totals=Counter();never=[];noIntent=[];long=[];dual=[];incorrect=[];noIssue=[];starts=[];real=[];noStep=[]
        for a in residents:
            key=a['key'];q=physical[key];k=post[key];issued=q.get('issuedKeys',[])
            command=next((e['command'] for e in events if e['type']=='drag-request' and e['key']==key and q.get('at',1e9)-1e-6<=e['clock']<=q.get('until',0)+1e-6 and key in issued),None)
            steps=[e for e in events if e['type']=='first-step' and e.get('source')=='drag' and e['key']==key and command is not None and e.get('command')==command]
            arrivals=[e for e in events if e['type']=='arrival' and e.get('source')=='drag' and e['key']==key and command is not None and e.get('command')==command]
            trusted=bool(q.get('events')) and {'pointerdown','pointerup'}.issubset({ev[0] for ev in q['events']}) and all(ev[1] and ev[2]=='touch' for ev in q['events'])
            firstRefusal=next((e for e in events if e['type']=='plan-failed' and e['key']==key and e['source']=='drag' and command is not None and q['at']-1e-6<=e['clock']<=q['until']+1e-6),{})
            if trusted:totals['trusted']+=1
            if 'illness' not in q.get('gateBefore',[]):
                totals['withoutIllnessAtStart']+=1;totals['issuedWithoutIllnessAtStart']+=command is not None;totals['startedWithoutIllnessAtStart']+=bool(steps)
            if q.get('selected')==key:totals['selected']+=1
            else:incorrect.append(key)
            if command is None:noIssue.append(key)
            else:real.append(key)
            if steps:starts.append(key)
            elif command is not None:noStep.append(key)
            if a['ambientStarts']==0:
                if a['ambientFailures'] or a['ambientPlans']:never.append(key)
                else:noIntent.append(key)
            if a['lastMovedAgo']>=60:long.append(key)
            failedBoth=a['ambientStarts']==0 and a['ambientFailures']>0 and command is not None and not steps
            if failedBoth:dual.append(key)
            totals['arrivedPhysical']+=bool(arrivals)
            for fld in ['ambientRequests','ambientPlans','ambientFailures','ambientStarts','ambientArrivals','failureEpisodes','recoveredEpisodes','escapePlans','escapeStarts','escapeArrivals','vetoCount']:
                totals[fld]+=a.get(fld,0)
            geo=aged[key];near=a['nearest'];op=opening[key];state={k:R(v) for k,v in a['stateSeconds'].items()}
            row=[arm,key,R(report['modelSeconds']),a['ambientRequests'],a['ambientPlans'],a['ambientFailures'],a['ambientStarts'],a['ambientArrivals'],R(a['ambientDistance']),
              R(a['lastMovedAgo']),R(a['stationaryMax']),a['lastSource'] or '',a['failureEpisodes'],a['recoveredEpisodes'],near['key'],R(near['distance']),R(near['clearance']),
              jf([p['key'] for p in a['overlaps']]),jf(a['blockingPeers']),jf(a['directObstructions']),a['failuresAtOriginOverlap'],a['failuresOffTerrain'],
              a['failuresOutsideBounds'],a['failuresAtOcclusion'],jf(a['waitReasons']),jf(state),q.get('selected') or '',jf(q.get('gateBefore',[])),jf(issued),command or '',int(bool(steps)),int(bool(arrivals)),
              q.get('ownStarts',0),k['retries']-a['retries'],k['yieldOffers']-a['yieldOffers'],k['yieldSuccesses']-a['yieldSuccesses'],k['yieldsGiven']-a['yieldsGiven'],
              k['yieldsReceived']-a['yieldsReceived'],k['dragRequests']-a['dragRequests'],k['dragPlans']-a['dragPlans'],k['dragStarts']-a['dragStarts'],k['dragArrivals']-a['dragArrivals'],k['yieldPhysicalStarts']-a['yieldPhysicalStarts'],k['yieldArrivals']-a['yieldArrivals'],k['sequentialStages']-a['sequentialStages'],jf(a['startContactPeers']),jf(a['goalContactPeers']),jf(a['stepVetoes']),jf(firstRefusal.get('start',[])),jf(firstRefusal.get('goal',[])),jf(firstRefusal.get('line',[])),firstRefusal.get('terrain',''),firstRefusal.get('visible',''),a.get('escapePlans',0),a.get('escapeStarts',0),a.get('escapeArrivals',0),int(failedBoth),
              op['count']['free'],op['count']['escapeOnly'],geo['count']['free'],int(geo['contactAndBoundsLockAllDirections'])]
            assert len(row)==len(COLUMNS)
            output.append(dict(zip(COLUMNS,row)))
        totals['physicalIssued']=len(real);totals['physicalStarts']=len(starts);totals['physicalNoStep']=len(noStep)
        summary[arm]={'totals':dict(totals),'neverAfterIntent':never,'noIntent':noIntent,'last60':long,'dual':dual,'physicalNoIssue':noIssue,'physicalWrongSelection':incorrect,
          'physicalNoStep':noStep,'dragYieldOffers':sum(a['yieldOffers'] for a in post.values()),'dragYieldSucceeded':sum(a['yieldSuccesses'] for a in post.values()),'dragYieldHelpers':sum(a['yieldsGiven'] for a in post.values()),'dragSequentialOffers':sum(a['sequentialOffers'] for a in post.values()),'dragStartGateCounts':dict(Counter(g for q in physical.values() for g in q.get('gateBefore',[]))),'dragStartIllnessKeys':[q['key'] for q in physical.values() if 'illness' in q.get('gateBefore',[])],'careInterventions':d.get('interventions',[]),'physicalStartsKeys':starts,'gateReasons':report['gateReasons'],'pausedSeconds':report['pausedSeconds'],'wallSeconds':d['wallSeconds'],
          'modelSeconds':report['modelSeconds'],'openingSHA256':d['openingSHA256'],'sources':d['sources']}
    for arm,d in data.items():
        for i in summary[arm]['careInterventions']:
            trans=next((e for e in d['events']['gateTransitions'] if e['wallSeconds']>=i['wall'] and 'illness' not in e['reasons']),None)
            resumes=next((z for z in d['observations'] if z['wall']>i['wall'] and z['nativeSeconds']>i['modelSeconds']+.05),None)
            i['illnessGateEndedAtWall']=None if trans is None else trans['wallSeconds']
            i['firstSampleWithProgress']=None if resumes is None else {'wall':resumes['wall'],'modelSeconds':resumes['nativeSeconds']}
    with (evidence/'forest-residents.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=COLUMNS,lineterminator='\n');w.writeheader();w.writerows(output)
    (evidence/'forest-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    lines=['# 森の28体を連続再生した記録','',
      '390×792 CSS px、端末倍率2のChromiumで、V5・V6・V7それぞれのゲームを開いた。各版とも同じ28体、秋の晴れた昼、サイズB、同じ初期足座標から再生した。試遊用の住民乱数とゲームの標準乱数にはそれぞれ214を与えた。ゲームを表示したまま、自律行動、会話、通常のリアクション、経路の選択、描画を進めた。観測中は位置や乱数を巻き戻していない。実時間と移動モデル上の時間の両方が305秒を超えてから、個体ごとに本物のタッチイベントでドラッグした。フレームの実行時刻と選んだ経路によって、開始後の乱数の消費順や終盤の足位置は変わる。','',
      '| 連続再生 | 実時間 / モデル秒 | 自律指示 | 経路成立 / 不成立 | 実際に歩き始めた回数 | 到着 | 指示があったが一歩も動かなかった住民 | 最後の一歩から60秒以上 |','|---|---:|---:|---:|---:|---:|---:|---:|']
    for arm,x in summary.items():
        t=x['totals'];lines.append(f"| {arm.upper()} | {x['wallSeconds']:.1f} / {x['modelSeconds']:.1f} | {t['ambientRequests']} | {t['ambientPlans']} / {t['ambientFailures']} | {t['ambientStarts']} | {t['ambientArrivals']} | {len(x['neverAfterIntent'])} | {len(x['last60'])} |")
    lines+=['','「歩き始めた」は、モデルが経路を返し、本人の足が実際に正の距離を進んだ最初のステップ。到着は中継点ではなく本人が経路の最後に出した通知を数えた。最後の移動からの時間はホームの移動モデルが進んだ秒数で、初回の一歩がない場合は観測開始から数えた。','',
      '## 歩く意思と、実際に進めたか','']
    for arm,x in summary.items():lines.append(f"- {arm.upper()}で自律指示があり、観測中に一度も歩かなかった住民は{len(x['neverAfterIntent'])}体。{keys(x['neverAfterIntent'])}。自律移動の経路を一度も調べなかった住民は{len(x['noIntent'])}体。終了時に最後の一歩から60秒以上経過していた個体は{keys(x['last60'])}。")
    recovered=[k for k in summary['v6']['neverAfterIntent'] if k not in summary['v7']['neverAfterIntent'] and k not in summary['v7']['noIntent']]
    lost=[k for k in summary['v7']['neverAfterIntent'] if k not in summary['v6']['neverAfterIntent']]
    lines+=['',f"V6で一歩も動かず、V7で歩いた住民は{len(recovered)}体。{keys(recovered)}。V6では歩き、V7では一歩も動かなかった住民は{len(lost)}体。{keys(lost)}。初期条件をそろえた各版1回の観測である。",'',
      '| 版 | 実経路の拒否から始まった連続失敗区間 | 後に本人の自律歩行で一歩進んだ区間（復帰率） | V7の局所移動の成立 / 実歩行 / 到着 |','|---|---:|---:|---:|']
    for arm,x in summary.items():
        t=x['totals'];lines.append(f"| {arm.upper()} | {t['failureEpisodes']} | {t['recoveredEpisodes']}（{pct(t['recoveredEpisodes'],t['failureEpisodes'])}） | {t['escapePlans']} / {t['escapeStarts']} / {t['escapeArrivals']} |")
    lines+=['','失敗が続いた区間は、実際に経路を調べた要求の不成立で開始し、その後同じ住民が自律移動またはドラッグで物理的に一歩進んだときに閉じた。待機、睡眠、メニュー、動ける人数の上限による延期だけでは区間を開始しない。別の目的地への歩行でもこの回復に含まれる。観測終了時点で閉じていない区間も分母に含む。','',
      '## 長時間再生した後の実タッチ','',
      '名簿順に1人1回、本人の不透明な画像上を押し、足から画面中央方向へ水平12 CSS pxの地点で指を離した。候補の中では画像の前面が本人の点を優先した。見える不透明な点がない場合は欠測とし、前面に別の住民しかいない場合は重なったまま送った。一人ずつ約1.8秒観測し、最後の操作後も12.5秒待った。各版の開始時は同じ世帯だが、5分後の配置も操作時刻も版ごとに異なる。','',
      '| 版 | 信頼済み入力 | 操作後に本人が選択状態 | 本人へ初回発行 | 同一指示で本人が実歩行 | 到着 | 自律・正しく届いたドラッグの双方で歩けなかった個体 |','|---|---:|---:|---:|---:|---:|---:|']
    for arm,x in summary.items():
        t=x['totals'];lines.append(f"| {arm.upper()} | {t['trusted']}/28 | {t['selected']}/28 | {t['physicalIssued']}/28 | {t['physicalStarts']}/28 | {t['arrivedPhysical']}/28 | {len(x['dual'])} |")
    lines.append('')
    for arm,x in summary.items():lines.append(f"- {arm.upper()}で正しく本人に届いても自律・ドラッグの双方で歩けなかった住民は{keys(x['dual'])}。元の本人へドラッグ指示が届かなかった住民は{keys(x['physicalNoIssue'])}。")
    lines+=['','正しく届いた各指示を実際の一歩と照合するため、再試行中も維持される指示番号を使った。操作後の選択は各操作の1.8秒観測終了時点の値。本人以外に届いた操作は相手の受信件数に含めた。','']
    for arm,x in summary.items():
        lines.append(f"- {arm.upper()}の本人への道譲り提案は{x['dragYieldOffers']}指示。期限内に本人の一歩が続いたのは{x['dragYieldSucceeded']}指示（{pct(x['dragYieldSucceeded'],x['dragYieldOffers'])}）。ヘルパーへ割り当てた移動は{x['dragYieldHelpers']}件、順次2体の提案は{x['dragSequentialOffers']}指示。")
    lines+=['','ドラッグまでの時間差で生じた病気・空腹・通知は実際の仕様として残した。開始時点で病気だった試行は機能上の入力停止として別に記録した。該当する個体は次のとおり。','']
    for arm,x in summary.items():
        gs=x['dragStartGateCounts'];gates='、'.join(f'{k} {v}件' for k,v in gs.items()) or '観測なし'
        lines.append(f"- {arm.upper()}で病気中に開始した操作は{len(x['dragStartIllnessKeys'])}件（{keys(x['dragStartIllnessKeys'])}）。開始時の状態は{gates}。病気を確認しなかった{x['totals']['withoutIllnessAtStart']}回のうち、元の本人への指示発行は{x['totals']['issuedWithoutIllnessAtStart']}回、本人の実歩行は{x['totals']['startedWithoutIllnessAtStart']}回。")
    lines+=['','この28操作の到着数には正規の停止や重なった画像での選択漏れが含まれる。経路性能の版間比較には、同一開始ポーズの固定試験と全地域の入力表も併記した。']
    lines+=['','### 自律・ドラッグともに動けなかった個体別の状況','','自律欄は長時間再生中の全要求。接触相手は自律の失敗時にすでに重なっていた住民の上位2体。ドラッグ欄は、本人に届いた今回の要求が最初に不成立となった時点の、すべての開始接触相手と、本来の指先目的地の地形・身体表示を示す。「局所候補」は5分終了時点で調べた144本のうち、地形、表示、個別枠と他者接触の基準を同時に満たす直線の本数。操作までの間にも周囲は動きうる。','',
        '| 版 | 住民 | 自律の成立 / 不成立 | 自律失敗時の開始接触回数・主な相手 | ドラッグ失敗直前の開始接触 | 指先の歩行地形 / 身体表示 | 局所候補数 |','|---|---|---:|---|---|---|---:|']
    for row in output:
        if not row['dual_failure']:continue
        ids=keys(top(json.loads(row['origin_overlap_peer_ids']))[:2]); peers=keys(json.loads(row['own_drag_first_refusal_start_contacts']))
        show=lambda v:'成立' if v is True else '不成立' if v is False else '記録なし'
        lines.append(f"| {row['arm'].upper()} | {row['key']} | {row['ambient_plans']} / {row['ambient_plan_failures']} | {row['initial_overlap_failures']}・{ids} | {peers} | {show(row['own_drag_first_refusal_goal_terrain'])} / {show(row['own_drag_first_refusal_goal_ink'])} | {row['aged_locally_safe_rays']} |")
    lines+=['','## 待機と中断','',
      '診断は、本人の休息・見回し・観察・座るといった状態のモデル秒数、同時に歩く人数の上限、候補の有無、期限付きの再探索を別々に記録する。会話や下段通知、睡眠、病気、孵化、選択画面、グループや住民の反応など、実際にホームの停止条件を満たす状態は、ブラウザーの経過秒に重複を許して記録する。重なりがあるため理由別の秒数は合算できない。','']
    for arm,x in summary.items():
        reasons='、'.join(f'{k} {v:.1f}秒' for k,v in sorted(x['gateReasons'].items())) or '観測なし'
        lines.append(f"- {arm.upper()}のホーム停止は合計{x['pausedSeconds']:.1f}秒。{reasons}。")
    if (study/'v7-unattended-illness.json.gz').exists():
        h=read(study/'v7-unattended-illness.json.gz');last=h['lastObservation'];ill=h['all']['illness'];
        lines+=['',f"V7の先行する無操作再生では、移動モデル{h['native']:.1f}秒の時点で病気となり、直近の状態検査で病気{ill:.1f}実秒を確認した。ゲームは表示中・再生中で、薬ボタンが実際に表示されていた。最後の観測（{last['wall']:.1f}実秒）までに{last['moved']}体が移動し、要求は{last['goals']}回。その後、28体という観測条件が崩れたため、同一初期配置で再生し直した。初回の病気による停止を住民の行き詰まり件数に含めていない。[先行再生の病気の記録](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v7-unattended-illness.json.gz)"]
    for arm,x in summary.items():
        if x['careInterventions']:
            for i in x['careInterventions']:
                r=i['firstSampleWithProgress'];gate=i['illnessGateEndedAtWall'];end=f'病気の停止条件は{gate:.1f}実秒で解除された。' if gate is not None else 'この介入直後の停止条件解除は確認できなかった。';movement=f"次に時計が進んだ計測は{r['wall']:.1f}実秒（移動モデル{r['modelSeconds']:.1f}秒）。" if r else ''
                lines.append(f"- {arm.upper()}の再生中、病気を{i['observedForSeconds']:.1f}実秒観測した後、開始から{i['wall']:.1f}実秒（移動モデル{i['modelSeconds']:.1f}秒）で、画面の「くすり」を通常のタッチで1回押した。{end}{movement}")
    lines+=['','## 足元と周囲の住民','',
      '各個体のCSVには、最近接の住民ID、足間の距離、実際の接触楕円に対する距離比、重なる相手のID、手前の線分を遮る住民、実際の一歩の拒否に関わった相手を分けて掲載した。距離比が1未満なら重なっている。指示先への直線を遮っただけでは、迂回路も不可能とは判断していない。正常な待機時間、現在の活動、失敗した実要求の有無を併せて読める。','',
      '同一のネイティブ地形・表示判定に、計測した初期および5分後の足位置を入力し、36方向×3・6・12・24 CSS pxの短い直線を調べた。住民ごとの歩行枠、歩行地形、身体の表示判定を順に適用し、最後に他の住民との連続接触を検査した。ほかの住民との重なりが残る場合は、その重なりを線分の最初から増やさず終点で縮める条件を課した。他の住民を除いた場合に通れる候補数、住民を入れても通れる候補数、完全に接触を抜けた候補数を個別に比較できる。有限方向に候補がないという結果から、すべての迂回が不可能とは言えない。','']
    for scope,items in [('初期',local['opening'])]+[(arm.upper()+'の終了時',local['aged'][arm]) for arm in KNOWN]:
        only=[r['key'] for r in items if r['count']['free'] and not r['count']['separated']]
        trapped=[r['key'] for r in items if not r['count']['free'] and r['count']['ink']]
        exact=[r['key'] for r in items if r['contactAndBoundsLockAllDirections']]
        lines.append(f"- {scope}は、短く進めても完全に離れた終点まで届かなかった住民が{len(only)}体。表示可能な地形上の候補が住民との接触で全数ふさがった住民は{len(trapped)}体。重なりと個別の歩行枠の初期方向条件だけで全方向が閉じた住民は{len(exact)}体。")
    lines+=['','同じ初期配置でも原因は住民ごとに異なる。たとえばヒツジは144方向・距離候補のうち130本が地形・表示を満たし、他の住民を含めると6本が通り、その6本はすべて終点にも重なりが残った。多尾のキツネは76本が地形・表示を満たしたが、重なっていたハムスター、ぷにゅ、カワウソと個別の歩行枠の条件で初動の全方向が閉じた。タヌキでは全144本が地形・表示を満たし、他の住民を入れると0本だった。ただし全角度に対する初動の閉塞証明は成立しなかった。']
    lines+=['','V7で一度も歩かなかった7体には全員、自律経路が不成立になった全回で開始時の重なりがあった。終盤に本人向けドラッグまで不成立だったタヌキとハムスターは、指先の歩行地形と身体表示はいずれも成立した。タヌキはパンダとハリネズミ、ハムスターはニワトリ・石像・多尾のキツネとの接触が残り、5分終了時点の短い候補は双方とも0本だった。ハムスターでは初動の全方向が閉じていた。', '', 'この7体のうちカワウソが短く進める終盤の方向・距離は3pxが4本、6pxが2本。石像は3pxが1本、多尾のキツネは3pxが6本、6pxが3本、12pxが2本。すべて終点に接触が残った。V7の自律退避が試す距離は8・12・18・24 CSS pxで、各自律要求の向きとその時点の全員の位置で候補が変わる。終盤に見つかった微小な一歩が各人の過去の要求時にも成立したとは確定できない。']
    md=next((v for k,v in data['v7']['sources'].items() if 'production-model' in k),'');lines+=['',f"この連続再生と直後の28操作で実際に配信されたV7モデルのSHA-256は `{md}`。その後の最終ソース変更は、短いドラッグで2体の道譲り候補を探している間に、全員の足・大きさ・ナビゲーションが同じまま同期された場合の探索保持に限られる。無操作の自律経路はこの分岐を通らない。実タッチ数はここに記載した計測時点のモデルに対応する。"]
    lines+=['','この連続観測はLinux Chromiumのモバイル入力。実機iPhone Safariのタッチ判定・見え方・フレーム間隔は未検証。フレーム時間の検査は、複数版を並行稼働させたこの観測とは別に行う。', '', '全方向が閉じる判定では、重なる各住民の楕円距離が最初から減らないという一次条件と、歩行枠の端では内側に進むという条件を照合した。方向を許す半平面の共通部分に非ゼロの方向がない場合のみ確定に数えた。相手が歩けば結果は変わる。','',
      '[個体ごとの84行CSV](evidence/forest-residents.csv) ／ [指示・回復・中断の集計](evidence/forest-summary.json) ／ [V5生ログ](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v5-forest28.json.gz) ／ [V6生ログ](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v6-forest28.json.gz) ／ [V7生ログ](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v7-forest28.json.gz) ／ [方向別の足元判定](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/locality.json.gz) ／ [観測コード](observe-forest.py) ／ [幾何の検査](locality-study.py)']
    (base/'FOREST.md').write_text('\n'.join(lines)+'\n')
    print('84 rows',[(a,len(x['neverAfterIntent']),x['totals']['physicalStarts'],len(x['dual'])) for a,x in summary.items()])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('study',type=Path);p.add_argument('geometry',type=Path);p.add_argument('--out',type=Path,default=Path(__file__).resolve().parent)
    a=p.parse_args();write(a.study,a.geometry,a.out)
