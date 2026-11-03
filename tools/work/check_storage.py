#!/usr/bin/env python3
"""Check only changed blobs; never fetch all historical images or mutate Git."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys

IMAGES = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm'}
ARCHIVES = ('.zip', '.tar', '.tar.gz', '.tgz', '.gz', '.xz', '.7z')
OUTPUTS = {'.work-output', 'work-output', 'pages-runtime', 'playwright-report'}
EVIDENCE = {'qa', 'evidence', 'previews', 'screenshots', 'integration-evidence', 'cpu-evidence'}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])


def check(repo, base, head, verified_merge_base=False):
    # Resolve revisions first: callers cannot inject Git options or path expressions.
    base = git(repo, 'rev-parse', '--verify', '--end-of-options', base + '^{commit}').decode().strip()
    head = git(repo, 'rev-parse', '--verify', '--end-of-options', head + '^{commit}').decode().strip()
    if not verified_merge_base:
        base = git(repo, 'merge-base', base, head).decode().strip()
    allowed = set(json.loads(git(repo, 'show', head + ':tools/pages/allowlist.json'))['files'])
    exceptions = json.loads(git(repo, 'show', head + ':tools/work/storage-exceptions.json'))
    paths = git(repo, 'diff', '--name-only', '--no-renames', '--diff-filter=AM', '-z', base, head).split(b'\0')
    rejected = []
    for raw in paths:
        if not raw:
            continue
        path = raw.decode('utf-8')
        if path in allowed:
            continue
        parts = PurePosixPath(path).parts
        suffix = PurePosixPath(path).suffix.lower()
        # Do not fetch unrelated originals just to inspect their size.
        candidate = (parts[0] in OUTPUTS or path.lower().endswith(ARCHIVES) or
                     path.startswith(('docs/', 'prototypes/')) and
                     (bool(set(parts[:-1]) & EVIDENCE) and suffix in IMAGES or
                      suffix in {'.json', '.jsonl', '.log', '.txt'}))
        if not candidate:
            continue
        size = int(git(repo, 'cat-file', '-s', head + ':' + path))
        reason = None
        if parts[0] in OUTPUTS:
            reason = 'temporary output directory'
        elif path.lower().endswith(ARCHIVES):
            reason = 'archive; store outside the source tree'
        elif (path.startswith(('docs/', 'prototypes/')) and
              (bool(set(parts[:-1]) & EVIDENCE) and PurePosixPath(path).suffix.lower() in IMAGES
               or size > 1048576 and PurePosixPath(path).suffix.lower() in {'.json', '.jsonl', '.log', '.txt'})):
            reason = 'QA image or large generated data'
        if reason:
            exception = exceptions.get(path, {})
            if (isinstance(exception, dict) and isinstance(exception.get('reason'), str)
                    and exception['reason'].strip() and exception.get('sha256') ==
                    hashlib.sha256(git(repo, 'show', head + ':' + path)).hexdigest()):
                continue
            rejected.append((path, size, reason))
    return rejected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path('.'))
    comparison = parser.add_mutually_exclusive_group(required=True)
    comparison.add_argument('--base', help='Branch or commit; requires enough local ancestry to find merge-base')
    comparison.add_argument('--merge-base', help='Exact merge base verified by GitHub compare API (shallow CI)')
    parser.add_argument('--head', default='HEAD')
    args = parser.parse_args()
    rejected = check(args.repo, args.merge_base or args.base, args.head, bool(args.merge_base))
    for path, size, reason in rejected:
        print(f'REVIEW {path} ({size} bytes): {reason}')
    if rejected:
        print('Keep routine output in .work-output/. For intentional permanent evidence, add an exact path, SHA-256 and reason to tools/work/storage-exceptions.json.')
    else:
        print('Storage guard passed: no undeclared generated output in this change.')
    return bool(rejected)


if __name__ == '__main__':
    sys.exit(main())
