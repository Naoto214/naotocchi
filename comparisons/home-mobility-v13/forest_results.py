"""Reproduce all per-resident V13 measurements from the official raw ZIP archives."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import zipfile

HERE = Path(__file__).resolve().parent
V12 = HERE.parent / 'home-mobility-v12'
spec = importlib.util.spec_from_file_location('previous_forest_results', V12 / 'forest_results.py')
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)
from forest_collect import digest, write_csv

PROFILES = ['320-214-0-fixed-1','320-214-0-reference-1','375-937-0-fixed-1','390-214-0-fixed-1','430-214-0-reference-1']
POLICIES = ['v11-foot','v12','v13-a','v13-b','v13-c','v13-d','v13-d-curve']
FOCUS = ['pet:dog', 'companion:tanuki', 'companion:panda', 'companion:box']


def json_file(path):
    return json.loads(path.read_bytes())


def verify(case):
    receipt = json_file(case / 'receipt.json')
    assert receipt['complete'] and receipt['case'] == case.name
    archive = case / 'runner.zip'
    assert prior.v9.sha(archive) == receipt['sha256'] and archive.stat().st_size == receipt['bytes']
    official = json_file(case.parent / 'github-artifacts.json')['artifacts']
    record = next(x for x in official if x['id'] == receipt['artifact'])
    assert record['digest'] == 'sha256:' + receipt['sha256']
    assert record['workflow_run']['head_sha'] == receipt['commit'] and record['workflow_run']['id'] == receipt['run']
    with zipfile.ZipFile(archive) as zipped:
        assert set(zipped.namelist()) == set(receipt['files'])
        for name in zipped.namelist():
            assert zipped.read(name) == (case / name).read_bytes(), (case, name)
    return {k: receipt[k] for k in ('case','run','artifact','commit','sha256','bytes')}


def geometry(d, observations):
    """Check observed opening/refusals/end. Hold focal foot & body constant for peer-only changes."""
    changes, ends = [], {}
    previous = {}
    def process(item):
        k, phase, g = item['key'], item['phase'], item['geometry']
        if phase == 'refusal':
            request = d['log']['requests'][item['request']]
            clock, feet = request['clock'], [r[:5] for r in request['peers']]
        else:
            clock, actors = ((0, d['initial']['actors']) if phase == 'opening' else
                (d['baseline']['modelSeconds'], d['baseline']['residents']))
            feet = [[a[n] for n in ('key','x','y','w','h')] for a in actors]
            ends[phase,k] = g
        own = next(r for r in feet if r[0] == k)
        previous_row = previous.get(k)
        if previous_row:
            when, old_feet, other_g = previous_row
            old_own = next(r for r in old_feet if r[0] == k)
            if own == old_own and old_feet != feet:
                for radius in ('3','8','16'):
                    if radius not in g['reachable'] or radius not in other_g['reachable']:
                        continue
                    before, after = len(other_g['reachable'][radius]), len(g['reachable'][radius])
                    if bool(before) == bool(after):
                        continue
                    if other_g['terrain'][radius] == g['terrain'][radius] and other_g['boundsHeading'][radius] == g['boundsHeading'][radius]:
                        others = [a[0] for a,b in zip(old_feet,feet,strict=True) if a != b]
                        changes.append(dict(key=k, start_s=round(when,3), end_s=round(clock,3),
                            radius_css=radius, from_headings=before, to_headings=after,
                            moved_peers=' '.join(others), x=own[1], y=own[2]))
        previous[k] = clock, feet, g
    for phase in ('opening', 'refusal', 'endpoint'):
        for item in observations:
            if item['phase'] == phase:
                process(item)
    return ends, changes


def collect(case, game=None):
    receipt = verify(case)
    _, _, _, _, _, policy = case.name.split('-', 5)
    profile = case.name.removesuffix('-'+policy)
    tape = case / 'forest28.json.gz'
    cell, people, _, replaced = prior.inspect(tape)
    assert not replaced and not cell['replaced_proposals']
    d = prior.v9.load(tape)
    if game:
        for name, hashes in d['sources'].items():
            path = next(p for p in (game/name, game/'beauty'/name) if p.is_file())
            assert prior.v9.sha(path) == hashes['source'], name
        for name, sha in d['projectionSources'].items():
            assert prior.v9.sha(game/name) == sha, name
    if policy != 'v11-foot':
        assert d['projectionSources']
    cell['projection_sources'] = d.get('projectionSources', {})
    cell['actor_bodies_sha256'] = digest([[a[k] for k in ('key','kind','w','h')] for a in d['initial']['actors']])
    cell['native_seed'] = d['initial']['seed']
    cell['gates'] = d['baseline']['gateReasons']
    events, per_actor = prior.attach_curves(d)
    walkers = [e for e in events if any(h['native_steps'] for h in e['helpers'])]
    cell.update(curve_searches=len(events), curve_plans=sum(e['found'] for e in events),
        curve_walked=len(walkers), assisted_owner_normals=sum(e['owner_strict_normal'] for e in walkers),
        blocked_above_180=sum(r['episodes_over_180'] for r in people))
    if policy in POLICIES[2:-1]:
        assert not events
    legs = prior.v9.legs(d)
    received = Counter(l['helper_for'] for l in legs if l['source']=='yield' and l['status']=='arrival' and l['finish_s']<=600)
    assert sum(received.values()) == sum(int(r['yields_performed']) for r in people)
    ends, changes = geometry(d, prior.v9.load(case / 'directions.json.gz')['observations'])
    assert cell['model_s'] >= 600 and cell['wall_s'] >= 600
    initial = {a['key']:a for a in d['initial']['actors']}
    end = {a['key']:a for a in d['baseline']['residents']}
    meta = dict(profile=profile, policy=policy)
    compact = []
    for r in people:
        k = r['key']
        r.update(meta, completed_help_received=received[k], drag_arrivals=r['opening_arrived']+r['aged_arrived'],
            drag_inputs=r['opening_trusted']+r['aged_trusted'])
        r.update({key: per_actor[k][key] for key in prior.CURVE_KEYS})
        for phase, prefix in [('opening','opening'),('endpoint','aged')]:
            g = ends[phase,k]
            if '16' in g['reachable']:
                r[prefix+'_16px_headings'] = len(g['reachable']['16'])
            r[prefix+'_contacts'] = len(g['contacts'])
            r[prefix+'_terrain_8px_directions'] = g['terrain']['8']
        p = {field:r[field] for field in ('key','first_half','second_half','actual_walk_distance_css','plans','requests',
            'longest_blocked_s','recovery_rate','yields_performed','completed_help_received','drag_arrivals','drag_inputs',
            'sync_foot_changes','opening_trusted','opening_arrived','aged_trusted','aged_arrived')}
        p['recovery_rate'] = float(p['recovery_rate']) if p['recovery_rate']!='' else ''
        for phase,prop in [('opening','openRays'),('aged','endRays')]:
            p[prop] = [r[phase+'_'+str(radius)+'px_headings'] for radius in (3,8,16)]
        p['start'] = [round(initial[k][s],4) for s in ('x','y')]
        p['end'] = [round(end[k][s],4) for s in ('x','y')]
        compact.append(p)
    for x in changes:
        x.update(meta)
    for event in events:
        event.update(meta)
    fixed = json_file(case/'fixed-summary.json') if policy.startswith('v13-') else None
    if fixed:
        assert fixed['arm'] == d['arm'] and fixed['openingSHA256'] == prior.v9.sha(case/'initial-checkpoint.json')
        assert fixed['seconds'] == 600 and set(fixed['perActor']) == set(initial)
        assert fixed['sources']['home-production-model-mobility-'+d['arm']+'.js'] == cell['model_source']
        trace = prior.v9.load(case / 'fixed-native.json.gz')
        payload = [trace['state'], *[trace['log'][k] for k in ('requests','motions','choices','budget','syncs')]]
        assert digest(payload) == fixed['physicalSHA256']
    return dict(**meta, cell=cell, people=compact, receipt=receipt, fixed=fixed), people, changes, walkers


def produce(args):
    frozen = json_file(V12/'evidence/forest-receipts.json')
    checks = {(r['case'],r['workflow_run']):r['sha256'] for r in frozen}
    homes, people, changes, plans = [], [], [], []
    inputs = {}
    for year, root in [('v12',args.archived),('v13',args.raw)]:
        for f in root.glob('[0-9]*/*/receipt.json'):
            receipt = json_file(f)
            if not receipt['complete']:
                continue
            if year == 'v12' and checks.get((receipt['case'],receipt['run'])) != receipt['sha256']:
                continue
            policy = receipt['case'].split('-',5)[-1]
            if policy not in POLICIES or (year=='v12' and receipt['run'] not in (44991773760,44994820432)):
                continue
            if year=='v13' and args.run and receipt['run'] != args.run:
                continue
            key = receipt['case']
            if key in inputs:
                raise ValueError(f'Specify the candidate run to choose repeated {key}')
            inputs[key] = f.parent
    for case in sorted(inputs.values(), key=lambda p: p.name):
        home, rows, movement, curves = collect(case, args.game if 'v13-' in case.name else None)
        homes.append(home); people.extend(rows); changes.extend(movement); plans.extend(curves)
    groups = defaultdict(dict)
    for home in homes:
        groups[home['profile']][home['policy']] = home
    profiles = PROFILES + sorted(set(groups)-set(PROFILES))
    complete = all(set(groups[p]) == set(POLICIES) for p in PROFILES)
    if not args.partial:
        assert complete and sum(h['policy'].startswith('v13') for h in homes)==25
    for group in groups.values():
        assert len({h['cell']['actor_bodies_sha256'] for h in group.values()})==1
        assert len({h['cell']['native_seed'] for h in group.values()})==1
        if all(k in group for k in ('v13-d','v13-d-curve')):
            assert group['v13-d']['cell']['initial_sha256'] == group['v13-d-curve']['cell']['initial_sha256']
    homes.sort(key=lambda h:(profiles.index(h['profile']), POLICIES.index(h['policy'])))
    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    actors = dict(re.findall(r"id: '([\w]+)', label: '([^']+)'", (HERE.parents[1]/'character-world-master.v1.js').read_text()))
    names = {r['key']:{'pet':'主人公の','partner':'恋人の'}.get(r['key'].split(':')[0],'')+actors[r['key'].split(':')[1]] for r in people}
    write_csv(out/'forest-residents.csv', people)
    write_csv(out/'forest-peer-changes.csv', changes)
    for name,value in [('forest-summary',dict(profiles=[p for p in profiles if groups[p]],names=names,homes=homes)),('forest-curve-handoffs',plans)]:
        (out/(name+'.json')).write_text(json.dumps(value, ensure_ascii=False, separators=(',',':'))+'\n')
    print(len(homes),'households,',len(people),'residents,',len(changes),'same-foot opening or closing observations')
    return homes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('raw','archived','out'):
        parser.add_argument(key, type=Path)
    parser.add_argument('--run', type=int)
    parser.add_argument('--game', type=Path, help='Check downloaded model, renderer, projection, navigating and input script digests against the built game.')
    parser.add_argument('--partial', action='store_true')
    produce(parser.parse_args())
