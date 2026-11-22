"""Download native forest households and verify each ZIP against its official GitHub digest."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
from pathlib import Path
import re
import tempfile
import subprocess
import zipfile

REPO = 'repos/Naoto214/naotocchi'
FILES = {'forest28.json.gz', 'directions.json.gz', 'residents.csv', 'progress.json', 'episodes.csv.gz',
         'legs.csv.gz', 'touch-checkpoint.json', 'touch-initial-checkpoint.json', 'initial-checkpoint.json',
         'checkpoint.json', 'restore.json', 'initial-save.json', 'aged-save.json', 'fixed-native.json.gz',
         'fixed-summary.json'}


def api(path):
    result = subprocess.run(['gh','api',REPO+'/'+path],capture_output=True)
    if result.returncode:
        raise RuntimeError(f'GitHub request failed for {path}. A downloaded ZIP can also be verified with --cached-only.')
    return result.stdout


def put(path, contents):
    if path.is_file() and path.read_bytes() == contents:
        return
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as tmp:
        tmp.write(contents)
    Path(tmp.name).replace(path)


def download(args):
    run = json.loads(api(f'actions/runs/{args.run}'))
    assert run['head_branch'] == 'draft/home-mobility-v13'
    assert run['path'] == '.github/workflows/home-mobility-v13-fairness.yml'
    folder = args.out / str(args.run)
    folder.mkdir(parents=True, exist_ok=True)
    metadata = api(f'actions/runs/{args.run}/artifacts?per_page=100')
    put(folder / 'github-artifacts.json', metadata)
    records = json.loads(metadata)

    def artifact(a):
        match = re.fullmatch(r'forest-v13-(\d+-\d+-\d+-(?:fixed|reference)-\d+-v13-(?:a|b|c|d|d-curve))', a['name'])
        assert match and a['workflow_run']['id'] == args.run and a['workflow_run']['head_sha'] == run['head_sha']
        case = match[1]
        out = folder / case
        out.mkdir(exist_ok=True)
        target = out / 'runner.zip'
        if args.cached_only and not target.exists():
            return case, None
        source = target.read_bytes() if target.exists() else api(f'actions/artifacts/{a["id"]}/zip')
        digest = hashlib.sha256(source).hexdigest()
        assert a['digest'] == 'sha256:' + digest and len(source) == a['size_in_bytes'], case
        with zipfile.ZipFile(io.BytesIO(source)) as zipped:
            names = zipped.namelist()
            assert len(names) == len(set(names)) and set(names) <= FILES and zipped.testzip() is None
            for name in names:
                put(out / name, zipped.read(name))
        if not target.exists():
            put(target, source)
        receipt = dict(case=case, artifact=a['id'], run=args.run, commit=run['head_sha'],
            sha256=digest, bytes=len(source), files=sorted(names), complete=set(names)==FILES)
        put(out / 'receipt.json', (json.dumps(receipt, indent=2)+'\n').encode())
        return case, receipt['complete']

    assert records['total_count'] == len(records['artifacts'])
    with ThreadPoolExecutor(max_workers=4) as pool:
        for name, complete in pool.map(artifact, records['artifacts']):
            if complete is not None:
                print(name, 'complete' if complete else 'partial', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run', type=int)
    parser.add_argument('out', type=Path)
    parser.add_argument('--cached-only', action='store_true', help='Verify ZIPs placed as CASE/runner.zip by the GitHub connector.')
    download(parser.parse_args())
