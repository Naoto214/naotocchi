"""Compare V9 with the protected game and run the existing native regression suites."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE = '6b2e2a22ab3981ac748cc645f5f1f53ce91e4c64'

def load(script, directory='home-drag-v6'):
    filename = HERE.parent / directory / script
    spec = importlib.util.spec_from_file_location(filename.stem, filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

def verify_tree(head):
    reference = load('verify-source.py')
    before, after = reference.tree(BASE), reference.tree(head)
    assert all(after.get(k) == digest for k,digest in before.items())
    additions = [p.decode() for p in after.keys() - before.keys()]
    assert all(p.startswith('comparisons/home-mobility-v9/') or p in ('.github/workflows/home-mobility-v9-matrix.yml','.github/workflows/home-mobility-v9-performance.yml','.github/workflows/home-mobility-v9-fairness.yml') for p in additions), additions
    pins = {**reference.PINS, 575:'5db9835478eafe526271c6864e0c86ded6324172', 576:'e1f4a743684ce4ce8760a713d309483cedb9c50f',578:BASE}
    query = 'query {repository(owner:"Naoto214",name:"naotocchi"){'+ ' '.join(f'p{n}:pullRequest(number:{n}){{state headRefOid}}' for n in [561,*pins])+'}}'
    prs=json.loads(subprocess.check_output(['gh','api','graphql','-f','query='+query]))['data']['repository']
    assert prs['p561']['state']=='MERGED' and all(prs[f'p{n}']['headRefOid']==pin for n,pin in pins.items())
    return {'reference':BASE,'candidate':subprocess.check_output(['git','rev-parse',head],cwd=ROOT,text=True).strip(),
            'unchangedGitPaths':len(before),'addedGitPaths':len(additions),'protectedPRs':prs}

def legacy(game):
    scripts = {'home-production-model':'home-production-model-mobility-v9.js','script-v2':'script-v2-mobility-v7.js'}
    with TemporaryDirectory() as tmp:
        dest = Path(tmp)
        for item in game.iterdir():
            (dest/item.name).symlink_to(item.resolve(),target_is_directory=item.is_dir())
        for kind, name in scripts.items():
            original=dest/(kind+'-drag-v6.js')
            original.unlink()
            original.symlink_to((game/name).resolve())
        return load('verify-legacy.py').verify(dest)

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game',type=Path)
    parser.add_argument('--head',default='HEAD')
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    result=legacy(args.game) if args.game else verify_tree(args.head)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(result.get('counts') or result['unchangedGitPaths'])
