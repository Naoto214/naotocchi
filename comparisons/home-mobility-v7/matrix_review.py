"""Reconcile numeric region artifacts, natural five-minute resident traces and frozen #575 touches."""
import argparse
from collections import Counter,defaultdict
import csv
import gzip
import json
import math
from pathlib import Path
import subprocess
import zipfile

from matrix_worker import ARMS,REGIONS,COUNTS,WIDTHS,HISTORY,canonical,digest,require,validate
from matrix_report import NAMES,outcome,projected_progress,summarize_numbers

FIELDS=('selected','issued','accepted','routed','moved','arrived','near4','terminalArrived','terminalNear4','fingerErrorCss','endFingerErrorCss','releaseJumpCss','unsafeSteps','sweptViolations','releaseMs','pointerQueueMs','releaseFrameMs','modelMoveMs','searchCount','searchMaxMs','searchTotalMs','pressToSelectionMs','selectedKey')
COUNTERS=('ambientRequests','ambientPlans','ambientFailures','ambientStarts','ambientArrivals','dragRequests','dragStarts','dragArrivals','failureEpisodes','recoveredEpisodes','recoveredSameSource','yieldOffers','yieldSuccesses','yieldsGiven','yieldPhysicalStarts','yieldArrivals','retries','waits','vetoCount')
ID=('region','count','width')
DEFICITS=(('arrival',746,870),('near4',398,513),('occupiedArrival',32,120),('tapSelected',218,218))


def write_csv(path,rows):
    keys=dict.fromkeys(k for r in rows for k in r)
    with path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(keys),lineterminator='\n');w.writeheader();w.writerows(rows)


def read_archives(root):
    cells=[];provenance={};reference=None
    with HISTORY.open() as f:
        history={(r['region'],int(r['count']),int(r['width']),r['case'],r['arm']):r for r in csv.DictReader(f)}
    for region in REGIONS:
        located=list(root.glob('**/'+region+'/region.json'))
        require(len(located)==1,region+' manifest absent or duplicated')
        mpath=located[0];m=json.loads(mpath.read_text())
        require(m['complete'] and m['region']==region,region+' regional job incomplete')
        expected={f'{region}-{n}-{w}.json' for n in COUNTS for w in WIDTHS}
        require(set(m['cells'])==expected,region+' count/width cells missing')
        stable={k:m[k] for k in ('revision','entries','historicalInputsSHA256')};require(stable['historicalInputsSHA256']==digest(HISTORY.read_bytes()),'incorrect #575 input tape')
        if reference is None:reference=stable
        require(stable==reference,'mixed region revisions/entry bytes')
        provenance[region]={**stable,'browser':m['browser'],'cellCount':len(expected)}
        for n in COUNTS:
            for w in WIDTHS:
                name=f'{region}-{n}-{w}.json';raw=(mpath.parent/name).read_bytes()
                require(digest(raw)==m['cells'][name]['sha256'],name+' incorrect digest');cell=validate(json.loads(raw),history)
                require((cell['region'],cell['count'],cell['width'])==(region,n,w),name+' mislabeled coordinates')
                for a,data in cell['arms'].items():
                    require(data['browser']==m['browser'],'browser differs within paired inputs')
                    store=provenance[region].setdefault('nativeSHA256',{}).setdefault(a,data['hashes']);require(store==data['hashes'],'source bytes changed inside region')
                cells.append(cell)
    first=provenance[REGIONS[0]]['nativeSHA256']
    require(all(k['nativeSHA256']==first for k in provenance.values()),'native script differ across regions')
    return cells,provenance


