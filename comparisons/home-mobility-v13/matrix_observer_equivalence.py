"""Prove the browser probes, legacy readers and donor bytes survived the forest correction."""
import ast
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PREFIX = HERE.relative_to(ROOT).as_posix()


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def content(rev, name):
    return git('show', rev + ':' + PREFIX + '/' + name)


def functions(source):
    return {n.name: ast.dump(n) for n in ast.parse(source).body if isinstance(n, ast.FunctionDef)}


def audit(first, final):
    a = functions(content(first, 'matrix_worker.py'))
    b = functions(content(final, 'matrix_worker_v13.py'))
    shared = ['matched_state', 'network_sha', 'fingerprint', 'frozen_drop', 'measure', 'main']
    assert all(a[k] == b[k] for k in shared), 'physical observation routine changed'
    assert functions(content(first,'matrix_fixtures.py'))['encode'] == functions(content(final,'matrix_fixtures.py'))['encode']
    trees = {}
    for name in ['home-finish-v5','home-drag-v6', *('home-mobility-v'+str(i) for i in range(7,13))]:
        path = ':comparisons/' + name
        before = git('rev-parse', first + path).strip().decode()
        assert before == git('rev-parse', final + path).strip().decode(), 'historical observer dependency changed'
        trees[name] = before
    index = json.loads(content(final, 'matrix-fixtures/index.json'))['regions']
    donors = {}
    for region, row in index.items():
        raw = content(first, 'matrix-fixtures/' + region + '.json.gz')
        plain = content(final, 'matrix-fixtures/' + region + '.json')
        assert gzip.decompress(raw) == plain
        assert hashlib.sha256(plain).hexdigest() == row['sha256'] and hashlib.sha256(raw).hexdigest() == row['measuredWorkflowGzipSHA256']
        donors[region] = {'gzipSHA256':hashlib.sha256(raw).hexdigest(), 'plainSHA256':hashlib.sha256(plain).hexdigest(), 'cells':len(json.loads(plain))}
    assert len(donors)==13 and sum(r['cells'] for r in donors.values())==260
    return {'originalRevision':first,'correctedRevision':final,'identicalObserverFunctions':shared,'unchangedLegacyGitTrees':trees,'byteIdenticalDonors':donors}


if __name__ == '__main__':
    print(json.dumps(audit(*sys.argv[1:])))
