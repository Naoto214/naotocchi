"""Stage pinned home comparison entries beside the shared native game assets."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

from package import IMPORT

HERE = Path(__file__).resolve().parent
CURRENT_MAIN = '384730f1f2b1ef287a2bc4d17df35b861de9f2ae'
BEFORE = 'a917bff999a567ac69a1368b9650f90f985336b3'
ENTRY_URL = re.compile(r'((?:src|href)=")([^"?]+)([^"]*)(")')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=HERE.parents[1])


def tree(sha):
    rows = (row.split(b'\t', 1) for row in git('ls-tree', '-rz', sha).split(b'\0') if row)
    return {name.decode(): meta.split()[-1].decode() for meta, name in rows}


def build_comparison(game, root, manifest, candidate):
    versions = {'main': CURRENT_MAIN, 'before': BEFORE, 'fixed': git('rev-parse', '--verify', f'{candidate}^{{commit}}').decode().strip()}
    native = tree(versions['fixed'])
    for name in manifest['files']:
        data = (root / name).read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if native.get(name) != blob:
            raise ValueError(f'Runtime does not match candidate {candidate}: {name}')
    setup = (HERE / 'compare-setup.js').read_text()
    # Address changed files by content, in the same directory as the native
    # file. Relative imports and asset URLs therefore retain their original base.
    for edition, sha in versions.items():
        blobs = tree(sha)
        historical = json.loads(git('show', f'{sha}:tools/pages/allowlist.json'))['files']
        aliases = {}
        for name in historical:
            if name == 'index.html' or blobs[name] == native.get(name) and name in manifest['files']:
                continue
            # The displayed comparison is the native home. Standalone subgames
            # retain the ordinary preview's scoped bundle when opened separately.
            if name.startswith('prototypes/'):
                continue
            if '/' in name or Path(name).suffix not in ('.css', '.js', '.mjs'):
                raise ValueError(f'Unreviewed historical runtime difference: {name}')
            alias = f'compare-{blobs[name][:12]}-{name}'
            dest = game / alias
            if not dest.exists():
                dest.write_bytes(git('cat-file', 'blob', blobs[name]))
            aliases[name] = alias

        entry = git('show', f'{sha}:index.html').decode()
        imports = {}
        for name in historical:
            if '/' in name or not name.endswith(('.mjs', '.js')):
                continue
            text = (game / aliases.get(name, name)).read_text()
            for _, url in IMPORT.findall(text):
                filename = url.removeprefix('./').split('?')[0]
                if filename in aliases:
                    imports[url] = './' + aliases[filename]
        entry = ENTRY_URL.sub(lambda m: m[1] + aliases.get(m[2], m[2]) + m[3] + m[4], entry)
        roster = re.search(r'<script src="character-world-master\.v1\.js[^"]*"></script>', entry).group()
        entry = entry.replace(roster, '', 1)
        entry = entry.replace('<script>', '<script type="importmap">' + json.dumps({'imports': imports})
                              + '</script>\n' + roster + '\n<script>\n' + setup + '\n</script>\n<script>', 1)
        # Both archived models expose RNG injection on their production factory.
        # The ambient stream is independent of gameplay RNG and UI scheduling.
        model_tag = re.search(r'<script src="[^"]*home-production-model\.js[^"]*"></script>', entry).group()
        entry = entry.replace(model_tag, model_tag + '\n<script>window.seedComparisonModel();</script>')
        entry = entry.replace('</body>', '<script>' + (HERE / 'compare-clock.js').read_text()
                              .replace('__EDITION__', edition).replace('__SHA__', sha[:8]) + '</script>\n</body>')
        (game / f'compare-{edition}.html').write_text(entry)
    return versions
