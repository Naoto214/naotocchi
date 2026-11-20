"""Join a resident's native failure episodes, actually executed steps and trusted touch commands."""
import argparse
import csv
import gzip
import json
import statistics
import hashlib
import math
from collections import Counter
from pathlib import Path

HERE=Path(__file__).resolve().parent
FOCUS={'tanuki':'タヌキ','hamster':'ハムスター','otter':'カワウソ','panda':'パンダ','sekizou':'石像','many_tail_fox':'多尾のキツネ','box':'箱'}
def read(p):return json.loads(gzip.decompress(p.read_bytes()))
def jf(o):return json.dumps(o,separators=(',',':'),ensure_ascii=False)
def ids(keys):return '、'.join(k.split(':')[-1] for k in keys) or 'なし'
def write_rows(path,rows):
    with path.open('w') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
def gate_join(d,a):
    es=d['postDragEvents']['events']
    q=next(e for e in d['drags'] if e['key']==a)
    c=next((e.get('command') for e in es if e['type']=='drag-request' and e['key']==a and a in q.get('issuedKeys',[])
            and q.get('at',1e12)-1e-6<=e['clock']<=q.get('until',0)+1e-6),None)
    def seen(t):return bool(c is not None and any(e['key']==a and e['type']==t and e.get('source')=='drag' and e.get('command')==c for e in es))
    refusal=next((e for e in es if e['key']==a and e['type']=='plan-failed' and e.get('source')=='drag' and c is not None and q['at']-1e-6<=e['clock']<=q['until']+1e-6),{})
    return {'touch_at':round(q['at'],3) if 'at' in q else '', 'touch_trusted':int({n[0] for n in q.get('events',[]) if n[1] and n[2]=='touch'}>={'pointerdown','pointerup'}),
        'skip_reason':q.get('skipped',''),'touch_hard_gate':jf(q.get('gateBefore',[])), 'touch_selected':q.get('selected'), 'touch_issued_to':jf(q.get('issuedKeys',[])),
        'own_command':c,'own_first_step':int(seen('first-step')),'own_arrival':int(seen('arrival')),'own_first_refusal':jf(refusal) if refusal else ''}
def elapsed_events(d,cutoff=None):
    end=d['baseline']['modelSeconds'] if cutoff is None else cutoff
    return [e for e in d['events']['events'] if e['clock']<=end+1e-8]

def at_model_time(d,cutoff):
    assert d['baseline']['modelSeconds']>=cutoff-1e-8
    open_failures=set()
    starters=set()
    count=Counter()
    for e in elapsed_events(d,cutoff):
        kind=e['type'];key=e['key']
        if e.get('source')=='ambient':
            count[kind]+=1
            if kind=='plan-failed' and key not in open_failures:
                open_failures.add(key);count['episodes']+=1
            if kind=='first-step':starters.add(key)
        if kind=='recovery' and e['source']=='ambient':
            open_failures.discard(key)
            if e['via']=='ambient':count['closed']+=1
    return dict(walkers=len(starters),actual_starts=count['first-step'],arrivals=count['arrival'],
        planned=count['planned'],failed=count['plan-failed'],episodes=count['episodes'],recovered=count['closed'],open_end=len(open_failures))

def summarize(d,label):
    out=[];base=d['baseline'];post={q['key']:q for q in d['postDrag']['residents']};bs=base['residents']
    assert (len(bs)==28 and d['wallSeconds']>=300 and base['modelSeconds']>=300 and len(d['drags'])==28 and d['postDrag']['eventsRetained']<6000 and not d['errors'])
    if 'trajectory' in d:assert all(len(s['actors'])==28 and s['visible'] for s in d['trajectory'])
    for a in bs:
        k=a['key'];touch=gate_join(d,k)
        row={'arm':label,'key':k,'active_model_s':round(a['activeSeconds'],3),'requests':a['ambientRequests'],'planned':a['ambientPlans'],'failed':a['ambientFailures'],'actual_starts':a['ambientStarts'],'arrivals':a['ambientArrivals'],'escape_starts':a['escapeStarts'],'max_stationary_s':round(a['stationaryMax'],3),'last_move_ago_s':round(a['lastMovedAgo'],3),'distance_model_px':round(a['actualDistance'],3),
         'failure_episodes':a['failureEpisodes'],'ambient_recovery':sum(e['type']=='recovery' and e['key']==k and e['source']=='ambient' and e['via']=='ambient' for e in elapsed_events(d)),
         'recovered_any':a['recoveredEpisodes'],'open_failed_intent':jf(a['openFailure']),'start_overlap_failures':a['failuresAtOriginOverlap'],
         'failed_nonwalk_goal':a['failuresOffTerrain'],'failed_outside_bounds':a['failuresOutsideBounds'],'failed_ink':a['failuresAtOcclusion'],
         'start_peers':jf(a['startContactPeers']),'end_xy':jf([a['x'],a['y']]),'end_contacts':jf([x['key'] for x in a['overlaps']]),
         'helper_steps_before_touch':a['yieldPhysicalStarts'],'helper_arrivals_before_touch':a['yieldArrivals'],
         'own_requests_help_before_touch':a['yieldOffers'],'own_requests_help_after_touch':(post[k]['yieldOffers']-a['yieldOffers'] if k in post else len({e['command'] for e in d['postDragEvents']['events'] if e['key']==k and e['type']=='yield-offer'})),'normal_states_s':jf({s:round(t,2) for s,t in a['stateSeconds'].items()}),
         **touch,'dual':int(a['ambientFailures']>0 and a['ambientStarts']==0 and touch['own_command'] is not None and not touch['own_first_step'])}
        out.append(row)
    return out
