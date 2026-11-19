"""Combine the 2,600 tested size/layout conditions and their native-geometry evidence."""
import argparse
import hashlib
import json
import math
import os
import tempfile
from pathlib import Path
from geometry_collect import BASE,REGIONS,HEIGHTS
from geometry_optimized import modes
from geometry_matrix import COLUMNS,EXTRAS,compare,read_phases


def write(path,data):
    path.parent.mkdir(exist_ok=True,parents=True)
    with tempfile.NamedTemporaryFile(mode='w',encoding='utf8',dir=path.parent,delete=False) as f:
        f.write(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
        name=f.name
    os.replace(name,path)


def motion(frame, opening):
    stats=frame['modelStats']; events=frame.get('events',{})
    moved=sum(math.dist(a['native'][:2],b['native'][:2])>=1 for a,b in zip(opening['actors'],frame['actors']))
    # Movement model exposes aggregate distance/moves and emitted arrivals. It
    # does not expose a collision-avoidance counter; no value is inferred here.
    return [round(stats['clock'],2),moved,round(stats['distance'],2),stats['moves'],events.get('arrive',0),events.get('social',0)]


def anchors(frame,extra):
    roles={a['kind']:a for a in frame['actors'] if a['kind']!='companion'}
    gear=frame.get('gear',{})
    a=gear.get('0',[]);b=gear.get(str(extra),[])
    error=0
    roles_in_dom=['pet' if name=='petAccessory' else 'partner' for name,_ in frame.get('equipment',[])]
    for r,g0,g1 in zip(roles_in_dom,a,b):
        foot=roles[r]['foot']
        for i in range(4):
            base=g0[i]-(foot[i] if i<2 else 0)
            grown=g1[i]-(foot[i] if i<2 else 0)
            error=max(error,abs(grown-base*(1+extra/100)))
    shadow_missing=sum(v.get('shadow') is None for v in frame['actors'])
    return [len(a),round(error,3),shadow_missing]


def projected_phases(dump,game,extras):
    values={}
    for extra in extras:
        phase_metrics=values[str(extra)]={}
        for tag,phase in read_phases(dump):
            phase_metrics[tag]=compare(phase,extra,game)
            phase_metrics.setdefault('anchors',{})[tag]=anchors(phase,extra)
    return values


def summarize(args):
    table=modes(args.game)
    expected_hints=modes(args.game,hints=True)
    algorithm=hashlib.sha256((BASE/'geometry_matrix.py').read_bytes()+(BASE/'geometry_digest.py').read_bytes()).hexdigest()[:12]
    if args.cache:args.cache.mkdir(parents=True,exist_ok=True)
    expected=len(HEIGHTS)*len(REGIONS)*5*len(EXTRAS)*2
    cases={};trajectories={};provenance={};missing=[];patch_differences=[]
    mode_keys={}
    for count in (28,20,10,4,1):
        for w in HEIGHTS:
            for region in REGIONS:
                name=f'{w}-{region}-{count}'
                labels=table[name]
                fixed_file=args.fixed/(name+'.json')
                if not fixed_file.exists():
                    missing.append(name+'/fixed')
                    continue
                raw=json.loads(fixed_file.read_text())
                if not raw.get('moved'):
                    missing.append(name+'/fixed')
                    continue
                captures={0:raw};calculated={}
                for representative in set(labels.values())-{0}:
                    fn=args.optimized/str(representative)/(name+'.json')
                    if fn.exists():
                        cand=json.loads(fn.read_text())
                        if cand.get('moved') and cand.get('hints')==expected_hints[name][str(representative)]:
                            captures[representative]=cand
                    if representative not in captures:
                        missing.append(f'{name}/optimized+{representative}')
                for representative,dump in captures.items():
                    for _,phase in read_phases(dump):phase['p']['region']=region
                    shared=f'{w}/{region}/{count}/'+('fixed' if representative==0 else f'optimized+{representative}')
                    provenance[shared]={'chrome':dump.get('browser','unspecified'),'origin':dump.get('qaOrigin','GitHub Actions')}
                    if representative and dump.get('browser')!=raw.get('browser'):
                        patch_differences.append({'trajectory':shared,'fixed':raw.get('browser'),'optimized':dump.get('browser')})
                    trajectories[shared]={tag:motion(phase,dump) for tag,phase in read_phases(dump)}
                    extras=[x for x in EXTRAS if not representative or labels[str(x)]==representative]
                    cache=None
                    if args.cache:
                        identity=json.dumps([dump,extras],separators=(',',':')).encode()
                        digest=hashlib.sha256(identity).hexdigest()[:20]
                        cache=args.cache/f'{algorithm}-{digest}.json'
                    if cache and cache.exists():
                        metrics=json.loads(cache.read_text())
                    else:
                        metrics=projected_phases(dump,args.game,extras)
                        if cache:write(cache,metrics)
                    for extra in extras:calculated[representative,extra]=metrics[str(extra)]
                for extra in EXTRAS:
                    for layout,representative in [('fixed',0),('optimized',labels[str(extra)])]:
                        if (representative,extra) not in calculated:continue
                        key=f'{w}/{region}/{count}/{layout}/{extra}'
                        cases[key]=calculated[representative,extra]
                        mode_keys[key]='fixed' if not representative else f'optimized+{representative}'
    d={'measure':'Projected source alpha >=96/255 at DPR 2 and CSS sampling. Pair >=4 overlapping CSS pixels. Clip tolerance 1 CSS px. Heights exclude equipment and shadow. See independent raster calibration.',
       'columns':COLUMNS,'anchorColumns':['attachments','maxGearScaleErrorCssPx','shadowsMissing'],'expected':expected,
       'complete':len(cases),'missingNativeOpenings':missing,'cases':cases}
    write(args.out/'geometry-matrix.json',d)
    write(args.out/'geometry-motion.json',{'columns':['modelSeconds','actorsMovedAtLeastOneNativeUnit','accumulatedNativeDistance','moves','arrivals','social'],
       'states':trajectories,'browserByTrajectory':provenance,'fixedOptimizedPatchDifferences':patch_differences,'layoutEquivalence':mode_keys})
    print(len(cases),'/',expected,'conditions;',len(trajectories),'native trajectory groups;',len(missing),'missing')
    if missing and not args.partial:raise SystemExit(1)


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    for k in ('fixed','optimized','game','out'):cli.add_argument(k,type=Path)
    cli.add_argument('--partial',action='store_true');cli.add_argument('--cache',type=Path);summarize(cli.parse_args())