def drag_row(cell,a,case,r,phase):
    q={**{k:cell[k] for k in ID},'arm':a,'phase':phase,'case':case,'key':r['key'],'skip':r.get('skip'),'outcome':outcome(r)}
    if r.get('skip'):return q
    d=r['demandAtRelease']['clock'];first_step=r.get('nativeMotion',{}).get('firstNativeFootClock');offers=r.get('nativeMotion',{}).get('offered',[])
    event=r['arrived'];terminal=r['terminalArrived'];miss=r['endFingerErrorCss'] if terminal else r['fingerErrorCss']
    q.update({k:r.get(k) for k in FIELDS});q.update(touchX=r['start'][0],touchY=r['start'][1],goalX=r['goal'][0],goalY=r['goal'][1],
      trusted=r['trusted'],actualStep=r['stepCount']>0,arrival=bool(event or terminal),nearFinger=bool(r['near4'] or r['terminalNear4']),exact=bool((terminal or event) and miss<=.001),
      forwardCss=projected_progress(r),firstFootModelSec=None if first_step is None else round(first_step-d,6),
      firstArrivalModelSec=round(r['arrivalClock']-d,6) if event else None,yieldOffered=bool(offers),yieldStepsAfterOffer=bool(offers and r['nativeMotion']['steppedAfterOffer']),
      maxSearchMs=r['searchMaxMs'],pointerMoveSearches=sum(s['phase']=='pointermove' for s in r['searches']),
      nativeRetries=sum(bool(s['retry']) for s in r['nativePlans']),releaseQueueMs=r['pointerQueueMs'])
    return q


def metrics(drags):
    batch=[r for r in drags if not r['skip']];issued=[r for r in batch if not r['case'].startswith('tap/')];taps=[r for r in batch if r['case'].startswith('tap/')]
    return dict(drags=len(issued),selected=sum(r['selected'] for r in issued),issued=sum(r['issued'] for r in issued),
        tapSent=len(taps),tapSelected=sum(r['selected'] for r in taps),arrival=sum(r['arrival'] for r in issued),
        eventArrival=sum(r['arrived'] for r in issued),terminalArrival=sum(r['terminalArrived'] for r in issued),
        exact=sum(r['exact'] for r in issued),near4=sum(r['nearFinger'] for r in issued),eventNear4=sum(r['near4'] for r in issued),terminalNear4=sum(r['terminalNear4'] for r in issued),
        occupiedArrival=sum(r['arrival'] for r in issued if r['case'].startswith('occupied/')),occupiedSent=sum(r['case'].startswith('occupied/') for r in issued),
        graphSearchesDuringMove=sum(r['pointerMoveSearches'] for r in issued),unsafe=sum(r['unsafeSteps'] for r in issued),swept=sum(r['sweptViolations'] for r in issued),
        maxReleaseJump=max((r['releaseJumpCss'] for r in issued if r['releaseJumpCss'] is not None),default=0),
        backwardsIssued=sum(r['issued'] and (r['forwardCss'] or 0)<-.5 for r in issued),
        yieldOffers=sum(r['yieldOffered'] for r in issued),yieldRequesterMoved=sum(r['yieldStepsAfterOffer'] for r in issued),
        timings={k:{**summarize_numbers(r[k] for r in issued),'p99':percentile([r[k] for r in issued],.99)} for k in ('releaseMs','pointerQueueMs','releaseFrameMs','modelMoveMs','maxSearchMs','firstFootModelSec','firstArrivalModelSec')})


def percentile(values,p):
    vals=sorted(v for v in values if v is not None);return vals[math.ceil(len(vals)*p)-1] if vals else None


def comparison(old,new):
    def lookup(rows):return {(r['region'],r['count'],r['width'],r['case']):r for r in rows if not r['skip']}
    a,b=lookup(old),lookup(new);require(a.keys()==b.keys(),'different executable input keys')
    result={};changes=[]
    for key in ('selected','issued','arrival','nearFinger','exact'):
        result[key]={'gained':0,'lost':0}
    for i,r in a.items():
        n=b[i];diff=[]
        for key in result:
            if r[key]!=n[key]:result[key]['gained' if n[key] else 'lost']+=1;diff.append(key)
        if diff:changes.append({**{p:r[p] for p in ID},'case':r['case'],'key':r['key'],'changed':','.join(diff),'oldSelected':r['selected'],'newSelected':n['selected'],'oldOutcome':r['outcome'],'newOutcome':n['outcome'],'oldNear4':r['nearFinger'],'newNear4':n['nearFinger']})
    for name,tests in {'sameIntendedBodyReceived':[(r,b[i]) for i,r in a.items() if r['issued'] and b[i]['issued']],
                       'newIntendedBodyReceived':[(r,b[i]) for i,r in a.items() if not r['issued'] and b[i]['issued']],
                       'lostIntendedBodyReceived':[(r,b[i]) for i,r in a.items() if r['issued'] and not b[i]['issued']]}.items():
        result[name]={'n':len(tests),'oldArrival':sum(r['arrival'] for r,n in tests),'newArrival':sum(n['arrival'] for r,n in tests),'oldNear4':sum(r['nearFinger'] for r,n in tests),'newNear4':sum(n['nearFinger'] for r,n in tests)}
    return result,changes


