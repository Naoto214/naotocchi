"""Replay preserved position bytes directly, without selecting intervals from a new game."""
import argparse
import gzip
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import ARMS,HERE,WPE,clock,digest,distribution,load,native_page,save

fixed = load('active_fixed', HERE/'performance-fixed.py')
INSTALL = '''
fixedCast.loadReference=({initial,data,clip})=>{
  window.holdGameTasks=true;
  HomeCastTrial.apply({paused:false});
  const active=mobilityPerf.reset(214),snapshot=active.snapshot;
  fixedActors=snapshot().map((a,i)=>{
    const [key,x,y,w,h]=initial[i];
    if(a.key!==key||Math.abs(a.w-w)>1e-6||Math.abs(a.h-h)>1e-6)throw Error('Different roster or artwork geometry');
    return {...a,x,y};
  });
  clipSize=clip;frames=data;pose=null;
  active.snapshot=()=>pose||snapshot();
};
'''

def read(path):
    data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)

def run(args):
    frame_data=read(args.poses)
    source=read(args.record)
    fingerprint=digest(json.dumps(frame_data,separators=(',',':')))
    assert fingerprint==source['posesSHA256'], 'Archived poses differ from the native run'
    code,hashes=fixed.painters(args.base,guard='guarded' in args.order)
    for arm in args.order.split(','):
        assert hashes[arm]==source['controllerSHA256'][arm],(arm,'controller changed')
    script=(HERE/'performance-fixed.js').read_text().replace('PAINTERS',code)
    script=clock.replace(script,'fixedCast.run=async(arm,warm)=>{',INSTALL+'\nfixedCast.run=async(arm,warm)=>{')
    def install(name,src):
        if 'production-diorama' in name:
            return clock.replace(src,'    function stop(){',script+'\n    function stop(){')
        return src
    observed={**source,'replayOfArchive':digest(args.record.read_bytes()),'rows':[]}
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE)
        page,errors,assets=native_page(b,args.base,'v9',transform=install,init=fixed.HOLD)
        observed.update(source=assets,browser=b.version,controllerSHA256=hashes)
        page.wait_for_timeout(900)
        page.evaluate('a=>fixedCast.loadReference(a)',dict(initial=source['fixture']['initial'],data=frame_data,clip=source['fixture']['clipSize']))
        samples=[]
        page.expose_function('markSampling',lambda stamp:samples[-1].begin(stamp))
        for arm in args.order.split(','):
            cpu=clock.Scheduler(.12)
            samples.append(cpu)
            try:
                result=page.evaluate('([a,w])=>fixedCast.run(a,w)',[arm,source['warmupFrames']])
            finally:
                cpu.end()
            ref=next(r for r in source['rows'] if r['arm']==arm)
            phase=digest(json.dumps(result.pop('phaseLog'),separators=(',',':')))
            assert phase==ref['phaseSHA256'] and result['intervalFrames']==ref['intervalFrames'] and result['environment']==ref['environment'] and not errors
            result.update(arm=arm,phaseSHA256=phase,distribution=distribution(result['intervals']),cpu=[cpu.rows[0],cpu.rows[-1]])
            observed['rows'].append(result)
            save(args.out,observed)
        b.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',default='http://127.0.0.1:8461/game');p.add_argument('--record',type=Path,required=True)
    p.add_argument('--poses',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--order',default=','.join(ARMS));run(p.parse_args())
