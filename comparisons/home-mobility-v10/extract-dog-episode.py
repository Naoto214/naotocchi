"""Extract request-time state of the recorded V9 two-seat forest episode.

python extract-dog-episode.py PATH/TO/forest28.json.gz PATH/TO/directions.json.gz -o dog-episode.json
The two input SHA-256 digests identify one recorded browser trial and its independent geometry scan.
"""
import argparse
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    with gzip.open(path, 'rt') as f:
        return json.load(f)


def build(archive, directions):
    dog = 'pet:dog'
    raw, probes = read(archive), read(directions)
    archive_sha = digest(archive)
    assert archive_sha == '8ca183dd1b1431c3a27ffebcb8472097f3a3466fadec9477d9f8769a6ba7a55a'
    assert raw['arm'] == 'v9-seats' and raw['seed'] == 937 and probes['input'] == archive_sha
    events = raw['events']['events']
    recovery = next(e for e in events if e['type'] == 'recovery' and e['key'] == dog and e['failures'] == 77)
    start, end = recovery['start'], recovery['end']
    all_requests = raw['log']['requests']
    requests = [dict(index=i, **r) for i, r in enumerate(all_requests)
                if r['key'] == dog and r['source'] == 'ambient' and start <= r['clock'] <= end]
    assert len(requests) == 78 and requests[-1]['accepted'] and all(not r['accepted'] for r in requests[:-1])
    assert all(r['planned'] and r['from'] == requests[0]['from'] for r in requests)
    assert all(len(r['peers']) == 28 for r in requests)
    assert all(r['peers'][0][0] == dog and r['peers'][0][1:3] == r['from'] for r in requests)
    motions = [dict(index=i, **m) for i, m in enumerate(raw['log']['motions']) if m['key'] == dog]
    choices = [row for row in raw['log']['choices'] if row[1] == dog and start <= row[0] <= end]
    observed = {o['request']: o['geometry'] for o in probes['observations']
                if o['phase'] == 'refusal' and o['key'] == dog}
    def event_key(e):
        return e['clock'], tuple(e['to'])
    failures = {event_key(e): e for e in events
                if e['type'] == 'plan-failed' and e['key'] == dog and start <= e['clock'] < end}
    for req in requests[:-1]:
        reason = failures[(req['clock'], tuple(req['goal']))]
        req['nativeRefusal'] = {key: reason[key] for key in ('start','goal','line','outsideBounds','terrain','visible')}
        geometry = observed[req['index']]
        req['directions'] = {name: {r:deg for r,deg in geometry[name].items() if deg}
                             for name in ('reachable','toward')}
        if req['index'] == requests[0]['index']:
            req['originGeometry'] = {name:geometry[name] for name in ('contacts','terrain','boundsHeading','edgeCss')}
    failed = requests[:-1]
    start_peer = requests[0]['peers'][0]
    def normalized_gap(peer):
        return math.hypot((start_peer[1]-peer[1])/((start_peer[3]+peer[3])*.5+10),
                          (start_peer[2]-peer[2])/((start_peer[4]+peer[4])*.38+10))
    near = sorted(([p[0], normalized_gap(p)] for p in requests[0]['peers'][1:]), key=lambda x:x[1])
    # Keep only the frames that differ at the same timestamp and the last pose before the next draw.
    # These prove lifecycle transitions that are invisible in the dog's own request rows.
    adjacent = [dict(index=i, clock=all_requests[i]['clock'], key=all_requests[i]['key'],
                     peers=all_requests[i]['peers'])
                for i in (722,726,727,770,775,777,787,792)]
    actors = [{key:a[key] for key in ('key','kind','id','w','h','extent','temperament') if key in a}
              for a in raw['initial']['actors']]
    return {
        'schemaVersion': 1,
        'source': {'arm':raw['arm'],'seed':raw['seed'],'startedUTC':raw['startedUTC'],
                   'browser':raw['browser'],'archiveSHA256':archive_sha,'directionsSHA256':digest(directions),
                   'files':raw['sources'],'geometryScanner':probes['sources'],
                   'fullModelCheckpoints':[raw['initial']['clock'],raw['checkpoint']['clock']]},
        'scene': {k:v for k,v in raw['opening'].items() if k != 'actors'},
        'actorDefinitions': actors,
        'peerColumns': ['key','x','y','w','h','targetXY','source','manualUntil','yieldAfter','hasManualGoal','yieldFor','activity'],
        'capture': 'Post-executeMove / before walking. Actors without a goal can select a new activity later in the same native tick. Mid-episode RNG, per-actor nextAt/lastWalk, helper generator cursor and global waiting map were not recorded.',
        'summary': {'subject':dog,'firstRefusalIndex':requests[0]['index'],'recoveryIndex':requests[-1]['index'],
                    'firstRefusalClock':start,'recoveryStepClock':end,'durationSeconds':end-start,
                    'fixedFoot':requests[0]['from'],'scale':requests[0]['scale'],
                    'rejectedRequests':len(failed),'earlyRetries':sum(r['early'] for r in failed),
                    'rawGoalsOutsideTerrain':sum(not r['nativeRefusal']['terrain'] for r in failed),
                    'goalsOnTerrainOccupied':sum(r['nativeRefusal']['terrain'] and bool(r['nativeRefusal']['goal']) for r in failed),
                    'initialContactCount':len(requests[0]['nativeRefusal']['start']),'nearestNormalizedGaps':near[:5],
                    'observedNoSoloRay3to24':sum(not r['directions']['reachable'] for r in failed),
                    'observedSoloRay8to24':sum(any(float(k)>=8 for k in r['directions']['reachable']) for r in failed),
                    'observedGoalwardRay3to24':sum(bool(r['directions']['toward']) for r in failed),
                    'choices':dict(collections.Counter(x[2] for x in choices)), 'recovery':recovery,
                    'recoveryArrival':next(m for m in motions if m.get('request')==requests[-1]['index'])},
        'motions': motions,'choices':choices,'requests':requests,'adjacentFrames':adjacent,
        'nearRecoveryMotions': [m for m in raw['log']['motions'] if 545 <= m['startClock'] <= end and
                                math.dist(m['from'],requests[0]['from'])<80],
        'helperOffersNearWitnesses': [e for e in events if e['type']=='ambient-yield-offer' and
                                     any(a<=e['clock']<=b for a,b in [(501,514),(542,554),(556,557)])]
    }


def serialized(data):
    compact = lambda value: json.dumps(value, separators=(',',':'), ensure_ascii=False, allow_nan=False)
    rows = []
    for key, value in data.items():
        encoded = ('[\n' + ',\n'.join('    '+compact(row) for row in value) + '\n  ]'
                   if isinstance(value,list) and value and isinstance(value[0],dict) else compact(value))
        rows.append('  ' + compact(key) + ': ' + encoded)
    return '{\n' + ',\n'.join(rows) + '\n}\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('directions', type=Path)
    parser.add_argument('-o', '--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.write_text(serialized(build(args.archive, args.directions)), encoding='utf8')
