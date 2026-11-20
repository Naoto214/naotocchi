"""Create compact per-input evidence and verified self-hosted raw-file hashes."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import shutil


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def load(path):
    return json.loads(path.read_text())


def touch_row(arm, panel, case, row):
    info = {'arm':arm, 'panel':panel, 'case':case, 'key':row.get('key'), 'skip':row.get('skip') or ''}
    fields = ('trusted','selected','issued','routed','terminalArrived','terminalNear4','earlyDistanceCss',
              'endDistanceCss','endFingerErrorCss','blockedClass','unsafeSteps','sweptViolations','searchCount')
    info.update((key, row.get(key)) for key in fields)
    for field in ('start','goal','foot','end'):
        info[field] = ' '.join(map(str,row.get(field,[])))
    info['legacyAllPointerTraceTrusted'] = row.get('trusted')
    if panel.startswith('overlap/') and 'pointerEvents' in row:
        touch = [e for e in row['pointerEvents'] if e[1]=='touch']
        info['trusted'] = bool(touch) and all(e[2] for e in touch) and touch[0][0]=='pointerdown' and touch[-1][0]=='pointerup'
    info['blockedAtPress'] = (row.get('initialGate') or {}).get('blocked')
    ink = row.get('ink') or {}
    info['paintedOwner'] = ink.get('foreground')
    info['paintedStack'] = ' '.join(f"{q['key']}={q['alpha']}" for q in ink.get('stack',[]))
    peer_steps = row.get('peers',row.get('peerWalk',{}))
    info['peersThatStepped'] = ' '.join(k for k, v in peer_steps.items() if v['steps'])
    motion = row.get('mobilityInput') or {}
    info['helpOffers'] = ' '.join(e['peer'] for e in motion.get('offered',[]))
    info['steppedAfterHelpOffer'] = motion.get('steppedAfterOffer')
    markers = row.get('markers') or []
    info['markerAtRelease'] = next((m[1] for m in markers if m[0]=='pointerup'),None)
    info['reactions'] = ' '.join(r[1] for r in row.get('reactions',[]))
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--evidence',type=Path,required=True)
    parser.add_argument('--owner',type=Path,required=True)
    args = parser.parse_args()
    args.evidence.mkdir(exist_ok=True,parents=True)
    args.owner.mkdir(exist_ok=True,parents=True)
    rows, gates, sources, archive = [], [], {}, {}
    models = {}
    physical_reference = {}
    arms = ('v6','v7','v8')
    panels = ('forest','resync','aged','extra','ink')
    for panel in panels:
        for arm in arms:
            engines = ('chromium','webkit') if panel == 'ink' else ('chromium',)
            for engine in engines:
                path = args.input / f'{panel}-{arm}-{engine}.json'
                if panel == 'forest' and not path.is_file():
                    path = args.input / f'forest-{arm}.json'
                recording = load(path)
                data = recording['data']
                witness = recording.get('modelSHA256')
                if witness is None:
                    if 'meta' in data:
                        witness = data['meta']['hashes'].get(f'home-production-model-mobility-{arm}.js')
                    else:
                        witness = next((v['meta']['hashes'].get(f'home-production-model-mobility-{arm}.js')
                                        for v in data.values() if isinstance(v,dict) and 'meta' in v),None)
                if witness:
                    assert models.setdefault(arm,witness) == witness, f'Mixed model hashes in {arm}'
                if arm == 'v8':
                    assert witness is not None, f'No model provenance in {panel}/{engine}'
                key = f'{panel}-{arm}-{engine}'
                asset = args.owner / (key + '.json')
                shutil.copyfile(path,asset)
                sources[asset.name] = hashlib.sha256(asset.read_bytes()).hexdigest()
                if panel in ('forest','resync'):
                    for i, row in data['rows'].items():
                        rows.append(touch_row(arm,panel,i,row))
                elif panel == 'aged':
                    for cell, sample in data.items():
                        for state in ('natural','fixedV7'):
                            rows.append(touch_row(arm,'aged/' + state,cell,sample[state]))
                elif panel == 'ink':
                    for cell, scene in data.items():
                        for case, row in scene['rows'].items():
                            rows.append(touch_row(arm,'overlap/' + engine,cell + '/' + case,row))
                else:
                    for case, sample in data.items():
                        row = sample['observed']
                        if case.startswith('gate/'):
                            gates.append({'arm':arm,'gate':case.removeprefix('gate/'),'trusted':row['trusted'],
                                          'blockedAtDown':next((e['state']['blocked'] for e in row['gateHistory'] if e['type']=='pointerdown'),None),
                                          'blockedAtRelease':next((e['state']['blocked'] for e in row['gateHistory']
                                                                   if e['type'] in ('pointerup','pointercancel')),None),
                                          'gestureWallMs':round(row['released']['clock'],1),
                                          'releasedToGame':row['issued'],'arrived':row['arrived'],
                                          'releaseIntent':bool(row['released']['intent']),
                                          'handedOffAfterReleaseMs':row['actualIssueAfterReleaseMs'],
                                          'retainedAtEnd':bool(row['retentionEnd']),
                                          'unsafeSteps':row['unsafeSteps'],'sweptViolations':row['sweptViolations']})
                        else:
                            rows.append(touch_row(arm,'gestures',case,row))
    for row in rows:
        if row['skip'] or row['panel'] == 'aged/natural':
            continue
        identity=(row['panel'],row['case'])
        coords=(row['key'],row['start'],row['goal'])
        assert physical_reference.setdefault(identity,coords)==coords, f'Changed physical input: {identity}'
    for panel in ('forest','resync','aged/fixedV7'):
        for case in {r['case'] for r in rows if r['panel']==panel}:
            matches=[r for r in rows if (r['panel'],r['case'])==(panel,case)]
            assert len(matches)==3 and len({r['foot'] for r in matches})==1, f'Changed starting foot: {panel}/{case}'
    for panel in ('touch-inputs','touch-gates'):
        items = rows if panel == 'touch-inputs' else gates
        target = args.evidence / (panel + '.csv')
        with target.open('w',newline='') as f:
            writer = csv.DictWriter(f,fieldnames=items[0],lineterminator='\n')
            writer.writeheader()
            writer.writerows(items)
        shutil.copyfile(target,args.owner/target.name)
        sources[target.name] = hashlib.sha256(target.read_bytes()).hexdigest()
    cross_path=args.input/'forest-crossed.json'
    if cross_path.exists():
        cross=load(cross_path)
        crossed_rows=[]
        for arm in ('v7','v8'):
            for offset in ('0','7','14','21'):
                data=cross[arm][offset]
                assert data['meta']['hashes'][f'home-production-model-mobility-{arm}.js']==models[arm]
                for key,row in data['rows'].items():
                    crossed_rows.append(touch_row(arm,'forest/crossover',key,row))
        assert len(crossed_rows)==56
        edge=args.evidence/'touch-forest-crossover.csv'
        with edge.open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=crossed_rows[0],lineterminator='\n')
            writer.writeheader()
            writer.writerows(crossed_rows)
        for source in (cross_path,edge):
            dest=args.owner/source.name
            shutil.copyfile(source,dest)
            sources[dest.name]=hashlib.sha256(dest.read_bytes()).hexdigest()
    for source in sorted(args.input.glob('monkey-*.json')):
        dest=args.owner/source.name
        shutil.copyfile(source,dest)
        sources[dest.name]=hashlib.sha256(dest.read_bytes()).hexdigest()
    for source in sorted((args.input/'settled').glob('ink-*.json')):
        dest=args.owner/('settled-'+source.name)
        shutil.copyfile(source,dest)
        sources[dest.name]=hashlib.sha256(dest.read_bytes()).hexdigest()
    for source in sorted(args.input.glob('checkpoint-*.json')):
        dest=args.owner/source.name
        shutil.copyfile(source,dest)
        sources[dest.name]=hashlib.sha256(dest.read_bytes()).hexdigest()
        data=load(source)
        inp=data['input']
        archive[source.stem]={'subject':inp['key'],'seed':data['snapshot']['seed'],'origin':inp['origin'],
                              'openingSHA256':hashlib.sha256(json.dumps(data['opening'],separators=(',',':')).encode()).hexdigest()}
    manifest={'schema':1, 'hashAlgorithm':'sha256', 'modelSHA256':models, 'files':sources, 'agedV7Reference':archive}
    dump(args.evidence/'touch-files.json',manifest)
    shutil.copyfile(args.evidence/'touch-files.json',args.owner/'manifest.json')


if __name__ == '__main__':
    main()
