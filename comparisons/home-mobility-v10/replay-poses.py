"""Replay preserved position bytes directly, without selecting intervals from a new game."""
import argparse
import gzip
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import ARMS,HERE,WPE,clock,digest,distribution,load,native_page,save

fixed = load('active_fixed', HERE/'performance-fixed.py')
INSTALL = '''
// Preserve the real native keyframes on the target(s) present at the first
// archived sample. The original archive records target, animation and phase.
const introAttempts=[];
fixedCast.introAttempts=introAttempts;
fixedCast.matchNativeIntro=({targets:expected,controlled})=>{
  const effects=stage.getAnimations({subtree:true}).filter(a=>!a.animationName&&!a.transitionProperty);
  const actual=effects.map(fixedEffectName).sort();
  if(controlled&&!introAttempts.some(a=>a.presented)){
    if(actual.length||stage.dataset.dioramaPaused==='true'||expected.length!==1)return false;
    const prior=introAttempts[introAttempts.length-1];
    if(prior&&performance.now()-prior.wallMs<1200)return false;
    const key=expected[0].split('/')[0],wallMs=performance.now();
    const accepted=mobilityPerf.live.select(key);
    const presented=stage.getAnimations({subtree:true}).some(a=>fixedEffectName(a)===expected[0]);
    introAttempts.push({key,wallMs,accepted,presented});
    return false;
  }
  if(JSON.stringify(actual)!==JSON.stringify(expected))return false;
  for(const a of effects)a.pause();
  window.holdGameTasks=true;
  return true;
};
fixedCast.readRecipes=()=>stage.getAnimations({subtree:true})
  .filter(a=>!a.animationName&&!a.transitionProperty)
  .map(a=>({target:fixedEffectName(a),reaction:a.effect.target.dataset.reaction||null,
    frames:a.effect.getKeyframes(),timing:a.effect.getTiming()})).sort((a,b)=>a.target.localeCompare(b.target));
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
    phase_path=args.phases or args.poses.with_name(args.poses.name.replace('active-poses','active-animation-phases'))
    archive_phases=read(phase_path)
    fingerprint_phases=digest(json.dumps(archive_phases,separators=(',',':')))
    assert all(r['phaseSHA256']==fingerprint_phases for r in source['rows'])
    initial_effects=sorted(x.rsplit('@',1)[0] for x in archive_phases[0].split('|') if '/animation@' in x)
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
        # A newly opened home can be part-way through an unrelated resident's
        # idle reaction. Wait for the real game to reach this archived target set.
        # Its full native recipe is independently retained for all six arms.
        page.evaluate('HomeCastTrial.apply({paused:false});0')
        page.wait_for_function('expected=>fixedCast.matchNativeIntro(expected)',arg=dict(targets=initial_effects,controlled=args.prepare_gesture),timeout=720000)
        recipes=page.evaluate('fixedCast.readRecipes()')
        observed['nativeIntro']=dict(targets=initial_effects,recipes=recipes,
            historicalKeyframesRecorded=False,setupAttempts=page.evaluate('fixedCast.introAttempts'),
            method=('Trigger the archived resident through native model selection while the natural home is unblocked, then hold the observed native gesture before the 28-foot reset' if args.prepare_gesture else 'Wait for the native home to present the archived target set, then hold its live animation'))
        page.evaluate('a=>fixedCast.loadReference(a)',dict(initial=source['fixture']['initial'],data=frame_data,clip=source['fixture']['clipSize']))
        assert page.evaluate('mobilityPerf.live.selected()===null'), 'Preparatory selection survived the complete roster reset'
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
            phases=result.pop('phaseLog');phase=digest(json.dumps(phases,separators=(',',':')))
            observed_recipes=page.evaluate('fixedCast.readRecipes()')
            mismatch=[(i,original,now) for i,(original,now) in enumerate(zip(archive_phases,phases)) if original!=now]
            assert phase==ref['phaseSHA256'],(arm,'phase',mismatch[:2])
            assert result['intervalFrames']==ref['intervalFrames'],(arm,'frame indices')
            assert result['environment']==ref['environment'],(arm,'environment timestamps/draw counts')
            assert observed_recipes==recipes and not errors,(arm,'native keyframes/timing',observed_recipes,recipes,errors)
            result['nativeRecipeSHA256']=digest(json.dumps(recipes,separators=(',',':')))
            result.update(arm=arm,phaseSHA256=phase,distribution=distribution(result['intervals']),cpu=[cpu.rows[0],cpu.rows[-1]])
            observed['rows'].append(result)
            save(args.out,observed)
        b.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',default='http://127.0.0.1:8461/game');p.add_argument('--record',type=Path,required=True)
    p.add_argument('--poses',type=Path,required=True);p.add_argument('--phases',type=Path,help='Phase record, defaults to the sibling archive');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--prepare-gesture',action='store_true',help='Recreate the archived active resident using its genuine selection gesture before reset and preheating')
    p.add_argument('--order',default=','.join(ARMS));run(p.parse_args())