def age_residents(cell,arm):
    a=cell['arms'][arm]['aged'];base={r['key']:r for r in a['initial']['residents']};seconds=a['final']['modelSeconds']-a['initial']['modelSeconds'];require(abs(seconds-300)<.001,'non-300s household')
    result=[]
    for r in a['final']['residents']:
        start=base[r['key']];opened=r['openFailure'];age=r['lastMovedAgo'];counts={k:r[k]-start[k] for k in COUNTERS}
        result.append({**{k:cell[k] for k in ID},'arm':arm,'key':r['key'],**counts,'actualDistance':r['actualDistance']-start['actualDistance'],'ambientDistance':r['ambientDistance']-start['ambientDistance'],
            'lastMovedAgo':age,'stationaryMax':r['stationaryMax'],'longWithoutFoot':age>=60-1e-6,'neverMoved':r['actualDistance']==start['actualDistance'],
            'noAmbientStart':counts['ambientStarts']==0,'noAmbientStartWithFailures':counts['ambientStarts']==0 and counts['ambientFailures']>0,
            'openFailedStationary60':bool(opened and seconds-opened['start']>=60-1e-6 and age>=60-1e-6),
            'activity':r['activity'],'nearest':canonical(r['nearest']),'overlaps':canonical(r['overlaps']),'blockingPeers':canonical(r['blockingPeers']),
            'directObstructions':canonical(r['directObstructions']),'stepVetoes':canonical(r['stepVetoes']),'stateSeconds':canonical(r['stateSeconds'])})
    return result


def age_metrics(residents):
    keys=(*COUNTERS,'longWithoutFoot','neverMoved','noAmbientStart','noAmbientStartWithFailures','openFailedStationary60')
    return {'residentProfiles':len(residents),**{k:sum(r[k] for r in residents) for k in keys}}