def condition_rows(geometry):
    out=[]
    for scene,records in geometry['records'].items():
        for row in records:
            g=row['geometry'];rays=g['free'];counts=g['counts'];out.append({'arm':scene,'phase':row['phase'],'key':g['key'],'clock':round(row.get('clock',0),3),'request_index':row.get('index',''),'request_source':row.get('source',''),'retry':row.get('retry',''),'xy':jf(g['from']),'start_contacts':jf(g['initialContacts']),'margin_css':jf({k:round(n,2) for k,n in g['edgeCss'].items()}),'all_direction_lock':int(g['allDirectionLock']),
                'in_bounds':counts['inBounds'],'ground_ok':counts['ground'],'opaque_ok':counts['ink'],'safe_rays':sum(map(len,rays.values())),'safe_distances_and_headings':jf(rays),'towards':g['towards'],'goal_ground':g['goalGround'],'goal_visible':g['goalVisible'],'helper_geometry':jf(g['helperWitness']), 'helper_currently_eligible':jf(g['eligibleWitness']) if row['phase']=='request' else 'not captured'})
    return out
def wait_intervals(records,scale):
    rows=[]
    for arm,d in records.items():
        by_key={}
        for index,event in enumerate(d['decisions'][:d['baselineDecisions']]):
            if event['clock']>d['baseline']['modelSeconds'] or event['source']!='ambient' or event['key'].split(':')[-1] not in FOCUS:
                continue
            actor=next(p for p in event['peers'] if p[0]==event['key'])
            nearby={p[0]:p for p in event['peers'] if p[0]!=actor[0] and abs(p[1]-actor[1])<(actor[3]+p[3])*.7+12+24/scale['x']
                    and abs(p[2]-actor[2])<(actor[4]+p[4])*.6+12+24/scale['y']}
            prior=by_key.get(event['key'])
            if prior and not prior[0]['accepted']:
                old,feet,idx=prior
                changed=feet.keys()!=nearby.keys() or any(math.hypot((p[1]-feet[k][1])*scale['x'],(p[2]-feet[k][2])*scale['y'])>=3 for k,p in nearby.items())
                same_goal=math.hypot((event['goal'][0]-old['goal'][0])*scale['x'],(event['goal'][1]-old['goal'][1])*scale['y'])<.01
                rows.append(dict(arm=arm,key=event['key'],previous_index=idx,index=index,previous_time=round(old['clock'],3),next_time=round(event['clock'],3),
                    wait_s=round(event['clock']-old['clock'],3),same_target=int(same_goal),nearby_feet_changed=int(changed),
                    requested_early=int(event.get('early',False)),next_plan=int(event['accepted'])))
            by_key[event['key']]=(event,nearby,index)
    return rows

def links(names):
    prefix='https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v8/forest/'
    return ' · '.join('['+n+']('+prefix+n+')' for n in names)
