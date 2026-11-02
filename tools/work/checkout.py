#!/usr/bin/env python3
"""Create a NEW, shallow/partial home-development checkout. Never edit an old copy."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REPOSITORY = 'https://github.com/Naoto214/naotocchi.git'
EXCLUDED = ('docs/qa/character-3d-full-v0/', 'docs/qa/meguru-3d-ci/',
            'prototypes/card-game/art-pilot/illustrations/')
SUPPORT = ('tools/', 'tests/', '.github/')


def git(destination, *args, input=None):
    return subprocess.check_output(['git', '-C', str(destination), *args],
                                   input=input, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'})


def safe_path(path):
    return (isinstance(path, str) and bool(path) and
            not path.startswith('/') and '\\' not in path and
            not any(ord(c) < 32 for c in path) and
            not any(x in ('', '.', '..', '.git') for x in path.split('/')))


def pattern(path):
    # Literal, root-anchored non-cone paths, including filenames with spaces/globs.
    return '/' + ''.join('\\' + c if c in '\\*?[]!# ' else c for c in path)


def checkout(destination, repository, ref):
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink():
        raise ValueError('destination already exists; no existing checkout is modified')
    if not ref or ref.startswith('-'):
        raise ValueError('ref must be a commit, branch or tag')
    if not (repository.startswith(('https://', 'file://'))):
        raise ValueError('use an HTTPS repository (file:// is supported for local tests)')
    # Refuse servers that ignore filtering BEFORE any repository/object download.
    probe = subprocess.run(['git', '-c', 'protocol.version=2', 'ls-remote', repository, 'HEAD'],
                           capture_output=True, env={**os.environ, 'GIT_TRACE_PACKET': '1',
                                                     'GIT_TERMINAL_PROMPT': '0'}, timeout=60)
    if probe.returncode or not re.search(rb'fetch=[^\r\n]*\bfilter\b', probe.stderr):
        raise ValueError('remote does not advertise partial-fetch filter support; stopped')
    destination.mkdir(parents=True, exist_ok=False)
    git(destination, 'init', '-q', '-b', 'work/home-ui')
    git(destination, 'remote', 'add', 'origin', repository)
    git(destination, 'config', 'remote.origin.promisor', 'true')
    git(destination, 'config', 'remote.origin.partialclonefilter', 'blob:none')
    git(destination, '-c', 'protocol.version=2', 'fetch', '--filter=blob:none',
        '--depth=1', '--no-tags', 'origin', ref)
    sha = git(destination, 'rev-parse', 'FETCH_HEAD^{commit}').decode().strip()
    manifest = json.loads(git(destination, 'show', sha + ':tools/pages/allowlist.json'))
    runtime = manifest['files']
    if not runtime or any(not safe_path(p) for p in runtime):
        raise ValueError('unsafe or empty runtime allowlist')
    if any(p.startswith(EXCLUDED) for p in runtime):
        raise ValueError('runtime now depends on excluded originals/evidence; review the profile')
    entries = {}
    # Never use ls-tree -l: asking Git for missing blob sizes triggers downloads.
    for record in git(destination, 'ls-tree', '-rz', sha).split(b'\0'):
        if not record:
            continue
        metadata, rawpath = record.split(b'\t', 1)
        mode, kind, oid = metadata.split()
        path = rawpath.decode('utf-8')
        if kind == b'blob':
            entries[path] = mode
    selected = set(runtime) | {p for p in entries if '/' not in p or p.startswith(SUPPORT)}
    missing = selected - entries.keys()
    if missing:
        raise ValueError('runtime files missing from commit: ' + ', '.join(sorted(missing)))
    if any(not safe_path(p) or entries[p] not in (b'100644', b'100755') for p in selected):
        raise ValueError('unsafe or non-regular selected path')
    git(destination, 'config', 'core.sparseCheckout', 'true')
    git(destination, 'config', 'core.sparseCheckoutCone', 'false')
    info = destination / '.git/info'
    info.mkdir(exist_ok=True)
    # Works immediately even when the target PR predates the repository guard.
    with (info / 'exclude').open('a') as output:
        output.write('\n# Local Work output; tracked source is unaffected.\n'
                     '/.work-output/\n/work-output/\n/playwright-report/\n'
                     '/pages-runtime/\n/pages-runtime.tar\n/pages-runtime.tar.gz\n')
    (info / 'sparse-checkout').write_text(''.join(pattern(p) + '\n' for p in sorted(selected)))
    git(destination, 'checkout', '-q', '-B', 'work/home-ui', sha)
    if any(not (destination / p).is_file() for p in selected):
        raise ValueError('checkout incomplete')
    if git(destination, 'status', '--porcelain').strip():
        raise ValueError('new checkout unexpectedly dirty')
    report = {'head': sha, 'profile': 'home', 'runtime_files': len(set(runtime)),
              'selected_files': len(selected),
              'selected_bytes': sum((destination / p).stat().st_size for p in selected),
              'full_tree_files': len(entries),
              'omitted_files': len(entries) - len(selected),
              'excluded': list(EXCLUDED)}
    # Local-only metadata: never included in Git, never copy the publication tree.
    (destination / '.git/work-checkout.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--ref', required=True, help='Prefer an exact commit SHA')
    parser.add_argument('--repository', default=REPOSITORY)
    args = parser.parse_args()
    try:
        print(json.dumps(checkout(args.destination, args.repository, args.ref), indent=2))
    except (ValueError, KeyError, OSError, subprocess.SubprocessError) as exc:
        print(f'Checkout stopped: {exc}. No cleanup/deletion or full-fetch fallback performed.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
