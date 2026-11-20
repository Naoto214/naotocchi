"""Run the existing movement, conversation and real-save fixtures on the V6 model."""
from argparse import ArgumentParser
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import shutil
from subprocess import run
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SUITES = (
    'home-manual-dialogue', 'home-movement-bounds', 'home-movement-v2',
    'home-movement-v3', 'home-movement-v4', 'home-movement-v5-bounds',
    'home-movement-v5-ground', 'home-movement-v5-routing', 'home-production-save',
    'home-social-approach', 'home-terrain-conversation',
)

def verify(game):
    with TemporaryDirectory(prefix='home-drag-legacy-') as tmp:
        fixture = Path(tmp)
        run(['node', str(HERE.parent/'home-finish-v5/native-source.cjs'), '--write', tmp], check=True)
        for entry in game.iterdir():
            if not (fixture/entry.name).exists():
                (fixture/entry.name).symlink_to(entry.resolve(),target_is_directory=entry.is_dir())
        # These tests use the original native controller API, outside the owner iframe.
        # Exercise the real changed model and game script under their standard filenames.
        replaced = {'home-production-model.js':'home-production-model-drag-v6.js',
                    'script-v2.js':'script-v2-drag-v6.js'}
        hashes = {}
        for original, source in replaced.items():
            target = fixture/original
            target.unlink()
            data = (game/source).read_bytes()
            target.write_bytes(data)
            hashes[original] = sha256(data).hexdigest()
        (fixture/'tests').mkdir()
        for directory in ['helpers','fixtures']:
            shutil.copytree(ROOT/'tests'/directory, fixture/'tests'/directory)
        suites = [f'tests/{name}-test.cjs' for name in SUITES]
        for name in suites:
            shutil.copy2(ROOT/name,fixture/name)
        git_dir = run(['git','-C',str(ROOT),'rev-parse','--absolute-git-dir'],text=True,capture_output=True,check=True).stdout.strip()
        result = run(['node','--test','--test-reporter=tap',*suites],cwd=fixture,text=True,capture_output=True,
                     env={**os.environ,'GIT_DIR':git_dir})
        if result.returncode:
            raise RuntimeError(result.stdout+'\n'+result.stderr)
        counts = dict((k,int(v)) for k,v in re.findall(r'^# (tests|pass|fail|cancelled|skipped) (\d+)$',result.stdout,re.M))
        assert counts['pass']==counts['tests']==84 and counts['fail']==counts['skipped']==counts['cancelled']==0,counts
        return {'sourceHashes':hashes,'suites':suites,'counts':counts}

if __name__=='__main__':
    parser=ArgumentParser(description=__doc__)
    parser.add_argument('game',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    result=verify(args.game.resolve())
    args.out.write_text(json.dumps(result,indent=2)+'\n')
    print(result['counts'])