def main_report(cells,source,out,large_out=None):
    out.mkdir(parents=True,exist_ok=True)
    large_out=large_out or out
    large_out.mkdir(parents=True,exist_ok=True)
    gestures=[];residents=[];restored=[];aged=[];safety=defaultdict(Counter);all_inputs=defaultdict(list);samples=defaultdict(list);different=[];taps=[]
    for c in cells:
        different.extend({**{k:c[k] for k in ID},**d} for d in c['historicalOutcomeDifferences'])
        for arm,d in c['arms'].items():
            for key,r in d['rows'].items():
                row=drag_row(c,arm,key,r,'opening');gestures.append(row);all_inputs[arm].append(row)
                if r['kind']=='tap':taps.append({**{k:c[k] for k in ID},'arm':arm,'key':r['key'],'selectedKey':r['selectedKey'],'inkAtPress':r['inkAtPress']})
            a=d['aged'];residents.extend(age_residents(c,arm));aged.append(drag_row(c,arm,'aged/'+str(a['index']),a['drag'],'aged'))
            safety[arm].update({k:a['safety'][k] for k in ('steps','terrain','bounds','occlusion','speed','swept')});samples[arm].extend(a['frameSamples'])
            if 'reloaded' in d:
                rr=d['reloaded'];restored.append({**{k:c[k] for k in ID},'arm':arm,'savedBytes':rr['bytes'],'saveSHA256':rr['saveSHA256'],'savedNativeFieldsMatch':rr['saved']==rr['loaded'],'rosterCount':len(rr['roster']),'restoredMoney':rr['loaded']['money'],'restoredEquipment':rr['loaded']['gear'],'partner':rr['loaded']['partner'],'companions':len(rr['loaded']['companions']),'trusted':rr['drag']['trusted'],'selected':rr['drag']['selected'],'issued':rr['drag']['issued'],'arrived':rr['drag']['arrived'] or rr['drag']['terminalArrived']})
    write_csv(large_out/'matrix-inputs.csv',gestures);write_csv(out/'matrix-aged-inputs.csv',aged);write_csv(large_out/'matrix-residents.csv',residents);write_csv(out/'matrix-restores.csv',restored)
    lookup={(r['region'],r['count'],r['width'],r['arm'],r['key']):r for r in residents}
    targeted=[]
    for d in aged:
        r=lookup[(d['region'],d['count'],d['width'],d['arm'],d['key'])]
        failed=r['noAmbientStartWithFailures']
        targeted.append({**{k:d[k] for k in (*ID,'arm','key')},'ambientRequests':r['ambientRequests'],'ambientFailures':r['ambientFailures'],
            'ambientStarts':r['ambientStarts'],'lastMovedAgo':r['lastMovedAgo'],'state':r['activity'],'stepVetoes':r['stepVetoes'],'blockingPeers':r['blockingPeers'],
            'directObstructions':r['directObstructions'],'actualSelectedKey':d['selectedKey'],'issued':d['issued'],'moved':d['moved'],'actualStep':d['actualStep'],'arrival':d['arrival'],'near4':d['nearFinger'],
            'noAutoAndNoDragStep':bool(failed and d['issued'] and not d['actualStep']),'noAutoAndWrongSelection':bool(failed and not d['selected'])})
    write_csv(out/'matrix-aged-targets.csv',targeted)
    both={a:{k:sum(r[k] for r in targeted if r['arm']==a) for k in ('noAutoAndNoDragStep','noAutoAndWrongSelection')} for a in ARMS}
    (large_out/'matrix-tap-ink.json').write_text(canonical(taps)+'\n');require(len(cells)==260 and len(residents)==9828 and len(restored)==39,'incomplete grid, resident coverage or native save restoration')
    profile={a:metrics(batch) for a,batch in all_inputs.items()};compar,changes=comparison(all_inputs['v6'],all_inputs['v7']);write_csv(out/'matrix-changed.csv',changes)
    regions=[]
    for region in REGIONS:
        for a in ARMS:
            rr=[r for r in residents if r['region']==region and r['arm']==a];g=metrics([r for r in all_inputs[a] if r['region']==region]);ag=metrics([r for r in aged if r['region']==region and r['arm']==a]);regions.append({'region':region,'arm':a,**{k:v for k,v in g.items() if k!='timings'},**age_metrics(rr),'agedDragArrivals':ag['arrival'],'agedNear4':ag['near4']})
    write_csv(out/'matrix-regions.csv',regions)
    historic={k:profile['v5'][k]==old and profile['v6'][k]==new for k,old,new in DEFICITS}
    selected_by_kind={kind:comparison([r for r in all_inputs['v6'] if r['case'].startswith(kind+'/')],[r for r in all_inputs['v7'] if r['case'].startswith(kind+'/')])[0] for kind in ('historical','diagonal','occupied','clear','obstacle','tap')}
    gates={'historicalAggregateReproduced':all(historic.values()),'historicalAllFlagsReproduced':not different,'preservesV6ArrivalCount':profile['v7']['arrival']>=870,'preservesV6Near4Count':profile['v7']['near4']>=513,'preservesV6OccupiedArrivalCount':profile['v7']['occupiedArrival']>=120,'preservesV6TapSelectionCount':profile['v7']['tapSelected']>=218,'noOpeningDragSafetyIssues':not any(profile['v7'][k] for k in ('unsafe','swept','maxReleaseJump','backwardsIssued')),'noAutonomousSweptContact':safety['v7']['swept']==0,'noAutonomousTerrainOrSpeedViolation':not any(safety['v7'][k] for k in ('terrain','occlusion','speed','bounds'))}
    summary={'regressionChecks':gates,'byGestureChanges':selected_by_kind,'bothFailedAfterAging':both,'source':source,'cells':len(cells),'historicalBenchmarks':historic,'historicalOutcomeDifferences':different,'inputs':profile,'age':{a:age_metrics([r for r in residents if r['arm']==a]) for a in ARMS},
      'agedDrag':{a:metrics([r for r in aged if r['arm']==a]) for a in ARMS},'physicalSafety':safety,'comparison':compar,'regions':regions,
      'renderedFoot':{a:{'frames':len(fs),'samples':sum(f['painted'] for f in fs),'maxAnchorErrorCss':max(f['maxAnchorErrorCss'] for f in fs),'outsideBounds':sum(f['outsideActorBounds'] for f in fs),'offTerrain':sum(f['nonGround'] for f in fs),'occluded':sum(f['hidden'] for f in fs)} for a,fs in samples.items()},
      'byWidth':{str(w):{a:{'drag':metrics([r for r in all_inputs[a] if r['width']==w]),'age':age_metrics([r for r in residents if r['width']==w and r['arm']==a])} for a in ARMS} for w in WIDTHS},
      'byCount':{str(n):{a:{'drag':metrics([r for r in all_inputs[a] if r['count']==n]),'age':age_metrics([r for r in residents if r['count']==n and r['arm']==a])} for a in ARMS} for n in COUNTS},
      'reload':{'count':len(restored),'sameData':sum(r['savedNativeFieldsMatch'] for r in restored),'trusted':sum(r['trusted'] for r in restored),'selected':sum(r['selected'] for r in restored),'issued':sum(r['issued'] for r in restored),'arrival':sum(r['arrived'] for r in restored)}}
    (out/'matrix-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');return summary


