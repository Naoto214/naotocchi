"""Independent native households with a common V12-randomized opening and frozen 300 s touch."""
import argparse
import copy
import gzip
import json
import os
from pathlib import Path
import subprocess
import sys
import traceback
from functools import cache
from unittest.mock import patch
from urllib.parse import urlsplit
from urllib.request import urlopen

from matrix_fixtures import BASE, FIXTURES, HERE, encode, sha

sys.path.insert(0, str(HERE.parent / 'home-mobility-v12'))
import matrix_worker_v12 as v12

prior, old = v12.prior, v12.old
ARMS = ('v12', 'v13-a', 'v13-b', 'v13-c', 'v13-d')


def fixtures(region):
    info = json.loads((FIXTURES / 'index.json').read_bytes())
    raw = (FIXTURES / (region + '.json.gz')).read_bytes()
    old.require(info['base'] == BASE and sha(raw) == info['regions'][region]['sha256'], 'corrupt V12 donor corpus')
    return json.loads(gzip.decompress(raw))


def matched_state(fixture, natural):
    """Keep the treatment's own native seats, compare random decisions from identical V12 deadlines."""
    state = copy.deepcopy(fixture['original'])
    changes = []
    for donor, current in zip(state['actors'], natural['actors'], strict=True):
        old.require(all(donor[k] == current[k] for k in ('key', 'id', 'w', 'h')), 'different cast or body sizes')
        if (current['x'], current['y']) != (donor['x'], donor['y']):
            changes.append({'key': donor['key'], 'from': [donor['x'], donor['y']], 'to': [current['x'], current['y']]})
            donor['x'], donor['y'] = current['x'], current['y']
    return state, changes


@cache
def network_sha(url):
    with urlopen(url, timeout=30) as stream:
        return sha(stream.read())


def fingerprint(page):
    urls = page.evaluate("""() => [...new Set([...performance.getEntriesByType('resource').map(e=>e.name),
      ...Array.from(document.scripts, s=>s.src)].filter(u => u && new URL(u).origin===location.origin &&
      /\\.(?:m?js|css)$/.test(new URL(u).pathname)))].sort()""")
    return {urlsplit(u).path: network_sha(u) for u in urls}


def frozen_drop(page, touch, fixture):
    # The V12 crossover compares the same frozen feet, receiving model clock, RNG and
    # physical press/goal. The original capture is atomic with its finger preparation.
    before, feet, raw = fixture['snapshot'], fixture['frozenFeet'], fixture['input']
    index = next(i for i, row in enumerate(feet) if row[0] == raw['key'])
    page.evaluate(v12.CHECK_DONOR_BEFORE_TOUCH, {'opening': feet, 'seed': before['seed']})
    row = prior.baseline.shared_drop(page, touch, index, before, {**raw, 'skip': None}, feet)
    old.require(not prior.baseline.same_input(row, raw) and row['inkAtPress'] is not None, 'unequal frozen finger replay')
    return {'donorSHA256': sha(encode(before)), 'row': row, 'preDispatchResync': page.evaluate('touchQA.beforePressResyncs')}


def measure(browser, url, coord, arm, fixture, tape):
    with patch.object(prior, 'instrument', v12.instrument), patch.object(prior.baseline, 'natural_aging', v12.observe_aging), \
            patch.object(old.legacy, 'trial', v12.observe_gesture):
        with prior.native_page(browser, url, coord, arm, False) as (page, touch, meta):
            cold = prior.current_opening(page, meta)
            state, seats = matched_state(fixture, cold)
            aligned = prior.match_opening(page, meta, cold, state)
            data = {**aligned, 'naturalOpening': cold, 'seatChanges': seats, 'openingSHA256': sha(encode(state)),
                    'loaded': fingerprint(page), 'rows': prior.baseline.opening_gestures(page, touch, coord, aligned, tape)}
            data['frozenDrag'] = frozen_drop(page, touch, fixture)
        with prior.native_page(browser, url, coord, arm, True) as (page, touch, meta):
            warm = prior.current_opening(page, meta)
            aligned = prior.match_opening(page, meta, warm, state)
            old.require(aligned['opening'] == data['opening'] and aligned['hashes'] == data['hashes'], 'warm native has different seats or scripts')
            data['nativeWarmStateSHA256'] = sha(encode(warm))
            data['aged'], snapshot, reload = prior.observe_age(page, touch, aligned, fixture['agedSubject'], coord)
            data['agedDonor'] = snapshot
            if reload:
                data['reloaded'] = reload
    region, count, width = coord
    return {'schema': 13, 'region': region, 'count': count, 'width': width, 'arm': arm,
            'height': old.legacy.old.HEIGHTS[width] - 52, 'engine': 'chromium', 'arms': {arm: data},
            'v12RawCellSHA256': fixture['v12RawCellSHA256']}


