"""Compare the native painters on busy, unmodified stretches of the same 28-resident model."""
import argparse,json,subprocess
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from performance_common import ARMS,HERE,V9,WPE,clock,digest,distribution,load,native_page,save
prior=load('v9_fixed',V9/'performance-fixed.py')
HOLD,packed=prior.HOLD,prior.packed

def painters(base,guard=False):
    definitions={};fingerprints={}
    for arm in ARMS+(['guarded'] if guard else []):
        name='v9' if arm=='guarded' else arm
        source=urlopen(f'{base}/home-production-diorama-mobility-{name}.js').read().decode()
        if arm=='guarded':
            patch="const fs=require('node:fs');process.stdout.write(require('./render-probe.cjs').patchGuideAndSelection(fs.readFileSync(0,'utf8')));"
            source=subprocess.check_output(['node','-e',patch],input=source.encode(),cwd=HERE).decode()
        fingerprints[arm]=digest(source)
        foreground=prior.extract(source,'    function foregroundProjection(' if '    function foregroundProjection(' in source else '    function paintForeground(','\nconst inside=')
        paint=prior.extract(source,'    function paint(){','    function stop(){')
        attributes=prior.extract(source,'    function paintAttribute(','    function sync(){') if 'function paintAttribute(' in source else ''
        guide=prior.extract(source,'    function showGuide(){','    function emit(')
        definitions[arm]='(()=>{'+attributes+foreground+guide+paint+'return paint;})()'
    return '{'+','.join(f'{key}:{body}' for key,body in definitions.items())+'}',fingerprints

def run(args):
    args.out.parent.mkdir(parents=True,exist_ok=True)
    injected,hashes=painters(args.base,guard="guarded" in args.order)
    code=(HERE/'performance-fixed.js').read_text().replace('PAINTERS',injected)
    def insert(name,source):
        return clock.replace(source,'    function stop(){',code+'\n    function stop(){') if 'production-diorama' in name else source
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE);page,errors,sources=native_page(b,args.base,'v9',init=HOLD,transform=insert)
        page.wait_for_timeout(900)
        fixture=page.evaluate('args=>fixedCast.capture(args)',dict(seed=214,clips=args.clips,scan=args.scan,size=args.size,stress=args.stress))
        poses=fixture.pop('frames');packed(args.out.parent/'active-poses.json.gz',poses)
        result=dict(browser=b.version,controllerSHA256=hashes,source=sources,seed=214,fixture=fixture,posesSHA256=digest(json.dumps(poses,separators=(',',':'))),rows=[])
        warm=args.warm*args.size;observed=[i for i in range(warm,len(poses)) if i%args.size>=2]
        result['warmupFrames']=warm;result['measuredFrames']=len(observed)
        result['physicalMoversPerMeasuredFrame']=[len(poses[i]['moved']) for i in observed]
        assert len(poses)==args.clips*args.size and all(len(p['positions'])==28 for p in poses)
        assert sum(result['physicalMoversPerMeasuredFrame'])>len(observed)*.40, 'active sample close to previous idle tape'
        samples=[];page.expose_function('markSampling',lambda stamp:samples[-1].begin(stamp));reference=None
        for arm in args.order.split(','):
            cpu=clock.Scheduler(.12);samples.append(cpu)
            try:row=page.evaluate('([a,w])=>fixedCast.run(a,w)',[arm,warm])
            finally:cpu.end()
            phases=row.pop('phaseLog');e=row['environment'];signature=digest(json.dumps(phases,separators=(',',':')))
            if reference is None:
                reference=(phases,e);packed(args.out.parent/'active-animation-phases.json.gz',phases)
            row.update(arm=arm,phaseSHA256=signature,distribution=distribution(row['intervals']),cpu=[cpu.rows[0],cpu.rows[-1]])
            assert row['intervalFrames']==observed and row['cast']==28 and len(row['intervals'])==len(observed) and not errors,errors
            assert reference==(phases,e),[(i,x,y) for i,(x,y) in enumerate(zip(reference[0],phases)) if x!=y][:3]
            assert sum(item[1] for item in e)>=len(e)*.98, 'missing environment frames'
            result['rows'].append(row);save(args.out,result);print(arm,row['distribution'],flush=True)
        b.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',default='http://127.0.0.1:8377/game');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--stress',action='store_true');p.add_argument('--order',default='v8,v9,v10,v10,v9,v8');p.add_argument('--clips',type=int,default=30);p.add_argument('--scan',type=int,default=500);p.add_argument('--size',type=int,default=16);p.add_argument('--warm',type=int,default=3)
    run(p.parse_args())
