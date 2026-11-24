"""Run the shipped movement-V5 suites against the exact materialized candidate sources."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

HERE=Path(__file__).resolve().parent.parent
ROOT=HERE.parent.parent


def verify(source):
    pins=json.loads((HERE/'native/sources.json').read_text())
    digests={name:hashlib.sha256((source/name).read_bytes()).hexdigest() for name in pins}
    assert all(digest==pins[name]['after'] for name,digest in digests.items())
    tests=sorted((ROOT/'tests').glob('home-movement-v5-*-test.cjs'))
    with tempfile.TemporaryDirectory() as directory:
        candidate=Path(directory)
        for name in [*pins,'home-production-manifest.mjs','home-ground-expansion.mjs']:
            original=source/name if name in pins else ROOT/name
            shutil.copyfile(original,candidate/name)
        (candidate/'tests').mkdir()
        for path in tests:
            shutil.copyfile(path,candidate/'tests'/path.name)
        suites=[str(path.relative_to(ROOT)) for path in tests]
        log=subprocess.run(['node','--test','--test-reporter=tap',*suites],cwd=candidate,
                           text=True,capture_output=True)
        if log.returncode:
            raise RuntimeError(log.stdout+'\n'+log.stderr)
    rows=[r.split(' - ',1)[1] for r in log.stdout.splitlines() if r.startswith('ok ') and ' - ' in r]
    counts={r.split()[1]:int(r.split()[2]) for r in log.stdout.splitlines()
            if r.startswith(('# tests ','# pass ','# fail ','# skipped ','# cancelled '))}
    assert counts['pass']==counts['tests']==len(rows)==27
    assert counts['fail']==counts['skipped']==counts['cancelled']==0
    return {'candidateSourceSHA256':digests,'suites':suites,'counts':counts,'cases':rows}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('materialized',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    result=verify(args.materialized)
    args.out.write_text(json.dumps(result,indent=2)+'\n')
    print(result['counts'])
