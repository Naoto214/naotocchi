"""Validate the complete CI live-scene benchmark and export all 2,600 measurements."""
import argparse
import csv
import json
import hashlib
import re
import subprocess
from functools import lru_cache
from pathlib import Path

from verify_performance import REGIONS, STANDARD_WIDTHS, fingerprint


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# Evaluate each source module once. Send unique hint vectors back to Python so
# the digest uses the exact same JSON serialization as the browser-grid driver.
BULK_HINTS = """
const [file,config]=process.argv.slice(1), api=require(file), opts=JSON.parse(config);
const nav={valid:()=>true,project:p=>p,initialPoint:i=>['V2',i]};
const unique=[], index=new Map(), rows=[];
for (const region of opts.regions) for (const [w,h] of opts.phones) for(const count of [1,4,10,20,28]) {
  for(const extra of [0,5,10,15,20]) for(const layout of ['fixed','optimized']) {
    const n=api.withOpeningSeats(nav,{region},w,h,'?extra='+extra+'&layout='+layout);
    const hints=Array.from({length:count},(_,i)=>n.initialPoint(i,count)), sig=JSON.stringify(hints);
    if(!index.has(sig)){index.set(sig,unique.length);unique.push(hints);}
    rows.push([region,w,count,extra,layout,index.get(sig)]);
  }
}
process.stdout.write(JSON.stringify({unique,rows}));
"""


@lru_cache(maxsize=None)
def all_candidates(module):
    config={'regions':REGIONS,'phones':[(w,h-52) for w,h in STANDARD_WIDTHS.items()]}
    packed=json.loads(subprocess.check_output(['node','-e',BULK_HINTS,str(module.resolve()),json.dumps(config)]))
    values=[fingerprint(hints) for hints in packed['unique']]
    result={}
    for region,width,count,extra,layout,index in packed['rows']:
        result.setdefault((region,width,count),{})[extra,layout]=values[index]
    return result


def solver_source(module):
    text=module.read_text()
    match=re.search(r'^  const openings = (\{.*?^  \});\n',text,flags=re.MULTILINE|re.DOTALL)
    if not match or text.count('  const openings = ')!=1:
        raise ValueError('Unrecognized authored-openings declaration in '+str(module))
    # Convert just unquoted data keys and trailing commas; reject executable
    # expressions, functions or other statements inside the authored object.
    body=re.sub(r'([{,]\s*)([A-Za-z0-9_]+)\s*:',r'\1"\2":',match[1])
    json.loads(re.sub(r',(\s*[}\]])',r'\1',body))
    tail=text[match.end():]
    marker='  Object.assign(openings,'
    if tail.startswith(marker):
        line,newline,tail=tail.partition('\n')
        if not newline or not line.endswith(');'):
            raise ValueError('Unrecognized authored wide-screen data in '+str(module))
        extra=json.loads(line[len(marker):-2])
        if not isinstance(extra,dict):
            raise ValueError('Wide-screen hints must be an object')
    stripped=text[:match.start()]+'  const openings = {};\n'+tail
    return stripped


