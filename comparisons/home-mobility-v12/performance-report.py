"""Validate the two run orders, source fingerprints and raw GitHub ZIP digests before reporting."""
import argparse
import csv
import hashlib
import importlib.util
import json
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
load=importlib.util.spec_from_file_location('performance_v11_report',HERE.parent/'home-mobility-v11/performance-report.py')
prior=importlib.util.module_from_spec(load)
load.loader.exec_module(prior)
ARMS=['v10','v11-foot','v12']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def report(args):
    raw={}
    sources={}
    runs={}
    for receipt_path in sorted(args.archive.rglob('receipt.json')):
        receipt=json.loads(receipt_path.read_bytes())
        runs[receipt['run']]=dict(commit=receipt['commit'],url=receipt['url'],jobs=receipt['jobs'])
        for item in receipt['archives']:
            path=receipt_path.parent/item['name']
            assert path.stat().st_size==item['bytes'] and digest(path.read_bytes())==item['sha256']
            with zipfile.ZipFile(path) as z:
                for name in z.namelist():
                    if not name.endswith('.json'):continue
                    data=z.read(name)
                    assert name not in raw, name
                    raw[name]=json.loads(data)
                    sources[name]=digest(data)
    outputs=dict(runs=runs,sourceSHA256=sources,assets={},frames=[],normal=[],trace=[],fixed={},touch=[],growth=[],witness=[],model=[])
    def verify(assets):
        for name,expected in assets.items():
            assert Path(name).name==name
            file=args.game/name
            assert file.is_file() and digest(file.read_bytes())==expected, name
            assert outputs['assets'].setdefault(name,expected)==expected
    opening=None
    nativeBrowser=set()
    for order,arms in [('forward', ARMS),('reverse', ARMS[::-1])]:
        for family in ('live','trace'):
            data=raw[f'{family}-{order}.json'];nativeBrowser.add(data['browser'])
            assert [r['arm'] for r in data['rows']]==arms and data['seconds']==(180 if family=='live' else 40)
            for r in data['rows']:
                verify(r['assets'])
                ss=r['sample'];signature=prior.fingerprint(ss['opening'])
                opening=opening or signature
                assert signature==opening and ss['retained'] and ss['visibleAtOpen']==ss['visibleAtEnd']==28
                assert ss['elapsedMs']>=1000*data['seconds'] and not ss['diagnostics']['enabled']
                if family=='trace':
                    outputs['trace'].append(dict(arm=r['arm'],order=order,parts=ss['audit']['parts'],modelSeconds=ss['clock']))
                    continue
                frames=prior.summary(ss['intervals']);assert frames==r['distribution']
                outputs['frames'].append(dict(kind=family,order=order,arm=r['arm'],**frames))
                outputs['normal'].append(dict(arm=r['arm'],order=order,modelSeconds=ss['clock'],wallSeconds=ss['elapsedMs']/1000,
                      moves=ss['moves'],distance=ss['distance'],events=ss['events'],pausedMs=ss['pausedMs'],frames=frames,
                      cpuMs=prior.thread_delta(r['os'][0],r['os'][-1]),longest=r['longest']))
        data=raw[f'touch-{order}.json'];nativeBrowser.add(data['browser']);assert [r['arm'] for r in data['rows']]==arms
        for r in data['rows']:
            verify(r['assets']);readings=r['readings'];commands=[x['command'] for x in readings]
            assert len(commands)==9 and all(x['trusted'] for x in readings)
            assert outputs.setdefault('touchCommands',commands)==commands
            selected=[x for x in readings if x.get('key')==x['command']['key']]
            moving=[x for x in selected if x.get('firstStepMs') is not None]
            arrivals=[x for x in moving if x.get('arrivalMs') is not None]
            outputs['touch'].append(dict(arm=r['arm'],order=order,selected=len(selected),moved=len(moving),arrived=len(arrivals),
                moverIDs=[x['key'] for x in moving],endpoints=[x.get('finalFoot') for x in arrivals],
                onset=prior.summary([x['firstStepMs'] for x in moving]),arrival=prior.summary([x['arrivalMs'] for x in arrivals]),
                handling=prior.summary([x['handlerMs'] for x in selected]),queue=prior.summary([x['queueMs'] for x in readings])))
    outputs['openingSHA256']=opening
    for kind in ('fixed','stress'):
        data=raw[kind+'.json'];nativeBrowser.add(data['browser']);rows=data['rows'];base=rows[0]
        assert [r['arm'] for r in rows]==ARMS+ARMS[::-1]
        for i,r in enumerate(rows):
            verify(r['assets']);assert r['cast']==28 and len(r['environment'])==480
            assert all(r[k]==base[k] for k in ['intervalFrames','environment','nativeGesture','countByKey'])
            frames=prior.summary(r['intervals']);assert frames==r['distribution'] and frames['n']==378
            order='forward' if i<3 else 'reverse'
            outputs['frames'].append(dict(kind=kind,order=order,arm=r['arm'],**frames))
            outputs['fixed'].setdefault(kind,[]).append(dict(order=order,arm=r['arm'],frames=frames,cpuMs=prior.thread_delta(*r['cpu'])))
        active=data['physicalMoversPerMeasuredFrame']
        outputs['fixed'][kind+'Motion']=dict(posesSHA256=data['fixtureSHA256'],phaseSHA256=data['phaseSHA256'],max=max(active),mean=sum(active)/len(active))
    profile=raw['curve.json'];rows=profile['rows'];assert len(rows)==6 and all(r['feet']==rows[0]['feet'] for r in rows)
    for r in rows:
        verify({r['sourceFile']:r['sourceSHA256']});metrics=r['metrics']
        assert r['timings']['step']['cpuMs']['n']==profile['seconds']*10
        outputs['model'].append(dict(arm=r['arm'],order=r['order'],events=r['curveEvents'],moves=metrics['moves'],distance=metrics['distance'],timings=r['timings']))
    outputs['modelSetup']={k:profile[k] for k in ['seconds','seed','geometry','node']}
    growth=raw['growth.json'];nativeBrowser.add(growth['browser']); assert growth['kind']=='webkit' and len(growth['cases'])==56
    for c in growth['cases']:
        verify(c['assets']); assert len(c['opening'])==len(c['ending'])==28
        result=c['result'];assert result['started'] and result['stageAfter']>result['stageBefore']
        assert c['arm']!='v12' or c['decision']['policy']==c['policy']
        steps=result['steps'];outputs['growth'].append(dict(arm=c['arm'],order=c['order'],policy=c['policy'],width=c['width'],
                               openingSHA256=prior.fingerprint(c['opening']),callMs=c['callMs'],framesMs=c['framesMs'],
                               maxShift=result['maxScreenCss'],phases=[{k:s[k] for k in ['accepted','validateMs','reason','search'] if k in s} for s in steps]))
    witness=raw['witness.json'];nativeBrowser.add(witness['browser']);assert witness['kind']=='webkit' and len(witness['rows'])==24
    for r in witness['rows']:
        verify(r['sources']);assert len(r['resumes'])==r['iters'] and not r.get('violations',0)
        outputs['witness'].append({**{k:r.get(k) for k in ['arm','order','mode','angle','found','actual','goalError','iters','total','max','violations']},'resumes':prior.summary(r['resumes'])})
    assert len(nativeBrowser)==1;outputs['browser']=nativeBrowser.pop()
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'performance.json').write_text(json.dumps(outputs,ensure_ascii=False,indent=2)+'\n')
    with (args.out/'performance-frames.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=outputs['frames'][0]);w.writeheader();w.writerows(outputs['frames'])
    print(len(outputs['normal']),'natural runs,',len(outputs['growth']),'growths,',len(outputs['witness']),'saved-pose searches')


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('archive',type=Path);ap.add_argument('--out',type=Path,default=HERE/'evidence');ap.add_argument('--game',type=Path,required=True)
    report(ap.parse_args())
