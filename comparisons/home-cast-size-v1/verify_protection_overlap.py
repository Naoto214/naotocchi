"""Record open PR changes under the new private experiment's reserved paths."""
import argparse
import concurrent.futures
from datetime import datetime, timezone
import json
import pathlib
import subprocess

REPO = 'Naoto214/naotocchi'
EXPERIMENT = 'comparisons/home-cast-size-v1/'
WORKFLOW = '.github/workflows/home-cast-size-v1'


def github(path):
    result = subprocess.run(['gh', 'api', f'repos/{REPO}/{path}'],
                            check=True, stdout=subprocess.PIPE)
    return json.loads(result.stdout)


def pages(path):
    page = 1
    while True:
        separator = '&' if '?' in path else '?'
        batch = github(f'{path}{separator}per_page=100&page={page}')
        yield from batch
        if len(batch) < 100:
            return
        page += 1


def reserved(filename):
    return filename.startswith(EXPERIMENT) or filename.startswith(WORKFLOW)


def changes(pull):
    number = pull['number']
    info = github(f'pulls/{number}')
    files = list(pages(f'pulls/{number}/files'))
    if len(files) != info['changed_files']:
        raise ValueError(f'PR {number} changed during snapshot or exceeded GitHub file limit')
    hits = sorted({filename for file in files
                   for filename in (file['filename'], file.get('previous_filename', ''))
                   if reserved(filename)})
    return {'number': number, 'head': info['head']['sha'],
            'files': len(files), 'matches': hits}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--out', type=pathlib.Path, required=True)
    cli.add_argument('--exclude-pr', type=int,
                     help='Exclude the experiment itself if it is already open.')
    args = cli.parse_args()
    pulls = [p for p in pages('pulls?state=open') if p['number'] != args.exclude_pr]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        result = list(pool.map(changes, pulls))
    result.sort(key=lambda row: row['number'], reverse=True)
    report = {'repository': REPO, 'checkedAt': datetime.now(timezone.utc).isoformat(),
              'main': github('branches/main')['commit']['sha'], 'pullRequests': len(result),
              'changedPaths': sum(row['files'] for row in result), 'comparisons': result}
    args.out.write_text(json.dumps(report, indent=2) + '\n')
    print(report['pullRequests'], 'open PRs;', report['changedPaths'], 'changed paths')
    assert not [row for row in result if row['matches']], 'overlapping paths'


if __name__ == '__main__':
    main()
