"""Retrieve original GitHub ZIPs, verify published digests, and retain their immutable run receipts."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

REPO = 'Naoto214/naotocchi'


def github(*args):
    return json.loads(subprocess.check_output(['gh', *args], text=True))


def collect(root, run, *, metadata_only=False):
    directory = root / run
    directory.mkdir(parents=True, exist_ok=True)
    info = github('run', 'view', run, '-R', REPO, '--json', 'headSha,status,conclusion,url,workflowName,jobs')
    if info['workflowName'] != 'Home mobility V13 regional regression':
        raise ValueError('Not the regional regression workflow')
    artifacts = github('api', f'repos/{REPO}/actions/runs/{run}/artifacts?per_page=100')['artifacts']
    jobs = {job['name']: job for job in info.pop('jobs')}
    ready = {}
    for item in artifacts:
        prefix = 'mobility-v13-'
        if not item['name'].startswith(prefix):
            continue
        region = item['name'][len(prefix):]
        path = directory / (region + '.zip')
        if not path.exists() and not metadata_only:
            tmp = path.with_suffix('.download')
            with tmp.open('wb') as stream:
                subprocess.run(['gh', 'api', f"repos/{REPO}/actions/artifacts/{item['id']}/zip"], stdout=stream, stderr=subprocess.DEVNULL, check=True)
            if tmp.stat().st_size != item['size_in_bytes'] or 'sha256:' + hashlib.sha256(tmp.read_bytes()).hexdigest() != item['digest']:
                raise ValueError('download does not match GitHub digest: ' + str(path))
            tmp.replace(path)
        job = jobs[f'region ({region})']
        ready[region] = dict(id=item['id'], job=job['databaseId'], conclusion=job['conclusion'], bytes=item['size_in_bytes'],
                             url=info['url'] + '/artifacts/' + str(item['id']), sha256=item['digest'].removeprefix('sha256:'))
    target = directory / 'receipt.json'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps({**info, 'run': run, 'regions': ready}, indent=2) + '\n')
    temp.replace(target)
    print(run, info['status'], info['conclusion'], len(ready), 'archives', flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--metadata-only', action='store_true', help='Record official digests for ZIPs downloaded by a separate authorized client')
    p.add_argument('directory', type=Path)
    p.add_argument('runs', nargs='+')
    args = p.parse_args()
    for run in args.runs:
        collect(args.directory, run, metadata_only=args.metadata_only)