def verify_archives(root,archives,run_id,source):
    name='Naoto214/naotocchi'
    run=json.loads(subprocess.check_output(['gh','run','view',str(run_id),'-R',name,'--json','conclusion,status,headSha,url,jobs']))
    jobs=run.pop('jobs');require(run['status']=='completed' and run['conclusion']=='success' and len(jobs)==13 and all(j['conclusion']=='success' for j in jobs),'incomplete CI run')
    remote=json.loads(subprocess.check_output(['gh','api',f'repos/{name}/actions/runs/{run_id}/artifacts?per_page=100']))['artifacts'];require(len(remote)==len(REGIONS),'incomplete original artifact list')
    receipt={**run,'runId':run_id,'regions':{}}
    for a in remote:
        region=a['name'].removeprefix('mobility-matrix-');require(region in REGIONS and region not in receipt['regions'],'wrong artifact name')
        require(source[region]['revision']==run['headSha'],'archive and measured revision differ')
        path=archives/f'mobility-matrix-{run_id}-{region}.zip';sha=digest(path.read_bytes())
        require(a['digest']=='sha256:'+sha and a['size_in_bytes']==path.stat().st_size,'archive digest differs from Actions manifest')
        directory=next(root.glob('**/'+region+'/region.json')).parent
        expected={'region.json',*(f'{region}-{n}-{w}.json' for n in COUNTS for w in WIDTHS)}
        with zipfile.ZipFile(path) as z:
            require(set(z.namelist())==expected and len(z.namelist())==len(expected) and all(z.read(k)==(directory/k).read_bytes() for k in expected),'archive extraction mismatch')
        job=next(j for j in jobs if j['name']==f'region ({region})');receipt['regions'][region]={'artifactId':a['id'],'jobId':job['databaseId'],'zipSHA256':sha,'bytes':path.stat().st_size,'startedAt':job['startedAt'],'completedAt':job['completedAt']}
    return receipt


DATA_BASE='https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/matrix/'
LARGE_FILES=('matrix-inputs.csv','matrix-residents.csv','matrix-tap-ink.json')


def private_exports(source,target,receipt):
    target.mkdir(parents=True,exist_ok=True);files={}
    for name in LARGE_FILES:
        data=(source/name).read_bytes();path=target/(name+'.gz')
        with path.open('wb') as f:
            with gzip.GzipFile(fileobj=f,filename='',mode='wb',compresslevel=6,mtime=0) as out:out.write(data)
        compressed=path.read_bytes();require(gzip.decompress(compressed)==data,'unreadable owner dataset')
        files[name]={'file':path.name,'url':DATA_BASE+path.name,'sha256':digest(compressed),'bytes':len(compressed),'uncompressedSHA256':digest(data),'uncompressedBytes':len(data)}
    archives={r:{'url':DATA_BASE+f"mobility-matrix-{receipt['runId']}-{r}.zip",'sha256':val['zipSHA256'],'bytes':val['bytes']} for r,val in receipt['regions'].items()}
    return {'revision':receipt['headSha'],'runId':receipt['runId'],'derived':files,'rawRegions':archives}


