"""Measure real-time forest life; independently compare native steps with a fixed clock."""
import argparse
import asyncio
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'home-mobility-v12'))
from forest_continuation import INJECT, physical_digest
from forest_results import attach_curves, v9
from forest_watch import baseline, observe, original_url, record


def observe_geometry(source):
    return baseline.replace_once(observe(source), 'home-production-world[^/]*[.]mjs',
        '(?:home-production-world|home-visible-ground-navigation)[^/]*[.]mjs')


def directions(args):
    # Keep all of V12's distances (including its nearer-goal measurements). Add 16px
    # in the same sweep with the same terrain, visibility and peer exclusion.
    path = HERE.parent / 'home-mobility-v10/forest_rays.py'
    spec = importlib.util.spec_from_file_location('matched_forest_rays', path)
    rays = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(rays)
    rays.PROBE = baseline.replace_once(rays.PROBE, '[3,4,5,6,8,12,18,24]', '[3,4,5,6,8,12,16,18,24]')
    args.file = args.out / 'forest28.json.gz'
    rays.scan(args, rays.read(args.file))


def fixed(args):
    """Run the unmodified model's step function 18000 times from its actual recorded opening."""
    tape = args.out / 'forest28.json.gz'
    d = v9.load(tape)
    arm, seed, order, initial = (d[k] for k in ('arm', 'seed', 'order', 'initial'))
    model = 'home-production-model-mobility-' + arm + '.js'
    hashes = {}
    with sync_playwright() as api:
        browser = api.chromium.launch(executable_path=args.chromium)
        context = browser.new_context(viewport={'width': d['width'], 'height': 792},
            device_scale_factor=2, is_mobile=True, has_touch=True, timezone_id='Asia/Tokyo', locale='ja-JP')
        context.add_init_script(baseline.prior.SEED.replace('let seed=214;', f'let seed={seed};'))
        page = context.new_page()

        def instrument(route):
            name = Path(route.request.url.split('?')[0]).name
            response = route.fetch()
            code = response.text()
            hashes[name] = hashlib.sha256(code.encode()).hexdigest()
            assert hashes[name] == d['sources'][name]['source'], name
            if name == model:
                code = baseline.replace_once(observe(code), '    return {metrics:', INJECT + '    return {metrics:')
            elif name == 'fixture.js':
                code = baseline.fixture_script(code, order, seed)
            elif name.startswith('drag-trial-hooks'):
                code = baseline.replace_once(code, 'let seed = 214;',
                    f'let seed = {seed};globalThis.setForestSeed=n=>{{seed=n}};globalThis.forestSeed=()=>seed;')
            else:
                code = baseline.replace_once(code, 'let actorSeed=214;', f'let actorSeed={seed};')
            route.fulfill(response=response, body=code)

        page.route(re.compile(r'/(?:home-production-model-mobility-[\w-]+\.js|drag-trial-hooks[\w-]*\.js|beauty/fixture\.js|population-beauty\.js)(?:\?|$)'), instrument)
        page.goto(original_url(args.url, arm), wait_until='domcontentloaded', timeout=120000)
        page.wait_for_function('HomeCastTrial?.ready && HomeDragTrial.opening() && typeof forestSameClock==="function"', timeout=120000)
        page.evaluate('Promise.all([...document.querySelectorAll("#castStage img.character-asset")].map(i=>i.decode()))')
        page.evaluate('HomeMobilityDiagnostics.enable()')
        run = page.evaluate('s=>forestSameClock(s,18000,null,null)', initial)
        assert len(hashes) == 4 and abs(run['state']['clock'] - 600) < 1e-6
        browser.close()
    run['arm'], run['seed'] = arm, seed
    run['log'].pop('projectionSources', None)
    curves, _ = attach_curves(run, run['state']['clock'])
    normal = [leg for leg in v9.legs(run) if leg['completed_normal'] and leg['finish_s'] <= 600 + 1e-7]
    per_actor = {a['key']: [0, 0] for a in initial['actors']}
    for leg in normal:
        per_actor[leg['key']][int(leg['finish_s'] > 300 + 1e-7)] += 1
    report = dict(arm=arm, seconds=600, ticks=18000, sources=hashes, physicalSHA256=physical_digest(run),
        openingSHA256=v9.sha(args.out / 'initial-checkpoint.json'), finalSeed=run['state']['seed'],
        perActor=per_actor, normal=len(normal), both=sum(all(halves) for halves in per_actor.values()),
        searches=len(curves), plans=sum(c['found'] for c in curves),
        physicallyWalked=sum(any(h['native_steps'] for h in c['helpers']) for c in curves),
        assistedNormal=sum(c['owner_strict_normal'] for c in curves))
    (args.out / 'fixed-summary.json').write_text(json.dumps(report, separators=(',', ':'))+'\n')
    with gzip.open(args.out / 'fixed-native.json.gz', 'wt', compresslevel=3) as handle:
        json.dump({k: run[k] for k in ('log', 'state')}, handle, separators=(',', ':'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('live', 'directions', 'fixed'))
    parser.add_argument('--url', required=True)
    parser.add_argument('--chromium', required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--arm')
    for key in ('width', 'order', 'seed'):
        parser.add_argument('--' + key, type=int)
    parser.add_argument('--seconds', type=int, default=600)
    args = parser.parse_args()
    if args.mode == 'live':
        args.attended = True
        baseline.prior.SEED += '\nperformance.setResourceTimingBufferSize(4096);\n'
        baseline.observe_model = observe_geometry
        baseline.forest_url = lambda base, arm: original_url(base, arm) + '&footLog=1'
        asyncio.run(record(args))
    elif args.mode == 'directions':
        directions(args)
    else:
        fixed(args)