def produce(args):
    records={k:read(args.raw/(k+'-forest28.json.gz')) for k in ('v6','v7','v8')}
    archived=read(args.archived);geo={}
    for p in (args.raw/'authoritative-geometry.json.gz',args.raw/'request-geometry.json.gz'):
        d=read(p);geo.update(d['records'])
        for key,digest in d['sourceInputs'].items():
            fname=args.archived if key.startswith('forest-') else args.raw/(key.split('-')[-1]+'-forest28.json.gz')
            assert hashlib.sha256(fname.read_bytes()).hexdigest()==digest,('geometry was computed for a different play session',key)
    assert len({d['openingSHA256'] for d in [archived,*records.values()]})==1
    g_rows=condition_rows({'records':geo})
    eps=HERE/'evidence';eps.mkdir(exist_ok=True)
    # The long private evidence includes all directions and all peer poses for every request.
    write_rows(eps/'forest-contact-endpoints.csv',[r for r in g_rows if r['phase']!='request'])
    residents=summarize(archived,'archived-v7')+[r for arm,d in records.items() for r in summarize(d,arm)]
    write_rows(eps/'forest-residents.csv',residents)
    lines=['# 森の28体と、前回一歩も歩けなかった7体','',
      '390×792 CSS px・DPR 2、秋・晴れ・昼、サイズB。各版で28体の初期足座標・寸法・原画IDの照合値は `'+archived['openingSHA256']+'`。ゲーム進行と住民モデルにはそれぞれ同じ乱数種214を与えた。表示を維持し、ブラウザーの時計で連続再生した。時刻・乱数消費は実際のフレーム間隔や選んだ経路で分岐する。後段に個別操作を含めた観測は各版1回。古いV7の7体とは別に今回の未歩行者を集計した。','',
         '|版|実時間 / モデル秒|自律要求 / 成立 / 一歩 / 到着|歩いた住民|実失敗区間の本人自律復帰|最後の一歩から60秒以上|本人宛てドラッグ / 一歩 / 到着|両方失敗|','|---|---:|---:|---:|---:|---:|---:|---:|']
    all_d={'archived-v7':archived,**records};summary={}
    for k,d in all_d.items():
        q=[r for r in residents if r['arm']==k];tot=lambda name:sum(r[name] for r in q)
        no=[r['key'] for r in q if r['requests']>0 and not r['actual_starts']];dual=[r['key'] for r in q if r['dual']]
        s={'never_after_request':no,'no_request':[r['key'] for r in q if not r['requests']],'dual':dual,'trusted':tot('touch_trusted'),'gate_at_drag':dict(Counter(t for row in d['drags'] for t in row.get('gateBefore',[]))),
           'blocked_model_s':d['baseline']['blockedModelSeconds'],'gate_reasons_s':d['baseline']['gateReasons'],'care':d['interventions'],'post_roster':len(d['postDrag']['residents']),'skipped':[q['key'] for q in d['drags'] if q.get('skipped')],'activity':{t:round(sum(a['stateSeconds'].get(t,0) for a in d['baseline']['residents']),3) for t in ('sit','rest','together','approach','look','observe')},'issued':sum(r['own_command'] is not None for r in q),'selection_match':sum(r['touch_selected']==r['key'] for r in q)}
        summary[k]=s
        eff=f"{tot('ambient_recovery')}/{tot('failure_episodes')} ({100*tot('ambient_recovery')/tot('failure_episodes'):.1f}%)"
        lines.append(f"|{k}|{d['wallSeconds']:.1f} / {d['baseline']['modelSeconds']:.1f}|{tot('requests')} / {tot('planned')} / {tot('actual_starts')} / {tot('arrivals')}|{sum(x['actual_starts']>0 for x in q)}/28|{eff}|{sum(x['last_move_ago_s']>=60 for x in q)}|{s['issued']} / {tot('own_first_step')} / {tot('own_arrival')}|{len(dual)}|")
    lines+=['','連続失敗区間は本人の最初の不成立から、その後に実際の一歩が出るまで。観測終了時も未復帰の区間を分母に含めた。道譲りで協力者だけが歩いた場合、本人の自律復帰には含めていない。連続再生後は28体を順に対象とし、画面で原画を確認できる場合に実タッチを送った。重なりで別居住者へ届いた指示、病気等の受付停止、幾何的な両方失敗は区別した。','']
    lines += ['', '## 前回の回復率と、今回の道譲り', '',
      '前回のV6とV7は実経路の不成立から始まった区間がそれぞれ48件。終了までに歩いた区間は26→24、未復帰は22→24で、うち60秒以上未復帰は両版19件だった。復帰した区間の所要時間中央値は59.8→57.0秒。終了時未復帰区間に含まれた失敗要求は282→262件だった。比較時刻・周囲の住民の進路が異なるため、この2区間の差を単一の経路処理に帰することはできない。', '',
      '|版|自律の道譲り・1体 / 2体の提案|実行段階|協力者の実歩行開始 / 到着|本人に12秒以内の自律歩行が続いた提案|復帰時間の中央値|', '|---|---:|---:|---:|---:|---:|']
    helper_rows=[]
    for arm,d in all_d.items():
        native=d['baseline']['residents'];es=elapsed_events(d)
        offers=[e for e in es if e['type']=='ambient-yield-offer'];leaders=[e for e in offers if e['stage']==1]
        # A subsequent step is observable; no command ID exists for autonomous offers.
        for e in offers:
            end=min(d['baseline']['modelSeconds'],e['clock']+12)
            peer_reached=next((x['clock'] for x in es if x['key']==e['peer'] and x['type']=='arrival' and x.get('source')=='yield' and e['clock']<=x['clock']<=end),None)
            walked=next((x['clock'] for x in es if x['key']==e['key'] and x['type']=='first-step' and x.get('source')=='ambient' and e['clock']<=x['clock']<=end),None)
            helper_rows.append(dict(arm=arm,offered_model_s=round(e['clock'],3),owner=e['key'],helper=e['peer'],stage=e['stage'],stages=e['stages'],helper_arrival_model_s=round(peer_reached,3) if peer_reached is not None else '',owner_next_ambient_step_model_s=round(walked,3) if walked is not None else ''))
        after=sum(any(x['key']==e['key'] and x['type']=='first-step' and x.get('source')=='ambient' and e['clock']<=x['clock']<=e['clock']+12 for x in es) for e in leaders)
        dt=[e['end']-e['start'] for e in es if e['type']=='recovery' and e['via']=='ambient' and e['source']=='ambient']
        times=f'{statistics.median(dt):.1f}秒' if dt else '該当なし'
        lines.append(f"|{arm}|{sum(e['stages']==1 for e in leaders)} / {sum(e['stages']==2 for e in leaders)}|{len(offers)}|{sum(a['yieldPhysicalStarts'] for a in native)} / {sum(a['yieldArrivals'] for a in native)}|{after}/{len(leaders)}|{times}|")
    final=records['v8'];aux=[e for e in final['decisions'][:final['baselineDecisions']] if e['clock']<=final['baseline']['modelSeconds']]
    early=[n for n in aux if n.get('early')];cooperative=[n for n in aux if n.get('assisted')]
    def completed_native(rows):
        clocks=elapsed_events(final)
        def done(n,typ):
            i=next((j for j,v in enumerate(clocks) if v['type']=='planned' and v['key']==n['key'] and v.get('source')=='ambient' and abs(v['clock']-n['clock'])<0.00001),None)
            if i is None:return False
            for v in clocks[i+1:]:
                if v['key']!=n['key']:continue
                if v['type'] in ('planned','plan-failed'):break
                if v['type']==typ and v.get('source')=='ambient':return True
            return False
        return sum(n['accepted'] and done(n,'first-step') for n in rows),sum(n['accepted'] and done(n,'arrival') for n in rows)
    if any('early' in n for n in aux):
        ew,ea=completed_native(early);cw,ca=completed_native(cooperative)
        lines+=['',f"V8で周辺変化を受け、次の通常判断より前に失敗要求を再評価したのは{len(early)}件。経路成立{sum(n['accepted'] for n in early)}件、本人の実際の一歩{ew}件、到着{ea}件。協力者の到着後に制御層が本人へ明示的に発行した自律要求は{len(cooperative)}件、実歩行{cw}件、到着{ca}件。いずれも元の行動と足座標を継続し、移動開始や到着したという実イベントと照合した。"]
    if helper_rows:write_rows(eps/'forest-executed-help.csv',helper_rows)
    lines+=['', '実行段階は制御層が実際に協力者へ発注した時点。経路を考えただけの件数は含めていない。時間内の本人歩行はログの個体・時刻で照合した。自律の道譲りにはドラッグ指示番号がないため、偶然同じ時刻帯に起きた通常歩行との因果は確定できない。']

    if helper_rows:lines+=['','[協力者と本人の動作を時刻で照合](evidence/forest-executed-help.csv)']
    repeat=[];same_window={'旧V6':read(args.archived.with_name('v6-forest28.json.gz')),'旧V7':archived}
    for arm in ('v6','v7'):
        first=read(args.raw/(arm+'-autonomy-only.json.gz'));same_window[arm+' 初回']=first;bs=first['baseline'];a=bs['residents']
        assert first['openingSHA256']==archived['openingSHA256'] and bs['modelSeconds']>=305
        repeat.append(f"{arm} {sum(q['ambientStarts']>0 for q in a)}/28（実時間{first['wallSeconds']:.1f}秒、モデル{bs['modelSeconds']:.1f}秒）")
    lines+=['','同一の初期座標・乱数で行った別の連続再生は '+'、'.join(repeat)+'。この2本は5分後の薬ボタンへのタッチ完了応答が時間切れになり、その後の全員操作を記録し終えずに終了した。自律歩行のみの再観測として保全し、上表の実入力は同条件の再試行で記録した。', '', links(['v6-autonomy-only.json.gz','v7-autonomy-only.json.gz']),'']
    same_window.update({arm+' 全員操作あり':d for arm,d in records.items()})
    lines+=['','## 自律移動を全試行とも300.000モデル秒で打ち切った比較','',
      '|試行|自律歩行した住民 / 28|経路成立 / 拒否|本人の一歩 / 到着|失敗から本人自律で復帰 / 実失敗区間|未復帰|',
      '|---|---:|---:|---:|---:|---:|']
    cuts=[]
    for label,rec in same_window.items():
        q=at_model_time(rec,300);whole=at_model_time(rec,rec['baseline']['modelSeconds'])
        assert whole['episodes']==sum(v['failureEpisodes'] for v in rec['baseline']['residents']),(label,whole)
        cuts.append(dict(run=label,actual_utc=rec['startedUTC'],cutoff_model_s=300,opening_sha256=rec['openingSHA256'],**q))
        lines.append(f"|{label}|{q['walkers']}|{q['planned']} / {q['failed']}|{q['actual_starts']} / {q['arrivals']}|{q['recovered']} / {q['episodes']} ({100*q['recovered']/q['episodes']:.1f}%)|{q['open_end']}|")
    write_rows(eps/'forest-300-model-seconds.csv',cuts)
    lines+=['','すべての試行で `event.clock <= 300` の経路結果・本人の実歩行を再集計した。初回の不成立で失敗区間を開き、本人の一歩による復帰イベントで閉じた。打ち切り時点の未解決分も分母に含めた。後段の実タッチは含まれない。[同一300秒・試行開始日時・初期姿勢の照合値](evidence/forest-300-model-seconds.csv)','']
    for k,s in summary.items():
        lines.append('- '+k+' の要求後未歩行は '+ids(s['never_after_request'])+'。本人宛てドラッグでも実歩行できなかったのは '+ids(s['dual'])+'。')
    lines+=['','## 旧V7の7体を個体別に復元','',
      '旧版の連続再生ログから同一の初期姿勢と306秒後の全28体姿勢を復元した。方位は画面右が0°、下が90°。7.5°刻み、3・4・5・6・8・12・18・24 CSS pxの各直線を足領域・地形・遮蔽・他27体との連続接触で検査した。距離はCSS px、足座標はモデル座標。足場・体格・深度ごとの境界を維持した。表の境界距離は住民の足を配置できる矩形までの距離。地形と前景遮蔽は全直線で別に検査した。','',
      '|住民|初期足 (x, y) · 接触ID|V7 自律要求 / 一歩|終了時の境界までの最短距離|終了時に安全な移動の一例|終了時に本人が動ける条件|V7の本人宛てドラッグ|今回 V6 / V7 / V8 自律の一歩|','|---|---|---:|---:|---|---|---|---:|']
    archived_name=next(k for k in geo if k.startswith('forest-'))
    old={(r['geometry']['key'],r['phase']):r['geometry'] for r in geo[archived_name]}
    for id,ja in FOCUS.items():
        key='companion:'+id
        r=next(r for r in residents if r['arm']=='archived-v7' and r['key']==key)
        op=old[key,'opening'];end=old[key,'endpoint'];x,y=op['from'];m=min(end['edgeCss'].values())
        safe=end['free'];direct='、'.join(f'{k}px ({h[0]}°)' for k,h in safe.items()) if safe else '計384本中0'
        w=end['helperWitness'];cw=[s['who'] for s in (w or [])[:-1]]
        if safe:condition='周辺との距離を保ち '+('短く退避' if max(map(int,safe))<8 else '表示した方向へ退避')
        elif w:condition='順に '+ids(cw)+' が退避'
        elif end['allDirectionLock']:condition='接触と足領域の制約で初動全方向が閉じる。周囲の位置変化が必要'
        else:condition='今回探索した直線・2体以下の解放経路0。周辺の位置変化時に再評価'
        dr='本人受理、一歩あり' if r['own_first_step'] else ('本人受理、拒否' if r['own_command'] is not None else '本人未受理（'+r['touch_hard_gate']+'）')
        scoped=[next(x for x in residents if x['arm']==a and x['key']==key) for a in records]
        lines.append(f"|{ja}|({x:.1f}, {y:.1f}) · {ids([p[0] for p in op['initialContacts']])}|{r['requests']} / {r['actual_starts']}|{m:.1f}px|{direct}|{condition}|{dr}|{' / '.join(str(n['actual_starts']) for n in scoped)}|")
    lines+=['','|住民|旧V7の拒否要求（起点が接触中 / 目標が地形外 / 目標が足の範囲外）|終了時の地形通過本数 / 全384方向距離|終了時に単独で線分を塞いだ住民（本数順）|', '|---|---:|---:|---|']
    for id,ja in FOCUS.items():
        key='companion:'+id
        a=next(r for r in archived['baseline']['residents'] if r['key']==key);e=old[key,'endpoint']
        blockers=sorted(e['singleBlockers'].items(),key=lambda p:-p[1])
        bl='、'.join(f"{k.split(':')[-1]} ({v})" for k,v in blockers) or 'なし'
        lines.append(f"|{ja}|{a['failuresAtOriginOverlap']} / {a['failuresOffTerrain']} / {a['failuresOutsideBounds']}|{e['counts']['ground']} / 384|{bl}|")
    lines += ['', '目標そのものが地形外でも既存の経路補正で到達できる場合がある。上記の目標条件は同時に起こり得るので合算していない。']

    lines+=['','|旧V7の7体|V8実要求 / 拒否 / 歩行開始 / 到着|本人の総自律歩行距離（モデルpx）|本人に発注された協力段階|本人が他者のため実際に歩いた / 到着|再生後の本人への指示 / 実歩行 / 到着|','|---|---:|---:|---|---:|---:|']
    active=records['v8'];actual=elapsed_events(active)
    for id,ja in FOCUS.items():
        key='companion:'+id;a=next(q for q in active['baseline']['residents'] if q['key']==key)
        row=next(q for q in residents if q['arm']=='v8' and q['key']==key)
        offered=[e for e in actual if e['type']=='ambient-yield-offer' and e['key']==key]
        witness='、'.join(f"{e['peer'].split(':')[-1]} ({e['stage']}/{e['stages']}・{e['clock']:.1f}秒)" for e in offered) or 'なし'
        lines.append(f"|{ja}|{a['ambientRequests']} / {a['ambientFailures']} / {a['ambientStarts']} / {a['ambientArrivals']}|{a['ambientDistance']:.1f}|{witness}|{a['yieldPhysicalStarts']} / {a['yieldArrivals']}|{int(row['own_command'] is not None)} / {row['own_first_step']} / {row['own_arrival']}|")

    brief=[a for a in active['baseline']['residents'] if a['id'] in FOCUS and a['ambientStarts']==1 and a['ambientDistance']*max(old['companion:tanuki','opening']['scale'].values())<=6.01]
    if brief:lines+=['','短い退避一回で計数上は歩行済みになった住民は '+ids([a['key'] for a in brief])+'。その後も自力で自由に通行できたことは、この一歩からは判断できない。']

    retreat=[]
    scale=old['companion:tanuki','opening']['scale']
    for arm,d in records.items():
        native_events=elapsed_events(d)
        for a in d['decisions'][:d['baselineDecisions']]:
            if a['source']!='ambient' or a['key'].split(':')[-1] not in FOCUS or not a['accepted']:continue
            foot=next(p for p in a['peers'] if p[0]==a['key'])
            if not foot[5]:continue
            ddx=(foot[5][0]-foot[1])*scale['x'];ddy=(foot[5][1]-foot[2])*scale['y']
            index=next((i for i,ev in enumerate(native_events) if ev['type']=='planned' and ev['key']==a['key'] and ev['source']=='ambient' and abs(ev['clock']-a['clock'])<1e-6),None)
            if index is None:continue
            moved=arrived=False
            for ev in native_events[index+1:]:
                if ev['key']!=a['key']:continue
                if ev['type'] in ('planned','plan-failed'):break
                if ev.get('source')=='ambient':
                    moved |= ev['type']=='first-step'
                    arrived |= ev['type']=='arrival'
            retreat.append(dict(arm=arm,key=a['key'],time=round(a['clock'],3),escape=int(a['escape']),assisted=int(a.get('assisted',False)),first_target_css=round(math.hypot(ddx,ddy),3),heading_deg=round(math.degrees(math.atan2(ddy,ddx))%360,1),actual_step=int(moved),arrival=int(arrived)))
    if retreat:
        write_rows(eps/'forest-focal-actual-plans.csv',retreat)
        moves=[n for n in retreat if n['arm']=='v8' and n['escape'] and n['first_target_css']<=6.001 and n['actual_step']]
        lines+=['', '旧V7の7体のうち、V8で6px以下を最初の目標にした退避を実際に開始した住民は '+ids(sorted({n['key'] for n in moves}))+'（'+str(len(moves))+'歩行、経路到着'+str(sum(n['arrival'] for n in moves))+'件）。[本人の指示時刻・最初の目標距離・方位・実動作](evidence/forest-focal-actual-plans.csv)']

    lines+=['','方向探索では初期の重なりを増やす経路と、新たな接触を生む経路を全長で棄却した。境界法線と各接触楕円の離隔法線が全方向を閉じると判定できたケース以外は、有限候補内の結果。旧ログには要求時の周囲全員の手動制御・クールダウン状態が残っていないため、旧姿勢の道譲り成立は幾何条件として示した。','', '## 実際の拒否時点で再計算した安全余地','',
      '|版|7体の自律失敗要求|3〜6pxのみ直接可能|8px以上可能|直接不可・1 / 2体で可能|うち当時の制御条件で実行候補が残る|起点・境界で方向閉塞|','|---|---:|---:|---:|---:|---:|---:|']
    opportunity=[]
    for k,d in records.items():
        tag=next(t for t in geo if t.endswith('-'+k) and t!=archived_name)
        g=geo[tag];groups=Counter()
        for row in g:
            if row['phase']!='request' or row['source']!='ambient':continue
            a=row['geometry'];dist=list(map(int,a['free']));w=a['helperWitness'];h=len(w)-1 if w else 0
            groups['rejected']+=1;groups['micro']+=bool(dist and max(dist)<8);groups['large']+=bool(dist and max(dist)>=8);groups['h'+str(h)]+=1;groups['eligible']+=bool(a['eligibleWitness']);groups['lock']+=a['allDirectionLock']
            eligible=a['eligibleWitness'];intent_gain=None
            if eligible:
                witness=eligible[-1];goal=row['goal'];sc=a['scale']
                def miss(pt):return math.hypot((pt[0]-goal[0])*sc['x'],(pt[1]-goal[1])*sc['y'])
                intent_gain=miss(witness['from'])-miss(witness['to'])
            opportunity.append(dict(arm=k,clock=round(row['clock'],3),key=a['key'],safe_rays=sum(map(len,a['free'].values())),
                helper_intent_gain_css=round(intent_gain,3) if intent_gain is not None else '',
                helper_sequence=ids([leg['who'] for leg in eligible[:-1]]) if eligible else '',
                greatest_css_px=max(dist,default=0),contacts=ids([s[0] for s in a['initialContacts']]),geometry_helpers=h,eligible_helpers=len(a['eligibleWitness'])-1 if a['eligibleWitness'] else 0,lock=int(a['allDirectionLock'])))
        lines.append(f"|{k}|{groups['rejected']}|{groups['micro']}|{groups['large']}|{groups['h1']} / {groups['h2']}|{groups['eligible']}|{groups['lock']}|")
    write_rows(eps/'forest-request-opportunities.csv',opportunity)
    lines+=['','|V8の旧7体|拒否時の単独退避候補あり / 拒否要求|単独不可・1体 / 2体の制御条件つき証人|その証人が元の要求へ0.75px超近づいた件数|','|---|---:|---:|---:|']
    for id,ja in FOCUS.items():
        q=[r for r in opportunity if r['arm']=='v8' and r['key']=='companion:'+id]
        ones=sum(r['eligible_helpers']==1 for r in q);pairs=sum(r['eligible_helpers']==2 for r in q)
        forward=sum(r['helper_intent_gain_css']!='' and r['helper_intent_gain_css']>.75 for r in q)
        lines.append(f"|{ja}|{sum(r['safe_rays']>0 for r in q)} / {len(q)}|{ones} / {pairs}|{forward} / {ones+pairs}|")
    lines+=['','任意方向へ安全に退ける場合と、元の本人の目標に実際に近づく場合を区別した。協力者の歩行に続く本人の軌跡で、目標までの距離の減少をCSS pxに換算した。各要求で最初に見つけた制御条件つき証人に対する評価。違う協力経路の全方向で前進不能だと証明するものではない。']

    retries=wait_intervals(records,old['companion:tanuki','opening']['scale'])
    write_rows(eps/'forest-retry-intervals.csv',retries)
    lines+=['','## 失敗後、次に本人の自律要求を実行した時点','',
        '|版|7体で次の要求を観測した区間|近隣の足が3px以上動いた / 変化なし|同じ目標を再評価|次の要求までの中央値 / 最長|','|---|---:|---:|---:|---:|']
    for arm in records:
        intervals=[r for r in retries if r['arm']==arm];times=[r['wait_s'] for r in intervals]
        changes=sum(r['nearby_feet_changed'] for r in intervals)
        lines.append(f"|{arm}|{len(times)}|{changes} / {len(times)-changes}|{sum(r['same_target'] for r in intervals)}|{statistics.median(times):.1f} / {max(times):.1f}秒|")
    lines+=['','両端で近隣の顔ぶれが変わるか、同じ近隣住民の足が3 CSS px以上動いた場合を「変化あり」と数えた。両端の間で一度動いて元へ戻った場合や、気分・手動制御期限だけの変化はこの列に含まれない。通常の自律判断の新しい目標と、同じ失敗目標への再評価を分けた。']

    lines+=['','上表は同一状態を繰り返し観測した場合も要求単位で集計した。直接退避と、本人＋最大2体が安全な直線を順に完了する幾何学的可能性を分けた。制御条件の列は協力者の手動指示・選択・歩行中・クールダウン等を除外した。社会行動の詳しい状態を記録した試行に限り、接近・会話中も除外した。実プローブは任意の安全な方向を調べるため、指示方向・退避を選ぶ時期・候補数の異なる製品モデルが必ず採用する経路とは限らない。実際の割当・完歩はイベントで確認できたものに限る。足場候補は有限であり、3体以上の強制的な協調を必要とするという結論は出せない。','',
       '## 通常の待機と入力','']
    lines+=['|版|自律の実経路要求ゼロの住民|座る・休む（延べ人秒）|近づく・一緒に過ごす（延べ人秒）|', '|---|---:|---:|---:|']
    for arm,s in summary.items():
        t=s['activity']
        lines.append(f"|{arm}|{len(s['no_request'])}|{t['sit']+t['rest']:.1f}|{t['approach']+t['together']:.1f}|")
    lines+=['', '状態の累計は28体分。意図された静止の量も併記した。会話成立回数とは別の指標。','']
    for k,s in summary.items():
        armrows=[r for r in residents if r['arm']==k]
        eligible=[r for r in armrows if r['touch_trusted'] and 'illness' not in json.loads(r['touch_hard_gate'])]
        healthissued=sum(r['own_command'] is not None for r in eligible);healthsteps=sum(r['own_first_step'] for r in eligible)
        lines.append('- '+k+f" は28回中{s['trusted']}回でブラウザーが信頼するtouchのdown/upを記録。観測窓終了時の本人選択は{s['selection_match']}回、本人への指示発行は{s['issued']}回。開始時に病気でなかった{len(eligible)}操作のうち本人へ発行{healthissued}回、本人歩行{healthsteps}回。全体の制御理由ごとの停止秒は "+jf({reason:round(x,1) for reason,x in s['gate_reasons_s'].items()})+'。正規の薬ボタンを押した回数は '+str(sum(1 for e in s['care'] if e.get('action')=='actual medicine tap'))+'。ボタンへのタッチ完了を自動化側で確認できなかった回数は '+str(sum(1 for e in s['care'] if e.get('action') in ('medicine unavailable to touch','medicine tap acknowledgement timed out')))+'回。')
        if s['skipped']:
            lines.append('  この継続観測では最後の診断が返した描画住民は'+str(s['post_roster'])+'体。実際の指を送るための原画を取得できなかった住民は '+ids(s['skipped'])+'。本人へ届いた入力の経路失敗には数えていない。')
    lines+=['','実家屋の自然な病気・世話・表示変化と、同じ28体が画面にいる条件は区別した。次の表では旧V7で実際に300モデル秒進めた同じ全住民の足、経路、手動・会話状態、乱数を1操作ごとに復元した。通常操作可能な画面で実際のタッチを各人へ1回送った。全員の測定が終わるまで病気の時間を進める試験とは条件が異なる。','']
    cp=read(args.raw/'checkpoint-touches.json.gz')
    lines+=['|同一300秒姿勢|実タッチ|本人選択 / 指示発行|足が動いた|経路終端へ到着 / 指先4px以内|貫通・安全検査違反のステップ|','|---|---:|---:|---:|---:|---:|']
    checkpoint_rows=[]
    for arm in ('v6','v7','v8'):
        entries=cp['arms'][arm]['rows'];assert len(entries)==28 and all(e['trusted'] for e in entries)
        count=lambda key:sum(bool(e.get(key)) for e in entries)
        moved=sum(e['issued'] and e['routed'] and e['stepCount']>0 for e in entries)
        bad=sum(e['unsafeSteps']+e['sweptViolations'] for e in entries)
        lines.append(f"|{arm}|28|{count('selected')} / {count('issued')}|{moved}|{count('terminalArrived')} / {count('terminalNear4')}|{bad}|")
        for e in entries:
            checkpoint_rows.append(dict(arm=arm,key=e['key'],trusted=e['trusted'],selected=e['selected'],issued=e['issued'],initial_gate_blocked=bool(e['initialGate']['blocked'] or e['initialGate']['framework']),recipient_routed_step=bool(e['issued'] and e['routed'] and e['stepCount']),steps=e['stepCount'],routed=e['routed'],arrived=e['terminalArrived'],near4=e['terminalNear4'],blocked_class=e.get('blockedClass'),end_finger_error_css=e['endFingerErrorCss'],unsafe=e['unsafeSteps'],swept=e['sweptViolations']))
    reaction_gates={arm:{e['key'] for e in rows['rows'] if e['initialGate']['blocked'] or e['initialGate']['framework']} for arm,rows in cp['arms'].items()}
    any_gate=set.union(*reaction_gates.values())
    lines+=['','開始時に表示側の受付制限が立っていた対象は '+'、'.join(arm+' '+ids(sorted(reaction_gates[arm])) for arm in ('v6','v7','v8'))+'。同じ足とドロップ座標を復元しても、短いゲーム側リアクションの開始時刻は完全には一致しない。','',
        '|3版すべてで開始時に受付可能だった同じ住民|件数|本人選択|本人指示|終端到着|','|---|---:|---:|---:|---:|']
    for arm in ('v6','v7','v8'):
        available=[e for e in cp['arms'][arm]['rows'] if e['key'] not in any_gate]
        lines.append(f"|{arm}|{len(available)}|{sum(e['selected'] for e in available)}|{sum(e['issued'] for e in available)}|{sum(e['terminalArrived'] for e in available)}|")

    lines+=['','|旧7体の本人宛て12px指示|V6|V7|V8|','|---|---|---|---|']
    for id,ja in FOCUS.items():
        results=[]
        for arm in ('v6','v7','v8'):
            e=next(q for q in cp['arms'][arm]['rows'] if q['key']=='companion:'+id)
            if e['terminalNear4']:status='指先4px内で到着'
            elif e['terminalArrived']:status='補正終端へ到着'
            elif e['issued'] and e['routed'] and e['stepCount']:status='発行・歩行'
            elif e['issued']:status='発行・経路終端未到着'
            else:status='本人に未発行'
            results.append(status)
        lines.append('|'+ja+'|'+'|'.join(results)+'|')
    write_rows(eps/'forest-300s-trusted-drops.csv',checkpoint_rows)
    lines+=['','これは比較用の時刻送りとチェックポイント復元を使う操作評価。全行で同じ指先座標の列を再生し、指示後は既存の比較試験に合わせ、新しい自律行動の抽選を止めてドラッグ経路自身を追った。実時間のフレーム性能、300秒実家屋のその後の住民人数を示す値とは別にした。[各住民の受理・一歩・到着・指先誤差](evidence/forest-300s-trusted-drops.csv)','',links(['checkpoint-touches.json.gz','v7-300-touch-checkpoint.json.gz'])]

    lines+=['','個別の座る・休む・見る・会話等は実失敗要求が出るまで不成立に数えない。今回の再測定では自然発症から12秒以上経過し、正規の薬ボタンの表示・有効を確認した場合のみ、35秒以上の間隔でタッチした。完了応答が時間切れの場合、ゲームに届いたかは断定できない。病気の消失・継続は次の観測で確認できる。iPhone Safari実機は未検証。','',
      '[全28体の行動と本人宛て入力](evidence/forest-residents.csv) · [各版の初期・終了姿勢と安全方位](evidence/forest-contact-endpoints.csv) · [失敗要求ごとの退避・道譲り候補](evidence/forest-request-opportunities.csv) · [拒否から次の要求までの周辺変化](evidence/forest-retry-intervals.csv)','',
      '前回の復帰率・個体・時刻の原本。[旧V6・307.4モデル秒](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v6-forest28.json.gz) · [旧V7・306.8モデル秒](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/forest/v7-forest28.json.gz)','',
      links(['v6-forest28.json.gz','v7-forest28.json.gz','v8-forest28.json.gz','authoritative-geometry.json.gz','request-geometry.json.gz'])]
    lines+=['','## 再測定','',
       'PythonのPlaywright、LinuxのChromium、同じ試遊パッケージで実行する。比較用のフックは要求の識別子と実行時の足座標を読む。候補方向の探索は連続再生を終了した後、別の停止中ページで記録済み姿勢を使って実行する。連続再生のフレーム時間は性能試験には転用しない。','',
       '```sh',
       'python -B forest_observe.py --arm v6 --url "$TRIAL_ORIGIN" --out "$EVIDENCE"',
       'python -B forest_observe.py --arm v7 --url "$TRIAL_ORIGIN" --out "$EVIDENCE"',
       'python -B forest_observe.py --arm v8 --url "$TRIAL_ORIGIN" --expected-model 282ccb0c35751ae6bf89b8efc4641d674aa7be4e1f4a3ea7e6a8902b49704809 --out "$EVIDENCE"',
       'python -B forest_geometry.py --url "$TRIAL_ORIGIN" --out "$EVIDENCE/authoritative-geometry.json.gz" "$ARCHIVED_V7"',
       'python -B forest_geometry.py --url "$TRIAL_ORIGIN" --out "$EVIDENCE/request-geometry.json.gz" "$EVIDENCE/v6-forest28.json.gz" "$EVIDENCE/v7-forest28.json.gz" "$EVIDENCE/v8-forest28.json.gz"',
       'python -B forest_checkpoint.py --url "$TRIAL_ORIGIN" --snapshot "$PINNED_300_SECOND_JSON" --out "$EVIDENCE"',
       '```']
    (HERE/'FOREST.md').write_text('\n'.join(lines)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--raw',required=True,type=Path);p.add_argument('--archived',required=True,type=Path);produce(p.parse_args())