def repeat_controls(cells,previous):
    # The two control arms were byte-identical across CI runs; aged trajectories
    # can still diverge even with identical opening footprints and random seeds.
    counts={a:Counter() for a in ('v5','v6')};source=None
    for c in cells:
        folder=previous/c['region'];prior=folder/f"{c['region']}-{c['count']}-{c['width']}.json"
        manifest=json.loads((folder/'region.json').read_text());raw=prior.read_bytes();require(digest(raw)==manifest['cells'][prior.name]['sha256'],'prior control raw digest mismatch')
        source=source or manifest['revision'];require(source==manifest['revision'],'mixed prior revision');old=json.loads(raw)
        for a,batch in counts.items():
            prior_arm=old['arms'][a];new=c['arms'][a];require(prior_arm['hashes']==new['hashes'],'inter-run control source changed')
            batch['profiles']+=1;batch['sameOpeningAndSeed']+=prior_arm['seed']==new['seed'] and prior_arm['opening']==new['opening']
            batch['same300SecondCoordinates']+=prior_arm['aged']['opening']==new['aged']['opening']
            batch['same300SecondActiveResidentCount']+=sum(r['ambientStarts']>0 for r in prior_arm['aged']['final']['residents'])==sum(r['ambientStarts']>0 for r in new['aged']['final']['residents'])
    return {'earlierRevision':source,'controls':counts}