def validate(cell, fixture, tape):
    coord = (cell['region'], cell['count'], cell['width'])
    arm = cell['arm']
    data = cell['arms'][arm]
    state, seats = matched_state(fixture, data['naturalOpening'])
    old.require(cell['schema'] == 13 and sha(encode(state)) == data['openingSHA256'] and data['seatChanges'] == seats,
                'incorrect matched state or seat attribution')
    old.require(len(data['opening']) == coord[1] and data['seed'] == fixture['original']['seed'], 'unmatched census or seed')
    old.require(set(data['rows']) == {f'{k}/{i}' for k, i in old.legacy.cases('matrix', coord[1])}, 'missing opening cases')
    for case, row in data['rows'].items():
        base = tape[*coord, case, 'v6']
        old.require(row['key'] == base['key'] and (row.get('skip') or '') == base['skip'], 'finger target or skip mismatch')
        if not row.get('skip'):
            coords = [float(base[k]) for k in ('touchX', 'touchY', 'goalX', 'goalY')]
            old.require(row['trusted'] and row['start'] + row['goal'] == coords, 'physical opening gesture differs')
    aged = data['aged']
    old.require(aged['final']['arm'] == arm and abs(aged['final']['modelSeconds'] - 300) < .001 and aged['drag']['trusted']
                and aged['drag']['key'] == fixture['agedSubject'], 'missing native duration, arm, or trusted aged finger')
    old.require(abs(data['agedDonor']['clock'] - 300) < .001 and len(aged['final']['residents']) == coord[1], 'missing aged donor or residents')
    for actor in aged['final']['residents']:
        track = aged['tracks'][actor['key']]
        trips = track['trips']
        completed = [t for t in trips if t['end'] is not None]
        old.require(len(trips) == actor['ambientPlans'] and len(completed) == actor['ambientArrivals'] and
                    sum(t['escape'] for t in completed) == actor['escapeArrivals'] and
                    abs(sum(t['distance'] for t in trips) - actor['ambientDistance']) < 1e-5, 'native trip observer mismatch')
    frozen = data['frozenDrag']
    old.require(frozen['donorSHA256'] == sha(encode(fixture['snapshot'])) and frozen['row']['trusted'] and
                not prior.baseline.same_input(frozen['row'], fixture['input']), 'incorrect 300 s crossover')
    if coord[1:] == (28, 390):
        reload = data['reloaded']
        old.require(reload['loaded'] == reload['saved'] and len(reload['roster']) == 28 and reload['drag']['trusted'], 'failed save/restore')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url', required=True)
    p.add_argument('--region', required=True, choices=old.REGIONS)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--arms', nargs='+', choices=ARMS, default=ARMS)
    p.add_argument('--counts', nargs='+', type=int, choices=old.COUNTS, default=old.COUNTS)
    p.add_argument('--widths', nargs='+', type=int, choices=old.WIDTHS, default=old.WIDTHS)
    a = p.parse_args()
    old.require(urlsplit(a.url).hostname in ('localhost', '127.0.0.1'), 'use a local native runtime')
    tape, donors = prior.v9.history(), fixtures(a.region)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=HERE, text=True).strip()
    a.out.mkdir(parents=True, exist_ok=True)
    with old.sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
                                     args=['--disable-dev-shm-usage', '--disable-background-timer-throttling',
                                           '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'])
        failed = []
        for count in a.counts:
            for width in a.widths:
                fixture = donors[f'{count}-{width}']
                for arm in a.arms:
                    path = a.out / f'{a.region}-{count}-{width}-{arm}.json.gz'
                    if path.exists():
                        cell = json.loads(gzip.decompress(path.read_bytes()))
                        validate(cell, fixture, tape)
                        old.require(cell['revision'] == revision, 'resume needs the same revision')
                        continue
                    errors = []
                    for attempt in range(2):
                        try:
                            cell = measure(browser, a.url, (a.region, count, width), arm, fixture, tape)
                            validate(cell, fixture, tape)
                            cell.update(revision=revision, base=BASE, entry=network_sha(f'{a.url}/game/mobility-{arm}.html'),
                                        priorObserverErrors=errors)
                            tmp = path.with_suffix('.tmp')
                            tmp.write_bytes(gzip.compress(encode(cell), mtime=0))
                            tmp.replace(path)
                            print(path.name, 'verified', flush=True)
                            break
                        except Exception:
                            errors.append(traceback.format_exc())
                            print(path.name, attempt + 1, errors[-1], flush=True)
                    else:
                        failed.append(path.name)
                        path.with_suffix('.errors.json').write_bytes(encode(errors))
        browser.close()
        old.require(not failed, f'Incomplete observations: {failed}')


if __name__ == '__main__':
    main()
