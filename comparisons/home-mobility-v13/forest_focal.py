"""Resolve fine escape directions for tanuki, panda and box in observed 320px households."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
from forest_results import HERE, FOCUS, prior, verify

spec = importlib.util.spec_from_file_location('resolved_forest_rays', HERE.parent/'home-mobility-v9/forest_rays.py')
rays = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rays)
from forest_layout import forest_url


def spans(headings):
    ranges = []
    for degree in headings:
        if ranges and degree == ranges[-1][1]+.5:
            ranges[-1][1] = degree
        else:
            ranges.append([degree,degree])
    return ranges


def audit(args):
    # 720 headings include both V12's multiples of 7.5 degrees and whole degrees.
    code = rays.PROBE
    for old,new in [('[3,4,5,6,8,12,18,24]','[3,8,16]'),('i<48','i<720'),('i*Math.PI/24','i*Math.PI/360'),('i*7.5','i*.5')]:
        assert old in code
        code=code.replace(old,new)
    scanner = hashlib.sha256(code.encode()).hexdigest()
    results = []
    cached = {}
    if args.previous:
        previous = json.loads(args.previous.read_bytes())
        assert previous['scanner'] == scanner and previous['headings'] == 720
        for row in previous['observations']:
            cached.setdefault(row['case'], []).append(row)
    with sync_playwright() as api:
        browser = api.chromium.launch(executable_path=args.chromium)
        current = {f.parent.name:f for f in args.path.glob('320-*/receipt.json')}
        if args.controls:
            for f in args.controls.glob('320-*-v13-a/receipt.json'):
                current.setdefault(f.parent.name,f)
        for f in [current[k] for k in sorted(current)]:
            case=f.parent
            rec=verify(case)
            data=prior.v9.load(case/'forest28.json.gz')
            name='home-production-model-mobility-'+data['arm']+'.js'
            src=data['sources'][name]['source']
            existing = cached.get(case.name)
            if existing:
                assert {(r['phase'],r['key']) for r in existing} == {(p,k) for p in ('opening','endpoint') for k in FOCUS[1:]}
                assert len(existing)==6 and all(r['workflowArtifact']==rec['artifact'] and r['originalModelSHA256']==src for r in existing)
                results.extend(existing)
                continue
            ctx=browser.new_context(viewport={'width':320,'height':792},device_scale_factor=2,
                has_touch=True,is_mobile=True,timezone_id='Asia/Tokyo',locale='ja-JP')
            page=ctx.new_page()
            def inject(route):
                response=route.fetch()
                native=response.text()
                assert hashlib.sha256(native.encode()).hexdigest()==src
                anchor='    return {metrics:'
                assert native.count(anchor)==1
                route.fulfill(response=response,body=native.replace(anchor,code+anchor))
            page.route(re.compile('/'+re.escape(name)+r'(?:\?|$)'),inject)
            page.goto(forest_url(args.url,data['arm']),wait_until='domcontentloaded')
            page.wait_for_function("HomeCastTrial?.ready && HomeDragTrial.opening() && typeof forestRays==='function'",timeout=120000)
            proj=page.evaluate("performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/(?:home-production-world|home-visible-ground-navigation)[^/]*[.]mjs/.test(n))")
            verified={}
            for href in proj:
                url=href.split('?')[0].split('/')[-1]
                verified[url]=hashlib.sha256(page.request.get(href).body()).hexdigest()
            assert all(verified.get(k)==v for k,v in data.get('projectionSources',{}).items())
            coarse={(s['phase'],s['key']):s['geometry'] for s in prior.v9.load(case/'directions.json.gz')['observations'] if s['phase']!='refusal'}
            for phase,actors in [('opening',data['initial']['actors']),('endpoint',data['baseline']['residents'])]:
                feet=[[a[k] for k in ('key','x','y','w','h')] for a in actors]
                values=page.evaluate('cases=>forestRays(cases)',[dict(key=k,feet=feet) for k in FOCUS[1:]])
                for g in values:
                    k=g['key']
                    areas={}
                    for val in ('3','8','16'):
                        directions=g['reachable'][val]
                        other=coarse[phase,k]['reachable'].get(val)
                        if other is not None:
                            assert other==[d for d in directions if (d*2)%15==0], (case,phase,k,val)
                        areas[val] = dict(safeHeadings=len(directions),rangesDegrees=spans(directions),
                            terrainAndVisibilityHeadings=g['terrain'][val],boundsHeadings=g['boundsHeading'][val])
                    results.append(dict(case=case.name,phase=phase,clock=0 if phase=='opening' else data['baseline']['modelSeconds'],
                        key=k,foot=next(a[1:] for a in feet if a[0]==k),contacts=g['contacts'],distances=areas,
                        originalModelSHA256=src,projection=verified,workflowArtifact=rec['artifact']))
            ctx.close()
        browser.close()
    args.out.write_text(json.dumps(dict(stepDegrees=.5,headings=720,scanner=scanner,
        observations=results),ensure_ascii=False,separators=(',',':'))+'\n')
    print(len(results),'fine-heading focal observations')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path',type=Path)
    parser.add_argument('out',type=Path)
    parser.add_argument('--url',required=True)
    parser.add_argument('--controls',type=Path,help='Supply the independent unchanged A cases from the original run.')
    parser.add_argument('--previous',type=Path,help='Reuse the identical scanner and certified case artifact for a partial high-resolution audit.')
    parser.add_argument('--chromium',default='/usr/bin/chromium')
    audit(parser.parse_args())
