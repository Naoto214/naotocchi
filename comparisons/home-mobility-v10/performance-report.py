"""Verify all independent browser results, archive raw observations and export frame statistics."""
import argparse,csv,gzip,json,shutil
from pathlib import Path
from performance_common import ARMS,digest,distribution,save

def compressed(destination,data):
    with gzip.GzipFile(str(destination),'wb',mtime=0) as f:f.write(data)

def report(a):
    a.out.mkdir(parents=True,exist_ok=True);a.private.mkdir(parents=True,exist_ok=True)
    summary=dict(run=a.run,sourceSHA256={},carriedFrom={},frames=[],fixed={},native={},units='milliseconds and native CSS/model coordinates');table=[]
    def raw(name):
        files=list(a.directory.rglob(name+'.json'))
        if not files and a.causal_reference and name in ('candidate','style'):
            files=list(a.causal_reference.rglob(name+'.json'))
            summary['carriedFrom'][name]='https://github.com/Naoto214/naotocchi/actions/runs/44921996416'
        assert len(files)==1,files
        content=files[0].read_bytes();summary['sourceSHA256'][name]=digest(content);compressed(a.private/(name+'.json.gz'),content)
        return json.loads(content),files[0].parent
    def add(label,arm,order,gaps,moves=None,distance=None):
        stats=distribution(gaps);table.append(dict(workload=label,order=order,arm=arm,**stats,moves=moves,distance=distance));return stats
    for case,expected in [('fixed',ARMS+ARMS[::-1]),('stress',ARMS+ARMS[::-1]),('candidate',['v9','guarded','guarded','v9'])]:
        data,folder=raw(case);assert [r['arm'] for r in data['rows']]==expected;assert data['fixture']['stress']==(case=='stress');poses=folder/'active-poses.json.gz';phases=folder/'active-animation-phases.json.gz'
        for file in [poses,phases]:shutil.copyfile(file,a.private/(case+'-'+file.name))
        values=json.loads(gzip.decompress(poses.read_bytes()));css=json.loads(gzip.decompress(phases.read_bytes()));assert digest(json.dumps(values,separators=(',',':')))==data['posesSHA256'];key=digest(json.dumps(css,separators=(',',':')));base=data['rows'][0];assert len(data['fixture']['initial'])==28
        n=data['measuredFrames'];movement=data['physicalMoversPerMeasuredFrame'];src=data['fixture']['allScores'];clip_size=data['fixture']['clipSize'];assert n==len(movement) and n>0;physical={k for k,steps in base['countByKey'].items() if steps};
        reference_rows=base['intervalFrames'];assert len(reference_rows)==n and [len(values[i]['moved']) for i in reference_rows]==movement
        info=dict(openingSHA256=digest(json.dumps(data['fixture']['initial'],separators=(',',':'))),controllerSHA256=data['controllerSHA256'],seed=data['seed'],posesSHA256=data['posesSHA256'],phaseSHA256=key,
            browser=data['browser'],sourceSeconds=data['fixture']['sourceSeconds'],sampleSeconds=len(values)*data['fixture']['stepSeconds'],
            physicalActors=len(physical),averageMoving=sum(movement)/n,peakMoving=max(movement),zeroMoving=sum(not v for v in movement),
            averageScanMoving=sum(src)/(len(src)*(clip_size-2)),warmup=data['warmupFrames'],clips=len(data['fixture']['clips']),
            frames=n,observedCSSFrames=sum(bool(x) for x in css),sourceModel=data['source'],rows=[])
        for i,r in enumerate(data['rows']):
            assert r['phaseSHA256']==key and r['intervalFrames']==reference_rows and r['environment']==base['environment'] and r['countByKey']==base['countByKey'] and r['cast']==28
            stats=add(case,r['arm'],'forward' if i<len(expected)/2 else 'reverse',r['intervals']);assert stats==r['distribution'];t0,t1=r['cpu']
            cpu={kind:round(t1[5][kind]-t0[5][kind],2) for kind in ('main','raster','compositor')};info['rows'].append(dict(arm=r['arm'],distribution=stats,cpuMs=cpu,throttle=t1[2]-t0[2],environmentCompositions=sum(z[1] for z in r['environment'])))
        for r,rawRow in zip(info['rows'],data['rows']):
            cohorts={name:distribution([gap for gap,moved in zip(rawRow['intervals'],movement) if fn(moved)]) for name,fn in [('stationary',lambda m:m==0),('atLeastOne',lambda m:m>=1),('atLeastTwo',lambda m:m>=2),('atLeastFour',lambda m:m>=4),('atLeastEight',lambda m:m>=8)]}
            r['movingCohorts']=cohorts
        info['physicalActorsMeasured']=len({k for i in reference_rows for k in values[i]['moved']})
        summary['fixed'][case]=info
    hashes={};openings={}
    for name in ['forward','reverse','trace']:
        data,_=raw(name);info=[];assert [x['arm'] for x in data['rows']]==(ARMS[::-1] if name=='reverse' else ARMS)
        for r in data['rows']:
            s=r['sample'];assert s['retained'] and s['visibleAtOpen']==s['visibleAtEnd']==28;assert not s['diagnostics']['enabled'] and s['clock']>0
            opening=digest(json.dumps(s['opening'],separators=(',',':')));openings.setdefault(name,[]).append(opening);assert data['browser']==summary['fixed']['fixed']['browser'];stats=distribution(s['intervals']);assert stats==r['distribution'];
            for f,h in r['assets'].items():assert hashes.setdefault(f,h)==h
            if name!='trace':add('ordinary',r['arm'],name,s['intervals'],s['moves'],s['distance'])
            start,end=r['os'][0],r['os'][-1];t=r['longest'];entry=dict(arm=r['arm'],distribution=stats,clock=s['clock'],moves=s['moves'],distance=s['distance'],events=s['events'],pausedMs=s['pausedMs'],pauses=s['pauses'],gateHistory=s.get('gateHistory',[]),minutes=s['minutes'],warmupSeconds=data['warmupSeconds'],elapsedMs=s['elapsedMs'],longestCPU=t['webThreadCpuMs'],alignmentErrorMs=t['osRangeErrorMs'],throttle=end[2]-start[2],threadCPUms={k:round(end[5][k]-start[5][k],2) for k in ('main','raster','compositor')});
            if name=='trace':entry.update(parts={k:v for k,v in s['audit']['parts'].items() if ' ' not in k},counts=s['audit']['counts'])
            info.append(entry)
        summary['native'][name]=info
    summary['openingSHA256']=openings;summary['sourceAssets']=hashes
    for arm in ARMS:assert summary['fixed']['fixed']['controllerSHA256'][arm]==hashes[f'home-production-diorama-mobility-{arm}.js']
    t,_=raw('touch');summary['touch']=[]
    for row in t['rows']:
        rr=row['readings'];assert all(x['trusted'] for x in rr);selected=[x for x in rr if x.get('key')==x['command']['key']];cohort=[x for x in selected if x['firstStepMs'] is not None];summary['touch'].append(dict(arm=row['arm'],n=len(rr),selected=len(selected),moving=len(cohort),onset=distribution([x['firstStepMs'] for x in cohort]),arrival=distribution([x['arrivalMs'] for x in cohort if x['arrivalMs'] is not None]),commands=[x['command'] for x in rr],movingKeys=[x['key'] for x in cohort]));
    assert [r['arm'] for r in summary['touch']]==ARMS;assert all(r['commands']==summary['touch'][0]['commands'] for r in summary['touch'])
    pixels,_=raw('pixels');assert all(not any(r['changes']) and r['masksEqual'] for r in pixels['rows']);summary['pixels']=pixels
    env,_=raw('environment');assert len(env['rows'])==6 and set((r['arm'],r['variant']) for r in env['rows'])=={(a,v) for a in ARMS for v in ['B','E3plus']};summary['environment']=[dict(arm=r['arm'],variant=r['variant'],clock=r['envDelta'],components=r['parts']) for r in env['rows']]
    style,_=raw('style')
    for arm in ARMS:
        assert style['controllers'][arm]==hashes[f'home-production-diorama-mobility-{arm}.js']
        assert summary['fixed']['candidate']['controllerSHA256'][arm]==hashes[f'home-production-diorama-mobility-{arm}.js']
    summary['style']=[]
    for r in style['rows']:
        finite=[c for c in r['paintClips'] if c<=390*792*4];summary['style'].append(dict(arm=r['arm'],writes=r['writes'],metrics=r['metrics'],phases=r['phases'],finiteClips=distribution(finite),largeClips=len(r['paintClips'])-len(finite)))
    summary['frames']=table;save(a.out/'performance.json',summary);save(a.private/'summary.json',summary)
    output=a.out/'performance-frames.csv'
    with output.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=table[0]);w.writeheader();w.writerows(table)
    shutil.copyfile(output,a.private/output.name);save(a.private/'index.json',dict(run=a.run,sha256={str(x.relative_to(a.private)):digest(x.read_bytes()) for x in sorted(a.private.rglob('*')) if x.is_file() and x!=a.private/'index.json'}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('out',type=Path);p.add_argument('--private',type=Path,required=True);p.add_argument('--causal-reference',type=Path,help='first-run artifacts for the unchanged renderer-only control and style attribution');p.add_argument('--run',required=True);report(p.parse_args())
