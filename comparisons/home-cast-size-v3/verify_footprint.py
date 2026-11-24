"""Measure projected foot limits, occupied feet and visible body area in fixed native fixtures."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

from geometry_matrix import EXTRAS, body_mask, screen_polygons


REGIONS = {
    'home':'おうち', 'forest':'もり', 'river_lake':'みずべ', 'city':'とかい',
    'countryside':'いなか', 'mountain':'やま', 'snow':'ゆきぐに', 'sea':'うみ',
    'jungle':'ジャングル', 'desert':'さばく', 'deepsea':'しんかい',
    'star_stop':'ほしぞらのていりゅうじょ', 'memory_lake':'きおくのみずうみ',
}
HEIGHTS = {320:516, 375:760, 390:792, 430:880}
COUNTS = [1,4,10,20,28]


def intersect(a, b):
    rect = max(a[0],b[0]), max(a[1],b[1]), min(a[2],b[2]), min(a[3],b[3])
    return rect if rect[0] < rect[2] and rect[1] < rect[3] else None


def envelope(rectangles):
    return [min(r[0] for r in rectangles), min(r[1] for r in rectangles),
            max(r[2] for r in rectangles), max(r[3] for r in rectangles)]


def union_area(rectangles):
    """Exact area of the union of axis-aligned rectangles."""
    xs = sorted({x for r in rectangles for x in (r[0],r[2])})
    area = 0.0
    for x0, x1 in zip(xs,xs[1:]):
        intervals = sorted((t,b) for l,t,r,b in rectangles if l < x1 and r > x0)
        end = -float('inf')
        for top, bottom in intervals:
            if bottom > end:
                area += (x1-x0) * (bottom-max(end,top))
                end = bottom
    return area


def project_bounds(actor, sx, sy):
    x, y = actor['native'][:2]
    fx, fy = actor['foot']
    b = actor['bounds']
    return [fx+(b['left']-x)*sx, fy+(b['top']-y)*sy,
            fx+(b['right']-x)*sx, fy+(b['bottom']-y)*sy]


def foot_extent(phase):
    feet = [a['foot'] for a in phase['actors']]
    return rounded([min(x for x,y in feet), min(y for x,y in feet),
                    max(x for x,y in feet), max(y for x,y in feet)])


def rounded(values):
    return [round(float(value),2) for value in values]


def measure(fixture, region, game):
    p = fixture['p']
    w, h = p['viewport']
    sx, sy = p['sx'], p['sy']
    x, y, dw, dh = p['clip']
    clip = intersect((x,y,x+dw,y+dh), (0,0,w,h))
    assert clip and sx > 0 and sy > 0
    rectangles = []
    hero = None
    for actor in fixture['actors']:
        box = intersect(project_bounds(actor,sx,sy), clip)
        # A visible foot on the actual stage must project using the camera we recorded.
        nx, ny = actor['native'][:2]
        fx, fy = actor['foot']
        assert abs(p['stage'][0]+nx*sx-fx)<.02 and abs(p['stage'][1]+ny*sy-fy)<.02
        if box:
            rectangles.append(box)
        if actor['kind'] == 'pet':
            hero = box
    assert hero and rectangles
    observed = {'initial':foot_extent(fixture), 'after8':foot_extent(fixture['moved'])}
    if 'later' in fixture:
        observed['after30'] = foot_extent(fixture['later'])

    # Reuse the published matrix's alpha threshold, foreground masks and clip.
    # Unioning the silhouettes counts a pixel only once when residents overlap.
    polygons = screen_polygons(game, {**fixture, 'p':{**p, 'region':region}})
    ink_percent = []
    for extra in EXTRAS:
        visible = np.zeros((h,w), dtype=bool)
        for actor in fixture['actors']:
            (left,top,right,bottom), mask, _ = body_mask(actor,1+extra/100,game,clip,polygons)
            x0,y0,x1,y1 = max(0,left),max(0,top),min(w,right),min(h,bottom)
            if x0<x1 and y0<y1:
                visible[y0:y1,x0:x1] |= mask[y0-top:y1-top,x0-left:x1-left]
        ink_percent.append(round(100 * np.count_nonzero(visible) / (w*h),3))
    return {
        'cameraXY':[round(sx,5), round(sy,5)], 'clip':rounded(clip),
        'clipPct':round(100*(clip[2]-clip[0])*(clip[3]-clip[1])/(w*h),3),
        'heroBounds':rounded(hero), 'allBoundsEnvelope':rounded(envelope(rectangles)),
        'allBoundsUnionPct':round(100*union_area(rectangles)/(w*h),3),
        'footExtents':observed, 'bodyUnionPct':ink_percent,
    }


def table(cases):
    def band(rect):
        return f'{rect[1]:.0f}–{rect[3]:.0f}'
    print('| 地域 | 320幅　上限帯 / 実際の足元 | 390幅　上限帯 / 実際の足元 | 本体の面積率　320幅 | 本体の面積率　390幅 |')
    print('|---|---|---|---|---|')
    for region, label in REGIONS.items():
        if any(f'{w}/{region}/28' not in cases for w in [320,390]):
            continue
        left, right = [cases[f'{w}/{region}/28'] for w in [320,390]]
        def entry(case):
            return f'{band(case["allBoundsEnvelope"])} / {band(case["footExtents"]["initial"])}'
        def ink(case):
            values = case['bodyUnionPct']
            return f'{values[0]:.1f}% → {values[-1]:.1f}%'
        print(f'| {label} | {entry(left)} | {entry(right)} | {ink(left)} | {ink(right)} |')


def run(args):
    cases = {}
    missing = []
    raised_entry_gains = {}
    digest = hashlib.sha256()
    browsers = set()
    for w,h in HEIGHTS.items():
        for region in REGIONS:
            for count in COUNTS:
                name = f'{w}-{region}-{count}.json'
                path = args.fixed/name
                if not path.is_file():
                    missing.append(name)
                    continue
                raw = path.read_bytes()
                d = json.loads(raw)
                if 'moved' not in d or (count==28 and 'later' not in d):
                    missing.append(name)
                    continue
                opening = d.get('opening', {})
                entry_gain = opening.get('extra',0)
                assert opening.get('layout','fixed')=='fixed' and entry_gain in EXTRAS, name
                # The paired tall-phone controls can launch at +20. The collector
                # resets the visible gain to zero before recording frames and feet.
                if entry_gain:
                    raised_entry_gains[f'{w}/{region}/{count}'] = entry_gain
                assert d['p']['viewport']==[w,h] and d['p'].get('region',region)==region, name
                assert len(d['actors'])==count and len({a['key'] for a in d['actors']})==count, name
                digest.update(name.encode()+b'\0'+raw)
                browsers.add(d.get('browser','Chromium (earlier capture omitted build string)'))
                cases[f'{w}/{region}/{count}'] = measure(d,region,args.game)
    if missing and not args.partial:
        raise SystemExit(f'Missing {len(missing)} complete native fixed captures; first is {missing[0]}')
    grid = json.loads(args.ground.read_text())
    measured_grid = {}
    for key,row in grid['rows'].items():
        measured_grid[key] = {
            'legal':row['legal'], 'total':row['total'],
            'legalSamplePct':round(100*row['legal']/row['total'],3),
            'firstAndLastLegalY':[row['minY'],row['maxY']],
        }
    result = {
        'completeFixtures':len(cases), 'expectedFixtures':260, 'browsers':sorted(browsers),
        'fixedFixtureSha256':digest.hexdigest(), 'viewportWidthToGameHeight':HEIGHTS,
        'rectUnits':'CSS px, [left,top,right,bottom], relative to game iframe',
        'modelBounds':'Native per-resident limits projected through the measured camera, intersected with the screen-frame clip and viewport. Necessary limits only.',
        'bodyUnion':'Projected character alpha >=96/255, foreground and frame clipped, unique CSS pixels as percent of the full game iframe; excludes equipment, shadows and decorations.',
        'gains':list(EXTRAS), 'gridStepCssPx':grid['gridCSSpx'],
        'positiveGainFixedEntryLinks':raised_entry_gains, 'nativeCaptureGain':0,
        'gridTests':'Protagonist bounds, navigation.valid, scene.visible; no other-resident clearance or route test.',
        'grid':measured_grid, 'cases':cases,
    }
    if missing:
        result['missing'] = missing
    args.out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f'{len(cases)} / 260 fixed captures, {len(measured_grid)} traversability grids')
    if args.table:
        table(cases)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fixed',type=Path,required=True)
    p.add_argument('--game',type=Path,required=True)
    p.add_argument('--ground',type=Path,default=Path(__file__).parent/'evidence/ground.json')
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--partial',action='store_true')
    p.add_argument('--table',action='store_true')
    run(p.parse_args())