def collect(root, target, partial=False, release_game=None, compatible=(), supplements=()):
    by_case, priority, changed={}, {}, set()
    module=release_game/'limit-seating.js' if release_game else None
    if release_game and not module.is_file():
        release_game=release_game/'game'
        module=release_game/'limit-seating.js'
    approved=digest(module) if module else None
    sources={digest(p):p.resolve() for p in compatible}
    if module:
        for old in sources.values():
            if solver_source(old)!=solver_source(module):
                raise ValueError('Non-map differences in seating logic: '+str(old))
    files=[(rank,p) for rank,directory in enumerate([root,*supplements])
           for p in sorted(directory.rglob('perf-*.json'))]
    for rank,path in files:
        data=json.loads(path.read_text())
        rows=data.get('rows',[])
        if 'groups' not in data or not rows or 'openingHints' not in rows[0]:
            continue
        region,width,count=data['region'],data['width'],data['count']
        assert region in REGIONS and width in STANDARD_WIDTHS and count in (1,4,10,20,28),path
        tested=data['sources']['limit-seating.js']
        if module:
            for gamefile in ('home-production-model.js','home-production-diorama-limit.js','home-production-world-limit.mjs'):
                if data['sources'][gamefile]!=digest(release_game/gamefile):
                    raise ValueError('Native model/controller/renderer differs for '+str(path))
            if tested!=approved and tested not in sources:
                raise ValueError('Supply tested module with --compatible-seating for '+tested)
            release_hints=all_candidates(module)[region,width,count]
            original_hints=all_candidates(sources[tested])[region,width,count] if tested!=approved else release_hints
        groups={g['openingHints']:g for g in data['groups']}
        expected={(n,l) for n in (0,5,10,15,20) for l in ('fixed','optimized')}
        if rank>0 and 'requestedCases' in data:
            expected={tuple(case) for case in data['requestedCases']}
        actual={(r['extra'],r['layout']) for r in rows}
        assert actual==expected and len(rows)==len(expected),path
        for row in rows:
            layout,extra=row['layout'],row['extra']
            assert layout in ('fixed','optimized') and extra in (0,5,10,15,20)
            group=groups[row['openingHints']]
            assert [extra,layout] in group['equivalentCases']
            assert row['sameNodes'] and row['rows']==count and row['pausedSec']==0 and row['callbacks']>0
            assert row['phases']['actors']['calls']>0 and row['seconds']>0
            key=(region,width,count,extra,layout)
            if module:
                case=(extra,layout)
                if original_hints[case]!=row['openingHints']:
                    raise ValueError(f'Tested hints do not match their source for {key}')
                if release_hints[case]!=row['openingHints']:
                    changed.add(key)
                    continue
            weight=(int(tested==approved) if module else 1,rank)
            if key in priority and weight==priority[key]:
                raise ValueError(f'Duplicate case {key} in the same source tier')
            if key in priority and weight<priority[key]:
                continue
            priority[key]=weight
            by_case[key]=dict(region=region,width_css_px=width,count=count,extra_percent=extra,layout=layout,
                native_pose=group['nativeStartPose'],opening_hints=row['openingHints'],run_order_in_pose=row['order'],
                seconds=row['seconds'],raf_samples=row['callbacks'],raf_hz=row['rafHz'],
                gap_p95_ms=row['p95'],gap_max_ms=row['max'],gaps_over_250ms=row['gaps250ms'],
                model_seconds=row['clock'],walking_model_seconds=row['walkingModelSec'],
                model_distance=row['distance'],moves=row['moves'],
                resident_updates=row['phases']['model']['calls'],resident_mean_ms=row['phases']['model']['meanMs'],
                route_calls=row['phases']['plan']['calls'],route_mean_ms=row['phases']['plan']['meanMs'],
                route_max_ms=row['phases']['plan']['maxMs'],resident_paint_calls=row['phases']['actors']['calls'],
                resident_paint_mean_ms=row['phases']['actors']['meanMs'],background_mean_ms=row['phases']['world']['meanMs'],
                environment_mean_ms=row['phases']['nature']['meanMs'],browser=data['version'],run_host=data['host'],
                seating_source=tested,release_seating_source=approved,
                case_verification=('same_source' if tested==approved else 'same_hints_and_solver') if module else 'uncompared')
    if not by_case or (not partial and len(by_case)!=2600):
        raise ValueError(f'{len(by_case)}/2600 cases found. Changed hints to remeasure: {sorted(changed-set(by_case))[:24]}')
    target.parent.mkdir(parents=True,exist_ok=True)
    tmp=target.with_suffix('.part')
    with tmp.open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=next(iter(by_case.values())).keys(),lineterminator='\n')
        writer.writeheader()
        for key in sorted(by_case):
            record=by_case[key]
            writer.writerow({k:(round(v,4) if isinstance(v,float) else v) for k,v in record.items()})
    tmp.replace(target)
    print(f'{len(by_case)} live windows exported')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('root',type=Path)
    p.add_argument('out',type=Path)
    p.add_argument('--partial',action='store_true')
    p.add_argument('--release-game',type=Path,help='Compare candidates and native sources with this final game directory')
    p.add_argument('--compatible-seating',type=Path,action='append',default=[],help='Prior tested module whose authored data alone may differ')
    p.add_argument('--supplement',type=Path,action='append',default=[],help='Directory with targeted fresh real-browser measurements')
    args=p.parse_args()
    collect(args.root,args.out,args.partial,args.release_game,args.compatible_seating,args.supplement)