def format_report(s,url,private=False):
    def trip(g,k):return ' / '.join(str(s[g][a][k]) for a in ARMS)
    def fraction(g,n,d):
        vals=[]
        for a in ARMS:
            x=s[g][a];v,w=x[n],x[d];vals.append(f'{v:,} / {w:,}（{100*v/w:.1f}%）' if w else '0 / 0')
        return ' | '.join(vals)
    table=['| 観測値 | V5 | V6 | V7 |','|---|---:|---:|---:|']
    lines=['# 全13地域の移動とドラッグ回帰検証','',f"コミット `{s['source'][REGIONS[0]]['revision']}`。各版260世帯条件で、{s['inputs']['v7']['drags']:,}回の同一ドラッグと260回の同一タップをChromiumのタッチ入力で再生した。別の同一初期画面から各世帯を300モデル秒進めて、3版合計9,828件の住民記録、780回の経年後ドラッグ、39回のセーブ復帰を検証した。",'', '## #575の操作を同じ初期配置で再現','',*table]
    for title,key in [('送信ドラッグ','drags'),('狙った本人への指示','issued'),('実際の経路終点への到着','arrival'),('本人の到着イベント','eventArrival'),('最後の経路終点への実歩行・静止確認','terminalArrival'),('指先の指定位置に到着（誤差0.001 CSS px以下）','exact'),('指先4 CSS px以内（実到着）','near4'),('到着イベント時点で指先4px以内','eventNear4'),('最後の静止位置が指先4px以内','terminalNear4'),('ほかの住民の足元指定から到着','occupiedArrival'),('タップで狙った本人を選択','tapSelected'),('本人の指示後に逆方向へ0.5px超','backwardsIssued'),('指を動かすイベント中のグラフ探索','graphSearchesDuringMove')]:lines.append('| '+title+' | '+' | '.join(str(s['inputs'][a][key]) for a in ARMS)+' |')
    count=len(s['historicalOutcomeDifferences']);lines+=['',f"#575の同一座標・指の行き先・地形区分・描画足を全組で照合した。旧2版の住民選択・指示・歩行・到着フラグで、保存済みの1件ずつの記録との差は {count} 項目。実到着は本人の `arrive/drag` または実歩行後に最終経路終点から0.01 CSS px以内で静止したことを確認した場合。受理しただけの指示は除いた。",'']
    for label,k in [('本人到着','arrival'),('指先4px以内','nearFinger'),('指先0.001px以内','exact')]:
        row=s['comparison'][k];lines.append(f"- 同じドラッグに対するV6→V7の{label}は、獲得 {row['gained']} 件、喪失 {row['lost']} 件。")
    for label,k in [('両版とも狙った本人に届いた指示','sameIntendedBodyReceived'),('V7で新たに狙った本人に届いた指示','newIntendedBodyReceived')]:
        z=s['comparison'][k];lines.append(f"- {label} {z['n']} 件では、V6→V7の到着が {z['oldArrival']}→{z['newArrival']}、指先4px以内が {z['oldNear4']}→{z['newNear4']}。")
    lines+=['','## 5分の自律移動と行き詰まり','',*table]
    for title,k in [('観測した住民・条件の組','residentProfiles'),('自律移動を一度も開始せず','noAmbientStart'),('自律移動が失敗し一度も開始せず','noAmbientStartWithFailures'),('自分の足も道譲りの足も一度も移動せず','neverMoved'),('終了時に60秒以上静止','longWithoutFoot'),('未解決の移動失敗と静止がともに60秒以上','openFailedStationary60')]:lines.append('| '+title+' | '+' | '.join(str(s['age'][a][k]) for a in ARMS)+' |')
    for title,n,d in [('実際に歩き始めた自律指示 / 全自律指示','ambientStarts','ambientRequests'),('失敗後に実際に歩けた回復 / 失敗エピソード','recoveredEpisodes','failureEpisodes')]:lines.append('| '+title+' | '+fraction('age',n,d)+' |')
    lines+=['','同一住民の連続した失敗は1エピソードとして記録し、本人が自律移動またはドラッグで次の実ステップを踏んだときに回復と数えた。移動要求がなく、通常の休息・会話・観察中だった時間は静止としてのみ数えた。終了時点の未解決群は、実際の失敗から60モデル秒以上経ち、その住民自身も60秒以上足を動かしていない個体に限る。', '', '## 地域別','', '各欄はV5 / V6 / V7。5人数×4画面幅の20条件を各地域に含む。','', '| 地域 | 初期実到着 | 初期指先4px | 自律失敗かつ開始0の住民 | 回復 / 失敗 | 経年後ドラッグ到着 / 20 |','|---|---:|---:|---:|---:|---:|']
    for region in REGIONS:
        regs={r['arm']:r for r in s['regions'] if r['region']==region};row=lambda k:' / '.join(str(regs[a][k]) for a in ARMS)
        ratios=' ／ '.join(f"{regs[a]['recoveredEpisodes']}/{regs[a]['failureEpisodes']}" for a in ARMS)
        lines.append(f"| {NAMES[region]} | {row('arrival')} | {row('near4')} | {row('noAmbientStartWithFailures')} | {ratios} | {row('agedDragArrivals')} |")
    lines+=['','## 混雑時の道譲り・経年後の操作・安全性','',*table]
    lines.append('| 初期ドラッグで道譲りを受け本人が実歩行 / 道譲りを指示 | '+fraction('inputs','yieldRequesterMoved','yieldOffers')+' |')
    for title,key in [('経年後ドラッグの本人選択','selected'),('経年後ドラッグの本人到着','arrival'),('経年後ドラッグの指先4px以内','near4')]:lines.append('| '+title+' | '+' | '.join(str(s['agedDrag'][a][key]) for a in ARMS)+' |')
    for title,k in [('自律移動の実ステップ','steps'),('自律歩行中のすれ違い・既存接触の深化（住民ペア×ステップ）','swept'),('自律移動の地形侵入','terrain'),('自律移動の表示範囲外','bounds'),('自律移動の遮蔽','occlusion'),('自律移動の速度上限超過','speed')]:lines.append('| '+title+' | '+' | '.join(str(s['physicalSafety'][a][k]) for a in ARMS)+' |')
    for title,k in [('初期ドラッグ時の危険な足ステップ','unsafe'),('初期ドラッグ時の連続動線での接触侵入','swept'),('指を離した時点での最大足の変化（CSS px）','maxReleaseJump')]:lines.append('| '+title+' | '+' | '.join(str(s['inputs'][a][k]) for a in ARMS)+' |')
    lines+=['','300モデル秒後、V5で自律移動の失敗と開始状況・最終歩行時刻から選んだ同じ住民IDを3版でドラッグした。指先はその版の自然な経年後の足を基準とする水平12px。3版の初期操作と違い、経年後は当人や周囲が自然に移動した位置で測定した。', '', '## 描画足とセーブ再読込','']
    both=s['bothFailedAfterAging'];lines.append('同じ経年後対象260体のうち、自律指示を受けながら300秒間一度も歩き始めず、本人に届いたドラッグでも歩けなかった件数はV5 / V6 / V7で '+ ' / '.join(str(both[a]['noAutoAndNoDragStep']) for a in ARMS)+'。自律移動が同条件で、タッチ時に別の住民が選ばれた件数は '+ ' / '.join(str(both[a]['noAutoAndWrongSelection']) for a in ARMS)+'。[対象ID・妨げた住民・待機・指示受理の一覧](evidence/matrix-aged-targets.csv)')
    g=s['renderedFoot'];lines.append(f"モデル0・60・120・180・240・300秒の実DOMで、各版 {g['v7']['samples']:,} 組の住民の足アンカーとモデル座標を照合した。最大差はV5 / V6 / V7の順に "+' / '.join(f"{g[a]['maxAnchorErrorCss']:.4f}" for a in ARMS)+' CSS px。')
    z=s['reload'];lines.append(f"各地域28体・390pxの3版で、経年後のネイティブ保存と再読込を {z['count']} 回実施した。隔離した試遊メモリでは通常の画面再読込時に保存が破棄されるため、測定時は実際の保存関数が生成したバイト列を、再読込した画面の通常のロード関数に渡した。所持金・保存版・装備・恋人・仲間の照合成功 {z['sameData']} 回、再読込後タッチ配信 {z['trusted']} 回、本人への指示 {z['issued']} 回、本人到着 {z['arrival']} 回。")
    lines+=['','## 測定条件と数値','', '13地域×1・4・10・20・28体×320・375・390・430 CSS px。実タッチはPlaywrightのChromiumモバイル入力。3版とも世帯・初期足・表示サイズ・乱数を一致させ、過去の実座標を再使用した。5分の経年は自律移動を有効にしたネイティブモデルを0.05秒刻みで進め、各60秒で本物のホームを再描画した。経年試験はモデル時間の観察。実時計での連続映像の停止とWebKitの負荷は別の長時間試験で扱う。iPhone Safari実機のV7操作結果は未検証。','', '[入力ごとの数値](evidence/matrix-inputs.csv) ／ [地域別](evidence/matrix-regions.csv) ／ [全住民の行動・待ち時間・接触相手](evidence/matrix-residents.csv) ／ [経年後の指示](evidence/matrix-aged-inputs.csv) ／ [セーブ復帰](evidence/matrix-restores.csv) ／ [集計JSON](evidence/matrix-summary.json) ／ [V6との変化](evidence/matrix-changed.csv)']
    if url:lines+=['',f'[13地域のActions]({url})']
    if 'controlRepeat' in s:
        repeat=s['controlRepeat']['controls']
        lines+=['',f"同じV5/V6プログラムを別のActions実行でも検証した。初期位置・乱数が一致したのは各260組、300モデル秒後の座標まで一致したのはV5が {repeat['v5']['same300SecondCoordinates']} / 260、V6が {repeat['v6']['same300SecondCoordinates']} / 260。上の表には最終コミットの測定値を用いた。"]
    if private:
        lines=[line.replace('evidence/matrix-inputs.csv',DATA_BASE+'matrix-inputs.csv.gz').replace('evidence/matrix-residents.csv',DATA_BASE+'matrix-residents.csv.gz') for line in lines]
        lines+=['','[本人限定の各地域ZIP・圧縮データのURLとSHA-256](evidence/matrix-data.json)']
    return '\n'.join(lines)+'\n'


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('raw',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--report',type=Path,required=True);p.add_argument('--run',type=int);p.add_argument('--archives',type=Path);p.add_argument('--private-dir',type=Path);p.add_argument('--prior-raw',type=Path);a=p.parse_args()
    if bool(a.run)!=bool(a.archives):p.error('--run and --archives are required together')
    if a.private_dir and not a.run:p.error('--private-dir needs a verified Actions collection')
    large=a.private_dir.parent/'derived-uncompressed' if a.private_dir else a.out
    cells,source=read_archives(a.raw);summary=main_report(cells,source,a.out,large);url=None
    if a.prior_raw:
        summary['controlRepeat']=repeat_controls(cells,a.prior_raw);(a.out/'matrix-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    if a.run:
        receipt=verify_archives(a.raw,a.archives,a.run,source);url=receipt['url'];(a.out/'matrix-artifacts.json').write_text(json.dumps(receipt,indent=2)+'\n')
    if a.private_dir:
        private=private_exports(large,a.private_dir,receipt);(a.out/'matrix-data.json').write_text(json.dumps(private,ensure_ascii=False,indent=2)+'\n')
    a.report.write_text(format_report(summary,url,bool(a.private_dir)));print('Verified',summary['cells'],'triples; historic',summary['historicalBenchmarks'],'differing flags',len(summary['historicalOutcomeDifferences']))
